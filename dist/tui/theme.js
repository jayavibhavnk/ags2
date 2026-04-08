// Color palette for the TUI
export const theme = {
    // Brand
    accent: '#7C3AED', // violet
    muted: '#6B7280',
    dim: '#374151',
    // Role colors
    roles: {
        orchestrator: '#818CF8', // indigo
        architect: '#38BDF8', // sky
        coder: '#34D399', // emerald
        reviewer: '#FBBF24', // amber
        tester: '#C084FC', // purple
        debugger: '#F87171', // red
    },
    // Status colors
    status: {
        idle: '#6B7280', // gray
        thinking: '#818CF8', // indigo
        working: '#34D399', // green
        waiting: '#FBBF24', // amber
        reviewing: '#FBBF24', // amber
        done: '#10B981', // emerald
        failed: '#EF4444', // red
    },
    // Phase colors
    phases: {
        init: '#6B7280',
        architecting: '#38BDF8',
        coding: '#34D399',
        reviewing: '#FBBF24',
        testing: '#C084FC',
        debugging: '#F87171',
        done: '#10B981',
        failed: '#EF4444',
    },
    // Output line colors
    output: {
        text: '#E5E7EB',
        tool_use: '#818CF8',
        tool_result: '#6B7280',
        error: '#F87171',
        info: '#38BDF8',
    },
};
export const ROLE_LABELS = {
    orchestrator: 'Orchestrator',
    architect: 'Architect',
    coder: 'Coder',
    reviewer: 'Reviewer',
    tester: 'Tester',
    debugger: 'Debugger',
};
export const STATUS_ICONS = {
    idle: '○',
    thinking: '◌',
    working: '●',
    waiting: '◑',
    reviewing: '◑',
    done: '✓',
    failed: '✗',
};
export const PHASE_LABELS = {
    init: 'Initializing',
    architecting: 'Architecting',
    coding: 'Coding',
    reviewing: 'Reviewing',
    testing: 'Testing',
    debugging: 'Debugging',
    done: 'Done',
    failed: 'Failed',
};
export const OUTPUT_ICONS = {
    text: ' ',
    tool_use: '›',
    tool_result: '·',
    error: '✗',
    info: 'ℹ',
};
//# sourceMappingURL=theme.js.map