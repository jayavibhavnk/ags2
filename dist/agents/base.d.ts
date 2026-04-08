import { EventEmitter } from 'events';
import type { AgentOutputLine } from '../types.js';
export interface RunOptions {
    prompt: string;
    systemPrompt?: string;
    cwd?: string;
    maxTurns?: number;
    allowedTools?: string[];
    onOutput?: (line: AgentOutputLine) => void;
}
export interface RunResult {
    success: boolean;
    output: string;
    costUsd: number;
    error?: string;
}
export declare abstract class BaseAgent extends EventEmitter {
    readonly id: string;
    readonly model: string;
    abstract readonly toolType: string;
    constructor(id: string, model: string);
    abstract run(opts: RunOptions): Promise<RunResult>;
    protected emitOutput(line: AgentOutputLine): void;
    protected makeLine(content: string, type?: AgentOutputLine['type'], toolName?: string): AgentOutputLine;
}
//# sourceMappingURL=base.d.ts.map