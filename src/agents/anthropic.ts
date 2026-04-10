/**
 * Anthropic SDK-based agent.
 *
 * Uses @anthropic-ai/sdk directly with streaming + built-in file/shell tools.
 * This is more reliable than spawning `claude` headlessly because it:
 *  - doesn't depend on a specific Claude Code CLI version
 *  - gives us real token streaming
 *  - works on any Node.js ≥18
 */

import Anthropic from '@anthropic-ai/sdk';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname, resolve } from 'path';
import { execFileSync } from 'child_process';
import { glob } from 'fs/promises';
import { BaseAgent, type RunOptions, type RunResult } from './base.js';

const client = new Anthropic();

// ─── Tool definitions ─────────────────────────────────────────────────────────

const FILE_TOOLS: Anthropic.Tool[] = [
  {
    name: 'read_file',
    description: 'Read the contents of a file',
    input_schema: {
      type: 'object' as const,
      properties: {
        path: { type: 'string', description: 'File path relative to project root' },
      },
      required: ['path'],
    },
  },
  {
    name: 'write_file',
    description: 'Write content to a file (creates directories as needed)',
    input_schema: {
      type: 'object' as const,
      properties: {
        path:    { type: 'string', description: 'File path relative to project root' },
        content: { type: 'string', description: 'Full content to write' },
      },
      required: ['path', 'content'],
    },
  },
  {
    name: 'edit_file',
    description: 'Replace a specific string in a file',
    input_schema: {
      type: 'object' as const,
      properties: {
        path:       { type: 'string', description: 'File path' },
        old_string: { type: 'string', description: 'Exact text to replace' },
        new_string: { type: 'string', description: 'Replacement text' },
      },
      required: ['path', 'old_string', 'new_string'],
    },
  },
  {
    name: 'bash',
    description: 'Run a shell command and return its output. Use for running tests, listing files, installing packages, etc.',
    input_schema: {
      type: 'object' as const,
      properties: {
        command: { type: 'string', description: 'Shell command to run' },
        timeout: { type: 'number', description: 'Timeout in ms (default 30000)' },
      },
      required: ['command'],
    },
  },
  {
    name: 'list_files',
    description: 'List files matching a glob pattern',
    input_schema: {
      type: 'object' as const,
      properties: {
        pattern: { type: 'string', description: 'Glob pattern, e.g. "src/**/*.ts"' },
      },
      required: ['pattern'],
    },
  },
  {
    name: 'search_files',
    description: 'Search for a pattern in files (like grep)',
    input_schema: {
      type: 'object' as const,
      properties: {
        pattern: { type: 'string', description: 'Text or regex to search for' },
        path:    { type: 'string', description: 'Directory to search in (default: ".")' },
      },
      required: ['pattern'],
    },
  },
];

// ─── Tool execution ───────────────────────────────────────────────────────────

function executeTool(
  name: string,
  input: Record<string, unknown>,
  cwd: string
): string {
  const abs = (p: string) => resolve(cwd, p as string);

  try {
    switch (name) {
      case 'read_file': {
        const p = abs(input['path'] as string);
        if (!existsSync(p)) return `Error: File not found: ${input['path']}`;
        return readFileSync(p, 'utf8');
      }

      case 'write_file': {
        const p = abs(input['path'] as string);
        mkdirSync(dirname(p), { recursive: true });
        writeFileSync(p, input['content'] as string, 'utf8');
        return `Written ${(input['content'] as string).split('\n').length} lines to ${input['path']}`;
      }

      case 'edit_file': {
        const p = abs(input['path'] as string);
        if (!existsSync(p)) return `Error: File not found: ${input['path']}`;
        const src = readFileSync(p, 'utf8');
        const old = input['old_string'] as string;
        if (!src.includes(old)) return `Error: old_string not found in ${input['path']}`;
        writeFileSync(p, src.replace(old, input['new_string'] as string), 'utf8');
        return `Edited ${input['path']}`;
      }

      case 'bash': {
        const timeout = (input['timeout'] as number | undefined) ?? 30000;
        const cmd = input['command'] as string;
        try {
          const out = execFileSync('/bin/sh', ['-c', cmd], {
            cwd,
            timeout,
            encoding: 'utf8',
            stdio: ['ignore', 'pipe', 'pipe'],
          });
          return (out as unknown as string).slice(0, 8000) || '(no output)';
        } catch (e: unknown) {
          const err = e as { stdout?: string; stderr?: string; message?: string };
          return `Exit non-zero:\n${err.stdout ?? ''}\n${err.stderr ?? err.message ?? ''}`.slice(0, 4000);
        }
      }

      case 'list_files': {
        const pattern = input['pattern'] as string;
        try {
          const out = execFileSync('/bin/sh', ['-c', `find . -path "./.ags" -prune -o -name "node_modules" -prune -o -path "${pattern.replace(/\*\*/g, '*')}" -print 2>/dev/null | head -100`], {
            cwd,
            encoding: 'utf8',
            timeout: 10000,
          });
          return (out as unknown as string) || 'No files matched';
        } catch {
          return 'No files matched';
        }
      }

      case 'search_files': {
        const pattern = input['pattern'] as string;
        const searchPath = (input['path'] as string | undefined) ?? '.';
        try {
          const out = execFileSync('/bin/sh', ['-c',
            `grep -r --include="*.ts" --include="*.js" --include="*.tsx" --include="*.jsx" --include="*.json" --include="*.md" -l "${pattern.replace(/"/g, '\\"')}" ${searchPath} 2>/dev/null | head -20`
          ], { cwd, encoding: 'utf8', timeout: 10000 });
          return (out as unknown as string) || 'No matches';
        } catch {
          return 'No matches';
        }
      }

      default:
        return `Unknown tool: ${name}`;
    }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return `Tool error: ${msg}`;
  }
}

