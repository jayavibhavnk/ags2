import { spawn } from 'child_process';
import { BaseAgent } from './base.js';
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
    toolType = 'claude-code';
    async run(opts) {
        const { prompt, systemPrompt, cwd = process.cwd(), maxTurns = 40, allowedTools = DEFAULT_ALLOWED_TOOLS.split(','), onOutput, } = opts;
        const args = [
            '-p', prompt,
            '--output-format', 'stream-json',
            '--verbose',
            '--allowedTools', allowedTools.join(','),
            '--max-turns', String(maxTurns),
        ];
        if (systemPrompt)
            args.push('--system-prompt', systemPrompt);
        // Do NOT pass --model — let claude use its own configured default
        const emit = (content, type = 'text', toolName) => {
            const line = this.makeLine(content, type, toolName);
            this.emitOutput(line);
            onOutput?.(line);
        };
        return new Promise((resolve) => {
            let accumulatedOutput = '';
            let costUsd = 0;
            let finalSuccess = false;
            let finalError;
            let lineBuffer = '';
            const proc = spawn('claude', args, {
                cwd,
                env: { ...process.env },
                stdio: ['ignore', 'pipe', 'pipe'],
            });
            proc.stdout.setEncoding('utf8');
            proc.stderr.setEncoding('utf8');
            proc.stdout.on('data', (chunk) => {
                lineBuffer += chunk;
                const lines = lineBuffer.split('\n');
                lineBuffer = lines.pop() ?? '';
                for (const raw of lines) {
                    const trimmed = raw.trim();
                    if (!trimmed)
                        continue;
                    let event;
                    try {
                        event = JSON.parse(trimmed);
                    }
                    catch {
                        emit(trimmed, 'text');
                        accumulatedOutput += trimmed + '\n';
                        continue;
                    }
                    this.handleEvent(event, emit, (text) => {
                        accumulatedOutput += text + '\n';
                    });
                    if (event.type === 'result') {
                        const r = event;
                        finalSuccess = r.subtype === 'success';
                        if (r.result)
                            accumulatedOutput = r.result;
                        costUsd = r.cost_usd ?? 0;
                        if (!finalSuccess) {
                            finalError = r.error ?? `Claude exited: ${r.subtype}`;
                            emit(finalError, 'error');
                        }
                    }
                }
            });
            proc.stderr.on('data', (chunk) => {
                const text = chunk.trim();
                if (text)
                    emit(text, 'error');
            });
            proc.on('error', (err) => {
                emit(`Failed to start claude: ${err.message}`, 'error');
                resolve({ success: false, output: '', costUsd: 0, error: err.message });
            });
            proc.on('close', (code) => {
                // Flush any remaining buffer
                if (lineBuffer.trim()) {
                    try {
                        const event = JSON.parse(lineBuffer.trim());
                        this.handleEvent(event, emit, (text) => { accumulatedOutput += text + '\n'; });
                        if (event.type === 'result') {
                            const r = event;
                            finalSuccess = r.subtype === 'success';
                            if (r.result)
                                accumulatedOutput = r.result;
                            costUsd = r.cost_usd ?? 0;
                        }
                    }
                    catch { /* ignore */ }
                }
                if (code !== 0 && !finalSuccess && !finalError) {
                    finalError = `claude exited with code ${code}`;
                }
                resolve({
                    success: finalSuccess,
                    output: accumulatedOutput.trim(),
                    costUsd,
                    error: finalError,
                });
            });
        });
    }
    handleEvent(event, emit, onText) {
        if (event.type === 'assistant') {
            const msg = event;
            for (const block of msg.message.content) {
                if (block.type === 'text' && block.text.trim()) {
                    emit(block.text.trim(), 'text');
                    onText(block.text.trim());
                }
                else if (block.type === 'tool_use') {
                    emit(this.summarizeTool(block.name, block.input), 'tool_use', block.name);
                }
            }
        }
        else if (event.type === 'tool_result') {
            const ev = event;
            const content = ev.content?.[0];
            if (content?.type === 'text' && content.text) {
                const preview = content.text.slice(0, 120).replace(/\n/g, ' ');
                emit(preview, 'tool_result');
            }
        }
        else if (event.type === 'system') {
            const ev = event;
            if (ev.subtype === 'init')
                emit(`Model: ${ev.model ?? 'claude'}`, 'info');
        }
    }
    summarizeTool(name, input) {
        switch (name) {
            case 'Read': return `Read ${input['file_path'] ?? input['path'] ?? '?'}`;
            case 'Write': return `Write ${input['file_path'] ?? input['path'] ?? '?'}`;
            case 'Edit':
            case 'MultiEdit': return `Edit ${input['file_path'] ?? input['path'] ?? '?'}`;
            case 'Bash': return `$ ${String(input['command'] ?? '').slice(0, 80)}`;
            case 'Glob': return `Glob ${input['pattern'] ?? '**'}`;
            case 'Grep': return `Grep "${input['pattern'] ?? ''}" in ${input['path'] ?? '.'}`;
            case 'LS': return `ls ${input['path'] ?? '.'}`;
            default: return `${name}(${JSON.stringify(input).slice(0, 60)})`;
        }
    }
}
//# sourceMappingURL=claude-code.js.map