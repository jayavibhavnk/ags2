import type { SwarmState, AgentInstance, Task } from '../types.js';
export declare function agsDir(cwd: string): string;
export declare function statePath(cwd: string): string;
export declare function loadState(cwd: string): SwarmState | null;
export declare function saveState(state: SwarmState, cwd: string): void;
export declare function ensureAgsDir(cwd: string): void;
export declare function createState(userTask: string, projectRoot: string, agents: AgentInstance[]): SwarmState;
export declare function updateAgent(state: SwarmState, agentId: string, patch: Partial<AgentInstance>): SwarmState;
export declare function addAgentOutput(state: SwarmState, agentId: string, line: AgentInstance['output'][0]): SwarmState;
export declare function updateTask(state: SwarmState, task: Task): SwarmState;
export declare function setPhase(state: SwarmState, phase: SwarmState['phase']): SwarmState;
export declare function addCost(state: SwarmState, delta: number): SwarmState;
//# sourceMappingURL=state.d.ts.map