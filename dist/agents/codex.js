import { spawn } from 'child_process';
import { BaseAgent } from './base.js';
export class CodexAgent extends BaseAgent {
    toolType = 'codex';
    async run(opts) {
        const { prompt, systemPrompt, cwd = process.cwd(), onOutput, } = opts;
        const args = ['--full-auto', '--quiet'];
        if (this.model)
            args.push('--model', this.model);
        args.push(prompt);
        const emit = (content, type = 'text') => {
            const line = this.makeLine(content, type);
            this.emitOutput(line);
            onOutput?.(line);
        };
        return new Promise((resolve) => {
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
            proc.stdout.on('data', (chunk) => {
                accumulatedOutput += chunk;
                const lines = chunk.split('\n').filter((l) => l.trim());
                for (const line of lines) {
                    emit(line, line.startsWith('$') ? 'tool_use' : 'text');
                }
            });
            proc.stderr.on('data', (chunk) => {
                const text = chunk.trim();
                if (text)
                    emit(text, 'error');
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
//# sourceMappingURL=codex.js.map