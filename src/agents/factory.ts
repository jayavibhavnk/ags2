import type { ToolType } from '../types.js';
import { BaseAgent } from './base.js';
import { ClaudeCodeAgent } from './claude-code.js';
import { CodexAgent } from './codex.js';
import { OpenCodeAgent } from './opencode.js';

export function createAgent(
  id: string,
  tool: ToolType,
  model: string
): BaseAgent {
  switch (tool) {
    case 'claude-code':
      return new ClaudeCodeAgent(id, ''); // no model — use claude's own default
    case 'codex':
      return new CodexAgent(id, model || 'gpt-4.1');
    case 'opencode':
      return new OpenCodeAgent(id, model || 'claude-opus-4-5');
    case 'gemini':
      return new ClaudeCodeAgent(id, model || 'claude-opus-4-5');
    default:
      return new ClaudeCodeAgent(id, model || 'claude-opus-4-5');
  }
}
