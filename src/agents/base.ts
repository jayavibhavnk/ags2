import { EventEmitter } from 'events';
import type { AgentOutputLine, SwarmEvent } from '../types.js';

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

export abstract class BaseAgent extends EventEmitter {
  abstract readonly toolType: string;

  constructor(
    public readonly id: string,
    public readonly model: string,
  ) {
    super();
  }

  abstract run(opts: RunOptions): Promise<RunResult>;

  protected emitOutput(line: AgentOutputLine): void {
    this.emit('output', line);
  }

  protected makeLine(
    content: string,
    type: AgentOutputLine['type'] = 'text',
    toolName?: string
  ): AgentOutputLine {
    return { timestamp: Date.now(), type, content, toolName };
  }
}
