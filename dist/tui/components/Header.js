import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Box, Text } from 'ink';
import { theme, PHASE_LABELS } from '../theme.js';
function formatElapsed(ms) {
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    const h = Math.floor(m / 60);
    if (h > 0)
        return `${h}h ${m % 60}m`;
    if (m > 0)
        return `${m}m ${s % 60}s`;
    return `${s}s`;
}
function formatCost(usd) {
    if (usd === 0)
        return '$0.00';
    if (usd < 0.01)
        return `$${usd.toFixed(4)}`;
    return `$${usd.toFixed(2)}`;
}
export function Header({ state, projectName }) {
    const elapsed = Date.now() - state.startedAt;
    const phase = state.phase;
    const phaseColor = theme.phases[phase] ?? theme.muted;
    const phaseLabel = PHASE_LABELS[phase] ?? phase;
    const taskPreview = state.userTask.length > 50
        ? state.userTask.slice(0, 47) + '...'
        : state.userTask;
    return (_jsx(Box, { flexDirection: "column", borderStyle: "single", borderColor: theme.accent, paddingX: 1, children: _jsxs(Box, { justifyContent: "space-between", children: [_jsxs(Box, { gap: 1, children: [_jsx(Text, { bold: true, color: theme.accent, children: "ags" }), _jsx(Text, { color: theme.dim, children: "\u25C6" }), _jsx(Text, { bold: true, color: "white", children: projectName }), _jsx(Text, { color: theme.dim, children: "\u25C6" }), _jsxs(Text, { color: "#9CA3AF", italic: true, children: ["\"", taskPreview, "\""] })] }), _jsxs(Box, { gap: 2, children: [_jsxs(Box, { gap: 1, children: [_jsx(Text, { color: phaseColor, bold: true, children: "\u25C8" }), _jsx(Text, { color: phaseColor, children: phaseLabel })] }), _jsx(Text, { color: theme.muted, children: formatCost(state.totalCost) }), _jsxs(Text, { color: theme.muted, children: ["\u23F1 ", formatElapsed(elapsed)] })] })] }) }));
}
//# sourceMappingURL=Header.js.map