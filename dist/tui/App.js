import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect } from 'react';
import { Box, Text, useApp, useInput } from 'ink';
import { useSwarm } from './hooks/useSwarm.js';
import { Header } from './components/Header.js';
import { AgentList } from './components/AgentList.js';
import { OutputPanel } from './components/OutputPanel.js';
import { StatusBar } from './components/StatusBar.js';
import { PhaseBar } from './components/PhaseBar.js';
import { theme } from './theme.js';
export function App({ swarm, projectName, onDone, onAbort }) {
    const { exit } = useApp();
    const { state, agents, focusedId, focusedAgent, done, summary, focusByIndex, } = useSwarm(swarm);
    // Keyboard handling
    useInput((input, key) => {
        // Number keys → focus agent
        const n = parseInt(input, 10);
        if (!isNaN(n) && n >= 1 && n <= agents.length) {
            focusByIndex(n);
            return;
        }
        if (input === 'q' || key.escape) {
            exit();
            onDone?.(state.phase === 'done');
            return;
        }
        if (input === 'a') {
            swarm.abort();
            onAbort?.();
            return;
        }
    });
    // Exit automatically when done
    useEffect(() => {
        if (done) {
            onDone?.(state.phase === 'done');
        }
    }, [done, state.phase, onDone]);
    return (_jsxs(Box, { flexDirection: "column", width: "100%", children: [_jsx(Header, { state: state, projectName: projectName }), _jsx(PhaseBar, { phase: state.phase }), _jsxs(Box, { flexDirection: "row", flexGrow: 1, children: [_jsx(Box, { width: 40, flexDirection: "column", children: _jsx(AgentList, { agents: agents, focusedId: focusedId }) }), _jsx(Box, { flexGrow: 1, flexDirection: "column", children: _jsx(OutputPanel, { agent: focusedAgent, maxLines: 35 }) })] }), _jsx(StatusBar, { state: state, focusedAgent: focusedId }), done && (_jsxs(Box, { paddingX: 2, paddingY: 0, borderStyle: "single", borderColor: state.phase === 'done' ? theme.status.done : theme.status.failed, children: [_jsx(Text, { bold: true, color: state.phase === 'done' ? theme.status.done : theme.status.failed, children: state.phase === 'done' ? '✓ Complete' : '✗ Failed' }), summary && (_jsxs(Text, { color: theme.muted, children: [" \u2014 ", summary] })), _jsx(Text, { color: theme.dim, children: "  Press q to exit." })] }))] }));
}
//# sourceMappingURL=App.js.map