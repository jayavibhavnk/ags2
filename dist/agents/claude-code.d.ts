import { BaseAgent, type RunOptions, type RunResult } from './base.js';
export declare class ClaudeCodeAgent extends BaseAgent {
    readonly toolType = "claude-code";
    run(opts: RunOptions): Promise<RunResult>;
    private handleEvent;
    private summarizeTool;
}
//# sourceMappingURL=claude-code.d.ts.map