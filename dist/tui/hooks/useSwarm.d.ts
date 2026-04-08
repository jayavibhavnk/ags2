import type { SwarmState, AgentInstance } from '../../types.js';
import type { Swarm } from '../../core/orchestrator.js';
export interface SwarmHookState {
    state: SwarmState;
    agents: AgentInstance[];
    focusedAgentId: string | null;
    focusedAgent: AgentInstance | null;
    isRunning: boolean;
    done: boolean;
    summary: string | null;
}
export declare function useSwarm(swarm: Swarm): {
    state: SwarmState;
    agents: AgentInstance[];
    focusedId: string | null;
    focusedAgent: AgentInstance | null;
    isRunning: boolean;
    done: boolean;
    summary: string | null;
    focusAgent: (id: string) => void;
    focusByIndex: (index: number) => void;
};
//# sourceMappingURL=useSwarm.d.ts.map