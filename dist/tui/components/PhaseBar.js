import { jsxs as _jsxs, jsx as _jsx } from "react/jsx-runtime";
import React from 'react';
import { Box, Text } from 'ink';
import { theme, PHASE_LABELS } from '../theme.js';
const PHASES = [
    'init',
    'architecting',
    'coding',
    'reviewing',
    'testing',
    'debugging',
    'done',
];
function phaseIndex(phase) {
    return PHASES.indexOf(phase);
}
export function PhaseBar({ phase }) {
    const currentIndex = phaseIndex(phase);
    return (_jsx(Box, { paddingX: 1, gap: 0, children: PHASES.filter((p) => p !== 'init' && p !== 'done').map((p, i) => {
            const idx = phaseIndex(p);
            const isCurrent = p === phase;
            const isPast = idx < currentIndex;
            const color = isCurrent
                ? theme.phases[p]
                : isPast
                    ? theme.status.done
                    : theme.dim;
            return (_jsxs(React.Fragment, { children: [_jsx(Box, { children: _jsxs(Text, { color: color, bold: isCurrent, children: [isPast ? '✓' : isCurrent ? '◈' : '○', " ", PHASE_LABELS[p] ?? p] }) }), i < 4 && (_jsx(Text, { color: theme.dim, children: " \u2192 " }))] }, p));
        }) }));
}
//# sourceMappingURL=PhaseBar.js.map