// ─── Agent ────────────────────────────────────────────────────────────────────

export class AnthropicAgent extends BaseAgent {
  readonly toolType = 'claude-code';

  async run(opts: RunOptions): Promise<RunResult> {
    const {
      prompt,
      systemPrompt,
      cwd = process.cwd(),
      maxTurns = 40,
      onOutput,
    } = opts;

    const emit = (
      content: string,
      type: 'text' | 'tool_use' | 'tool_result' | 'error' | 'info' = 'text',
      toolName?: string
    ) => {
      const line = this.makeLine(content, type, toolName);
      this.emitOutput(line);
      onOutput?.(line);
    };

    const messages: Anthropic.MessageParam[] = [
      { role: 'user', content: prompt },
    ];

    let totalCost = 0;
    let turns = 0;
    let lastText = '';

    emit(`Model: ${this.model || 'claude-opus-4-5'}`, 'info');

    while (turns < maxTurns) {
      turns++;
      const assistantContent: Anthropic.ContentBlock[] = [];
      let currentText = '';

      try {
        // Stream the response
        const stream = client.messages.stream({
          model: this.model || 'claude-opus-4-5',
          max_tokens: 8096,
          system: systemPrompt,
          tools: FILE_TOOLS,
          messages,
        });

        for await (const event of stream) {
          if (event.type === 'content_block_start') {
            if (event.content_block.type === 'tool_use') {
              assistantContent.push({
                type: 'tool_use',
                id: event.content_block.id,
                name: event.content_block.name,
                input: {},
              } as Anthropic.ToolUseBlock);
            } else if (event.content_block.type === 'text') {
              assistantContent.push({ type: 'text', text: '', citations: [] } as Anthropic.TextBlock);
            }
          } else if (event.type === 'content_block_delta') {
            const last = assistantContent[assistantContent.length - 1];
            if (event.delta.type === 'text_delta' && last?.type === 'text') {
              (last as Anthropic.TextBlock).text += event.delta.text;
              currentText += event.delta.text;
              // Emit line-by-line
              const lines = currentText.split('\n');
              while (lines.length > 1) {
                const line = lines.shift()!;
                if (line.trim()) emit(line, 'text');
              }
              currentText = lines[0];
            } else if (event.delta.type === 'input_json_delta' && last?.type === 'tool_use') {
              // Accumulate tool input JSON — parsed at block_stop
            }
          } else if (event.type === 'content_block_stop') {
            const block = assistantContent[assistantContent.length - 1];
            if (block?.type === 'tool_use') {
              // Input is now complete — parse it from the raw stream
            }
          } else if (event.type === 'message_delta') {
            if (event.usage) {
              // Rough cost estimate (claude-opus-4-5: $15/$75 per 1M in/out)
              const inCost  = (event.usage as unknown as { input_tokens?: number }).input_tokens  ?? 0;
              const outCost = (event.usage as unknown as { output_tokens?: number }).output_tokens ?? 0;
              totalCost += (inCost * 15 + outCost * 75) / 1_000_000;
            }
          }
        }

        // Flush any remaining text
        if (currentText.trim()) emit(currentText.trim(), 'text');

        // Get the complete final message (tool inputs are fully parsed)
        const finalMessage = await stream.finalMessage();
        // Replace assistantContent with finalMessage.content which has parsed tool inputs
        assistantContent.length = 0;
        for (const block of finalMessage.content) {
          assistantContent.push(block);
        }

        // Add assistant turn to history
        messages.push({ role: 'assistant', content: assistantContent });

        // Collect last text output
        for (const block of assistantContent) {
          if (block.type === 'text') lastText = block.text;
        }

        // Check stop reason
        if (finalMessage.stop_reason === 'end_turn') {
          break;
        }

        if (finalMessage.stop_reason !== 'tool_use') {
          emit(`Stop reason: ${finalMessage.stop_reason}`, 'info');
          break;
        }

        // Execute all tool calls
        const toolResults: Anthropic.ToolResultBlockParam[] = [];
        for (const block of assistantContent) {
          if (block.type !== 'tool_use') continue;

          const summary = summarizeTool(block.name, block.input as Record<string, unknown>);
          emit(summary, 'tool_use', block.name);

          const result = executeTool(block.name, block.input as Record<string, unknown>, cwd);
          const preview = result.slice(0, 120).replace(/\n/g, ' ');
          emit(preview, 'tool_result');

          toolResults.push({
            type: 'tool_result',
            tool_use_id: block.id,
            content: result,
          });
        }

        messages.push({ role: 'user', content: toolResults });

      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        emit(`API error: ${msg}`, 'error');
        return { success: false, output: '', costUsd: totalCost, error: msg };
      }
    }

    return {
      success: true,
      output: lastText,
      costUsd: totalCost,
    };
  }
}

function summarizeTool(name: string, input: Record<string, unknown>): string {
  switch (name) {
    case 'read_file':    return `Read ${input['path']}`;
    case 'write_file':   return `Write ${input['path']}`;
    case 'edit_file':    return `Edit ${input['path']}`;
    case 'bash':         return `$ ${String(input['command']).slice(0, 80)}`;
    case 'list_files':   return `Glob ${input['pattern']}`;
    case 'search_files': return `Grep "${input['pattern']}" in ${input['path'] ?? '.'}`;
    default:             return `${name}(...)`;
  }
}
