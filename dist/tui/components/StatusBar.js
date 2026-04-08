import { jsxs as _jsxs, jsx as _jsx } from "react/jsx-runtime";
import { Box, Text } from 'ink';
import { theme } from '../theme.js';
export function StatusBar({ state, focusedAgent }) {
    const agentCount = Object.keys(state.agents).length;
    const activeCount = Object.values(state.agents).filter((a) => a.status === 'working' || a.status === 'thinking').length;
    const doneCount = Object.values(state.agents).filter((a) => a.status === 'done').length;
    return (_jsxs(Box, { paddingX: 1, justifyContent: "space-between", borderStyle: "single", borderColor: theme.dim, children: [_jsxs(Box, { gap: 2, children: [_jsxs(Text, { color: theme.dim, children: [_jsxs(Text, { color: theme.muted, children: ["[1-", agentCount, "]"] }), " focus agent"] }), _jsxs(Text, { color: theme.dim, children: [_jsx(Text, { color: theme.muted, children: "[q]" }), " quit"] }), _jsxs(Text, { color: theme.dim, children: [_jsx(Text, { color: theme.muted, children: "[a]" }), " abort"] })] }), _jsxs(Box, { gap: 2, children: [_jsxs(Text, { color: theme.muted, children: [_jsx(Text, { color: theme.status.working, children: activeCount }), " active"] }), _jsxs(Text, { color: theme.muted, children: [_jsx(Text, { color: theme.status.done, children: doneCount }), "/", agentCount, " done"] }), state.revisionLoops > 0 && (_jsxs(Text, { color: theme.status.reviewing, children: ["rev #", state.revisionLoops] }))] })] }));
}
//# sourceMappingURL=StatusBar.js.map