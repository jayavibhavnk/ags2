import { spawn } from 'child_process';
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

    const args: string[] = ['--full-auto', '--quiet'];
    if (this.model) args.push('--model', this.model);
    args.push(prompt);

    const emit = (content: string, type: 'text' | 'tool_use' | 'tool_result' | 'error' | 'info' = 'text') => {
      const line = this.makeLine(content, type);
      this.emitOutput(line);
      onOutput?.(line);
    };

    return new Promise<RunResult>((resolve) => {
      let accumulatedOutput = '';

      const proc = spawn('codex', args, {
        cwd,
        env: {
          ...process.env,
          ...(systemPrompt ? { CODEX_SYSTEM_PROMPT: systemPrompt } : {}),
        },
        stdio: ['ignore', 'pipe', 'pipe'],
      });

      proc.stdout.setEncoding('utf8');
      proc.stderr.setEncoding('utf8');

      proc.stdout.on('data', (chunk: string) => {
        accumulatedOutput += chunk;
        const lines = chunk.split('\n').filter((l) => l.trim());
        for (const line of lines) {
          emit(line, line.startsWith('$') ? 'tool_use' : 'text');
        }
      });

      proc.stderr.on('data', (chunk: string) => {
        const text = chunk.trim();
        if (text) emit(text, 'error');
      });

      proc.on('error', (err) => {
        emit(`Failed to start codex: ${err.message}`, 'error');
        resolve({ success: false, output: '', costUsd: 0, error: err.message });
      });

      proc.on('close', (code) => {
        resolve({
          success: code === 0,
          output: accumulatedOutput.trim(),
          costUsd: 0,
          error: code !== 0 ? `codex exited with code ${code}` : undefined,
        });
      });
    });
  }
}
