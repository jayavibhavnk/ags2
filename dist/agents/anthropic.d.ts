/**
 * Anthropic SDK-based agent.
 *
 * Uses @anthropic-ai/sdk directly with streaming + built-in file/shell tools.
 * This is more reliable than spawning `claude` headlessly because it:
 *  - doesn't depend on a specific Claude Code CLI version
 *  - gives us real token streaming
 *  - works on any Node.js ≥18
 */
import { BaseAgent, type RunOptions, type RunResult } from './base.js';
export declare class AnthropicAgent extends BaseAgent {
    readonly toolType = "claude-code";
    run(opts: RunOptions): Promise<RunResult>;
}
//# sourceMappingURL=anthropic.d.ts.map