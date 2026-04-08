import { execa } from 'execa';
import { BaseAgent } from './base.js';
export class OpenCodeAgent extends BaseAgent {
    toolType = 'opencode';
    async run(opts) {
        const { prompt, cwd = process.cwd(), onOutput, } = opts;
        const emit = (content, type = 'text') => {
            const line = this.makeLine(content, type);
            this.emitOutput(line);
            onOutput?.(line);
        };
        let accumulatedOutput = '';
        try {
            const proc = execa('opencode', ['run', prompt], {
                cwd,
                env: { ...process.env },
                stdin: 'ignore',
                stdout: 'pipe',
                stderr: 'pipe',
                reject: false,
                buffer: false,
            });
            proc.stdout?.on('data', (chunk) => {
                const text = chunk.toString();
                accumulatedOutput += text;
                const lines = text.split('\n').filter((l) => l.trim());
                for (const line of lines) {
                    emit(line, 'text');
                }
            });
            proc.stderr?.on('data', (chunk) => {
                const text = chunk.toString().trim();
                if (text)
                    emit(text, 'error');
            });
            const result = await proc;
            return {
                success: result.exitCode === 0,
                output: accumulatedOutput.trim(),
                costUsd: 0,
                error: result.exitCode !== 0 ? `OpenCode exited with code ${result.exitCode}` : undefined,
            };
        }
        catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            emit(`Error running OpenCode: ${msg}`, 'error');
            return { success: false, output: '', costUsd: 0, error: msg };
        }
    }
}
//# sourceMappingURL=opencode.js.map