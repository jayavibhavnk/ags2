import { jsxs as _jsxs, jsx as _jsx, Fragment as _Fragment } from "react/jsx-runtime";
import { Box, Text } from 'ink';
import { theme, ROLE_LABELS, OUTPUT_ICONS } from '../theme.js';
function OutputLine({ line }) {
    const color = theme.output[line.type] ?? theme.output.text;
    const icon = OUTPUT_ICONS[line.type] ?? ' ';
    return (_jsxs(Box, { children: [_jsxs(Text, { color: theme.dim, children: [icon, " "] }), line.type === 'tool_use' && line.toolName && (_jsxs(Text, { color: theme.roles.architect, children: ["[", line.toolName, "] "] })), _jsx(Text, { color: color, wrap: "truncate", children: line.content })] }));
}
function EmptyState() {
    return (_jsxs(Box, { flexDirection: "column", alignItems: "center", justifyContent: "center", flexGrow: 1, children: [_jsx(Text, { color: theme.dim, children: "No agent selected" }), _jsx(Text, { color: theme.dim, dimColor: true, children: "Press a number key to focus an agent" })] }));
}
export function OutputPanel({ agent, maxLines = 30 }) {
    if (!agent) {
        return (_jsxs(Box, { flexDirection: "column", borderStyle: "single", borderColor: theme.dim, flexGrow: 1, children: [_jsx(Box, { paddingX: 1, children: _jsx(Text, { bold: true, color: theme.muted, children: "OUTPUT" }) }), _jsx(EmptyState, {})] }));
    }
    const roleColor = theme.roles[agent.role] ?? theme.muted;
    const lines = agent.output.slice(-maxLines);
    return (_jsxs(Box, { flexDirection: "column", borderStyle: "single", borderColor: roleColor, flexGrow: 1, children: [_jsxs(Box, { paddingX: 1, gap: 1, children: [_jsx(Text, { bold: true, color: roleColor, children: ROLE_LABELS[agent.role] ?? agent.role }), _jsx(Text, { color: theme.dim, children: "\u00B7" }), _jsx(Text, { color: theme.dim, children: agent.tool }), agent.model && agent.model.trim() && (_jsxs(_Fragment, { children: [_jsx(Text, { color: theme.dim, children: "\u00B7" }), _jsx(Text, { color: theme.dim, children: agent.model })] })), agent.cost != null && agent.cost > 0 && (_jsxs(_Fragment, { children: [_jsx(Text, { color: theme.dim, children: "\u00B7" }), _jsxs(Text, { color: theme.muted, children: ["$", agent.cost.toFixed(4)] })] }))] }), _jsx(Box, { flexDirection: "column", paddingX: 1, flexGrow: 1, children: lines.length === 0 ? (_jsx(Text, { color: theme.dim, dimColor: true, children: "Waiting for output\u2026" })) : (lines.map((line, i) => _jsx(OutputLine, { line: line }, i))) })] }));
}
//# sourceMappingURL=OutputPanel.js.map