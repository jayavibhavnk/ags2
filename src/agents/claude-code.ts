import { execa } from 'execa';
import type { ClaudeStreamEvent, ClaudeStreamAssistant, ClaudeStreamResult } from '../types.js';
import { BaseAgent, type RunOptions, type RunResult } from './base.js';

// Allowed tools for Claude Code headless runs
const DEFAULT_ALLOWED_TOOLS = [
  'Read',
  'Write',
  'Edit',
  'MultiEdit',
  'Bash',
  'Glob',
  'Grep',
  'LS',
].join(',');

export class ClaudeCodeAgent extends BaseAgent {
  readonly toolType = 'claude-code';

  async run(opts: RunOptions): Promise<RunResult> {
    const {
      prompt,
      systemPrompt,
      cwd = process.cwd(),
      maxTurns = 40,
      allowedTools = DEFAULT_ALLOWED_TOOLS.split(','),
      onOutput,
    } = opts;

    const args: string[] = [
      '-p', prompt,
      '--output-format', 'stream-json',
      '--allowedTools', allowedTools.join(','),
      '--max-turns', String(maxTurns),
    ];

    if (systemPrompt) {
      args.push('--system-prompt', systemPrompt);
    }

    if (this.model) {
      args.push('--model', this.model);
    }

    let accumulatedOutput = '';
    let costUsd = 0;
    let success = false;
    let errorMsg: string | undefined;

    const emit = (line: Parameters<typeof this.makeLine>[0], type: Parameters<typeof this.makeLine>[1] = 'text', toolName?: string) => {
      const l = this.makeLine(line, type, toolName);
      this.emitOutput(l);
      onOutput?.(l);
    };

    try {
      const proc = execa('claude', args, {
        cwd,
        env: { ...process.env },
        stdin: 'ignore',
        stdout: 'pipe',
        stderr: 'pipe',
        reject: false,
        buffer: false,
      });

      let lineBuffer = '';

      proc.stdout?.on('data', (chunk: Buffer) => {
        lineBuffer += chunk.toString();
        const lines = lineBuffer.split('\n');
        lineBuffer = lines.pop() ?? '';

        for (const raw of lines) {
          const trimmed = raw.trim();
          if (!trimmed) continue;

          let event: ClaudeStreamEvent;
          try {
            event = JSON.parse(trimmed) as ClaudeStreamEvent;
          } catch {
            // Non-JSON output — show as plain text
            emit(trimmed, 'text');
            accumulatedOutput += trimmed + '\n';
            continue;
          }

          this.handleEvent(event, emit, (text) => {
            accumulatedOutput += text + '\n';
          });

          if (event.type === 'result') {
            const r = event as ClaudeStreamResult;
            if (r.subtype === 'success') {
              success = true;
              if (r.result) accumulatedOutput = r.result;
            } else {
              errorMsg = r.error ?? `Claude exited with subtype: ${r.subtype}`;
            }
            costUsd = r.cost_usd ?? 0;
          }
        }
      });

      proc.stderr?.on('data', (chunk: Buffer) => {
        const text = chunk.toString().trim();
        if (text) emit(text, 'error');
      });

      await proc;

      // Flush remaining buffer
      if (lineBuffer.trim()) {
        try {
          const event = JSON.parse(lineBuffer.trim()) as ClaudeStreamEvent;
          this.handleEvent(event, emit, (text) => {
            accumulatedOutput += text + '\n';
          });
          if (event.type === 'result') {
            const r = event as ClaudeStreamResult;
            success = r.subtype === 'success';
            if (r.result) accumulatedOutput = r.result;
            costUsd = r.cost_usd ?? 0;
          }
        } catch {
          /* ignore */
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      emit(`Error running Claude Code: ${msg}`, 'error');
      return { success: false, output: '', costUsd: 0, error: msg };
    }

    return {
      success,
      output: accumulatedOutput.trim(),
      costUsd,
      error: errorMsg,
    };
  }

  private handleEvent(
    event: ClaudeStreamEvent,
    emit: (content: string, type?: 'text' | 'tool_use' | 'tool_result' | 'error' | 'info', toolName?: string) => void,
    onText: (text: string) => void
  ): void {
    if (event.type === 'assistant') {
      const msg = event as ClaudeStreamAssistant;
      for (const block of msg.message.content) {
        if (block.type === 'text' && block.text.trim()) {
          emit(block.text.trim(), 'text');
          onText(block.text.trim());
        } else if (block.type === 'tool_use') {
          const summary = this.summarizeTool(block.name, block.input);
          emit(summary, 'tool_use', block.name);
        }
      }
    } else if (event.type === 'tool_result') {
      const ev = event as { type: string; content?: Array<{ type: string; text?: string }> };
      const content = ev.content?.[0];
      if (content?.type === 'text' && content.text) {
        const preview = content.text.slice(0, 120).replace(/\n/g, ' ');
        emit(preview, 'tool_result');
      }
    } else if (event.type === 'system') {
      const ev = event as { type: string; subtype?: string; model?: string };
      if (ev.subtype === 'init') {
        emit(`Model: ${ev.model ?? 'claude'}`, 'info');
      }
    }
  }

  private summarizeTool(name: string, input: Record<string, unknown>): string {
    switch (name) {
      case 'Read':
        return `Read ${input['file_path'] ?? input['path'] ?? '?'}`;
      case 'Write':
        return `Write ${input['file_path'] ?? input['path'] ?? '?'}`;
      case 'Edit':
      case 'MultiEdit':
        return `Edit ${input['file_path'] ?? input['path'] ?? '?'}`;
      case 'Bash':
        return `$ ${String(input['command'] ?? '').slice(0, 80)}`;
      case 'Glob':
        return `Glob ${input['pattern'] ?? '**'}`;
      case 'Grep':
        return `Grep "${input['pattern'] ?? ''}" in ${input['path'] ?? '.'}`;
      case 'LS':
        return `ls ${input['path'] ?? '.'}`;
      default:
        return `${name}(${JSON.stringify(input).slice(0, 60)})`;
    }
  }
}
