import { useState, useEffect, useCallback, useRef } from 'react';
export function useSwarm(swarm) {
    const [swarmState, setSwarmState] = useState(swarm.getState());
    const [focusedId, setFocusedId] = useState(null);
    const [done, setDone] = useState(false);
    const [summary, setSummary] = useState(null);
    const tickRef = useRef(null);
    // Re-render every second so the timer updates
    useEffect(() => {
        tickRef.current = setInterval(() => {
            setSwarmState((prev) => ({ ...prev }));
        }, 1000);
        return () => {
            if (tickRef.current)
                clearInterval(tickRef.current);
        };
    }, []);
    // Subscribe to swarm events
    useEffect(() => {
        const handler = (event) => {
            setSwarmState(swarm.getState());
            if (event.type === 'swarm_done') {
                setDone(true);
                setSummary(event.summary ?? null);
                if (tickRef.current)
                    clearInterval(tickRef.current);
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
            const active = agents.find((a) => a.status === 'working' || a.status === 'thinking');
            if (active)
                setFocusedId(active.id);
            else if (agents.length > 0)
                setFocusedId(agents[0].id);
        }
    }, [agents, focusedId, swarmState.agents]);
    const focusAgent = useCallback((id) => {
        setFocusedId(id);
    }, []);
    const focusByIndex = useCallback((index) => {
        const agent = agents[index - 1];
        if (agent)
            setFocusedId(agent.id);
    }, [agents]);
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
//# sourceMappingURL=useSwarm.js.map