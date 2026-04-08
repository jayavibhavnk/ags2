export type ToolType = 'claude-code' | 'codex' | 'opencode' | 'gemini';
export type RoleId = 'orchestrator' | 'architect' | 'coder' | 'reviewer' | 'tester' | 'debugger';
export type AgentStatus = 'idle' | 'thinking' | 'working' | 'waiting' | 'done' | 'failed' | 'reviewing';
export type TaskStatus = 'pending' | 'in_progress' | 'done' | 'failed' | 'needs_revision';
export interface RoleConfig {
    tool: ToolType;
    model?: string;
    instances?: number;
    worktrees?: boolean;
    systemPrompt?: string;
}
export interface WorkflowConfig {
    autoReview?: boolean;
    autoTest?: boolean;
    maxRevisionLoops?: number;
}
export interface ProjectConfig {
    name: string;
    description?: string;
    root?: string;
}
export interface AgsConfig {
    version: number;
    project: ProjectConfig;
    orchestrator: RoleConfig;
    roles: Partial<Record<RoleId, RoleConfig>>;
    workflow: WorkflowConfig;
}
export interface AgentInstance {
    id: string;
    role: RoleId;
    tool: ToolType;
    model?: string;
    status: AgentStatus;
    currentTask?: string;
    worktree?: string;
    pid?: number;
    cost?: number;
    startedAt?: number;
    finishedAt?: number;
    output: AgentOutputLine[];
}
export interface AgentOutputLine {
    timestamp: number;
    type: 'text' | 'tool_use' | 'tool_result' | 'error' | 'info';
    content: string;
    toolName?: string;
}
export interface Task {
    id: string;
    title: string;
    description: string;
    status: TaskStatus;
    assignedTo?: string;
    dependsOn?: string[];
    result?: string;
    revisions?: number;
}
export interface SwarmState {
    sessionId: string;
    projectRoot: string;
    userTask: string;
    phase: 'init' | 'architecting' | 'coding' | 'reviewing' | 'testing' | 'debugging' | 'done' | 'failed';
    agents: Record<string, AgentInstance>;
    tasks: Task[];
    spec?: string;
    totalCost: number;
    startedAt: number;
    finishedAt?: number;
    revisionLoops: number;
    lastError?: string;
}
export type MessageType = 'task_assigned' | 'task_complete' | 'task_failed' | 'review_request' | 'review_result' | 'test_request' | 'test_result' | 'debug_request' | 'debug_result';
export interface AgentMessage {
    id: string;
    from: string;
    to: string;
    type: MessageType;
    payload: Record<string, unknown>;
    timestamp: number;
}
export type SwarmEvent = {
    type: 'agent_status';
    agentId: string;
    status: AgentStatus;
    task?: string;
} | {
    type: 'agent_output';
    agentId: string;
    line: AgentOutputLine;
} | {
    type: 'task_update';
    task: Task;
} | {
    type: 'phase_change';
    phase: SwarmState['phase'];
} | {
    type: 'cost_update';
    agentId: string;
    delta: number;
} | {
    type: 'swarm_done';
    success: boolean;
    summary?: string;
} | {
    type: 'error';
    message: string;
};
export interface ClaudeStreamInit {
    type: 'system';
    subtype: 'init';
    session_id: string;
    tools: string[];
    model: string;
}
export interface ClaudeStreamAssistant {
    type: 'assistant';
    message: {
        content: Array<{
            type: 'text';
            text: string;
        } | {
            type: 'tool_use';
            name: string;
            input: Record<string, unknown>;
        }>;
    };
}
export interface ClaudeStreamResult {
    type: 'result';
    subtype: 'success' | 'error' | 'error_max_turns' | 'error_during_execution';
    result?: string;
    cost_usd?: number;
    session_id?: string;
    error?: string;
}
export type ClaudeStreamEvent = ClaudeStreamInit | ClaudeStreamAssistant | ClaudeStreamResult | {
    type: string;
    [key: string]: unknown;
};
//# sourceMappingURL=types.d.ts.map