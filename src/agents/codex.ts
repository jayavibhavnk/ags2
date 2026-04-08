import { execa } from 'execa';
import { BaseAgent, type RunOptions, type RunResult } from './base.js';

export class CodexAgent extends BaseAgent {
  readonly toolType = 'codex';

  async run(opts: RunOptions): Promise<RunResult> {
    const {
      prompt,
      systemPrompt,
      cwd = process.cwd(),
      onOutput,
    } = opts;

    const args: string[] = [
      '--full-auto',
      '--quiet',
    ];

    if (this.model) {
      args.push('--model', this.model);
    }

    // Codex takes the prompt as the last argument or via stdin
    args.push(prompt);

    const emit = (content: string, type: Parameters<typeof this.makeLine>[1] = 'text') => {
      const line = this.makeLine(content, type);
      this.emitOutput(line);
      onOutput?.(line);
    };

    let accumulatedOutput = '';

    try {
      const proc = execa('codex', args, {
        cwd,
        env: {
          ...process.env,
          // Pass system prompt as env if supported
          ...(systemPrompt ? { CODEX_SYSTEM_PROMPT: systemPrompt } : {}),
        },
        stdin: 'ignore',
        stdout: 'pipe',
        stderr: 'pipe',
        reject: false,
        buffer: false,
      });

      proc.stdout?.on('data', (chunk: Buffer) => {
        const text = chunk.toString();
        accumulatedOutput += text;
        const lines = text.split('\n').filter((l) => l.trim());
        for (const line of lines) {
          // Detect tool-like lines (e.g. "Writing file.ts...")
          if (line.startsWith('$') || line.startsWith('>')) {
            emit(line, 'tool_use');
          } else {
            emit(line, 'text');
          }
        }
      });

      proc.stderr?.on('data', (chunk: Buffer) => {
        const text = chunk.toString().trim();
        if (text) emit(text, 'error');
      });

      const result = await proc;

      return {
        success: result.exitCode === 0,
        output: accumulatedOutput.trim(),
        costUsd: 0, // Codex doesn't expose cost in CLI output
        error: result.exitCode !== 0 ? `Codex exited with code ${result.exitCode}` : undefined,
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      emit(`Error running Codex: ${msg}`, 'error');
      return { success: false, output: '', costUsd: 0, error: msg };
    }
  }
}
