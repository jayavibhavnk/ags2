import { ClaudeCodeAgent } from './claude-code.js';
import { CodexAgent } from './codex.js';
import { OpenCodeAgent } from './opencode.js';
export function createAgent(id, tool, model) {
    switch (tool) {
        case 'claude-code':
            return new ClaudeCodeAgent(id, model);
        case 'codex':
            return new CodexAgent(id, model);
        case 'opencode':
            return new OpenCodeAgent(id, model);
        case 'gemini':
            // Fallback to claude-code until gemini adapter is built
            return new ClaudeCodeAgent(id, model);
        default:
            return new ClaudeCodeAgent(id, model);
    }
}
//# sourceMappingURL=factory.js.map