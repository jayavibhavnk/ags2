import { jsxs as _jsxs, jsx as _jsx } from "react/jsx-runtime";
import { Box, Text } from 'ink';
import Spinner from 'ink-spinner';
import { theme, ROLE_LABELS, STATUS_ICONS } from '../theme.js';
function instanceSuffix(id) {
    const n = id.match(/-(\d+)$/)?.[1];
    return n && parseInt(n, 10) > 1 ? ` #${n}` : '';
}
function AgentRow({ agent, isFocused, index, }) {
    const roleColor = theme.roles[agent.role] ?? theme.muted;
    const statusColor = theme.status[agent.status] ?? theme.muted;
    const isActive = agent.status === 'working' || agent.status === 'thinking';
    const label = (ROLE_LABELS[agent.role] ?? agent.role) + instanceSuffix(agent.id);
    return (_jsxs(Box, { flexDirection: "column", paddingX: 1, children: [_jsxs(Box, { gap: 1, children: [_jsxs(Text, { color: theme.dim, children: ["[", index, "]"] }), isActive ? (_jsx(Text, { color: statusColor, children: _jsx(Spinner, { type: "dots" }) })) : (_jsx(Text, { color: statusColor, children: STATUS_ICONS[agent.status] ?? '○' })), _jsx(Text, { color: isFocused ? 'white' : roleColor, bold: isFocused, children: label }), _jsx(Text, { color: theme.dim, children: agent.tool })] }), isFocused && agent.currentTask && (_jsx(Box, { paddingLeft: 6, children: _jsx(Text, { color: theme.muted, dimColor: true, wrap: "truncate", children: agent.currentTask.slice(0, 50) }) }))] }));
}
export function AgentList({ agents, focusedId }) {
    return (_jsxs(Box, { flexDirection: "column", borderStyle: "single", borderColor: theme.dim, children: [_jsx(Box, { paddingX: 1, children: _jsx(Text, { bold: true, color: theme.muted, children: "AGENTS" }) }), _jsx(Box, { flexDirection: "column", paddingY: 0, children: agents.map((agent, i) => (_jsx(AgentRow, { agent: agent, isFocused: agent.id === focusedId, index: i + 1 }, agent.id))) })] }));
}
//# sourceMappingURL=AgentList.js.map