import { useState, useEffect, useCallback, useRef } from 'react';
import type { SwarmState, SwarmEvent, AgentInstance } from '../../types.js';
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

export function useSwarm(swarm: Swarm) {
  const [swarmState, setSwarmState] = useState<SwarmState>(swarm.getState());
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Re-render every second so the timer updates
  useEffect(() => {
    tickRef.current = setInterval(() => {
      setSwarmState((prev) => ({ ...prev }));
    }, 1000);
    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, []);

  // Subscribe to swarm events
  useEffect(() => {
    const handler = (event: SwarmEvent) => {
      setSwarmState(swarm.getState());

      if (event.type === 'swarm_done') {
        setDone(true);
        setSummary(event.summary ?? null);
        if (tickRef.current) clearInterval(tickRef.current);
      }
    };

    swarm.on('event', handler);
    return () => {
      swarm.off('event', handler);
    };
  }, [swarm]);

  const agents = Object.values(swarmState.agents);

  // Auto-focus the first active agent
  useEffect(() => {
    if (!focusedId || !swarmState.agents[focusedId]) {
      const active = agents.find(
        (a) => a.status === 'working' || a.status === 'thinking'
      );
      if (active) setFocusedId(active.id);
      else if (agents.length > 0) setFocusedId(agents[0].id);
    }
  }, [agents, focusedId, swarmState.agents]);

  const focusAgent = useCallback((id: string) => {
    setFocusedId(id);
  }, []);

  const focusByIndex = useCallback(
    (index: number) => {
      const agent = agents[index - 1];
      if (agent) setFocusedId(agent.id);
    },
    [agents]
  );

  return {
    state: swarmState,
    agents,
    focusedId,
    focusedAgent: focusedId ? (swarmState.agents[focusedId] ?? null) : null,
    isRunning: !done,
    done,
    summary,
    focusAgent,
    focusByIndex,
  };
}
