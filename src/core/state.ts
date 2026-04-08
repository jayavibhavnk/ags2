import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { randomUUID } from 'crypto';
import type { SwarmState, AgentInstance, Task } from '../types.js';
import { AGS_DIR } from './config.js';

// ─── Paths ────────────────────────────────────────────────────────────────────

export function agsDir(cwd: string): string {
  return join(cwd, AGS_DIR);
}

export function statePath(cwd: string): string {
  return join(agsDir(cwd), 'state.json');
}

// ─── Load / save ──────────────────────────────────────────────────────────────

export function loadState(cwd: string): SwarmState | null {
  const path = statePath(cwd);
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, 'utf8')) as SwarmState;
  } catch {
    return null;
  }
}

export function saveState(state: SwarmState, cwd: string): void {
  ensureAgsDir(cwd);
  writeFileSync(statePath(cwd), JSON.stringify(state, null, 2), 'utf8');
}

export function ensureAgsDir(cwd: string): void {
  const dir = agsDir(cwd);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  const messagesDir = join(dir, 'messages');
  if (!existsSync(messagesDir)) mkdirSync(messagesDir, { recursive: true });
  const specsDir = join(dir, 'specs');
  if (!existsSync(specsDir)) mkdirSync(specsDir, { recursive: true });
}

// ─── Create fresh state ───────────────────────────────────────────────────────

export function createState(
  userTask: string,
  projectRoot: string,
  agents: AgentInstance[]
): SwarmState {
  const agentMap: Record<string, AgentInstance> = {};
  for (const a of agents) agentMap[a.id] = a;

  return {
    sessionId: randomUUID(),
    projectRoot,
    userTask,
    phase: 'init',
    agents: agentMap,
    tasks: [],
    totalCost: 0,
    startedAt: Date.now(),
    revisionLoops: 0,
  };
}

// ─── Mutators ─────────────────────────────────────────────────────────────────

export function updateAgent(
  state: SwarmState,
  agentId: string,
  patch: Partial<AgentInstance>
): SwarmState {
  return {
    ...state,
    agents: {
      ...state.agents,
      [agentId]: { ...state.agents[agentId], ...patch },
    },
  };
}

export function addAgentOutput(
  state: SwarmState,
  agentId: string,
  line: AgentInstance['output'][0]
): SwarmState {
  const agent = state.agents[agentId];
  if (!agent) return state;
  return updateAgent(state, agentId, {
    output: [...agent.output.slice(-200), line], // keep last 200 lines
  });
}

export function updateTask(state: SwarmState, task: Task): SwarmState {
  const existing = state.tasks.findIndex((t) => t.id === task.id);
  const tasks =
    existing >= 0
      ? state.tasks.map((t) => (t.id === task.id ? task : t))
      : [...state.tasks, task];
  return { ...state, tasks };
}

export function setPhase(
  state: SwarmState,
  phase: SwarmState['phase']
): SwarmState {
  return { ...state, phase };
}

export function addCost(state: SwarmState, delta: number): SwarmState {
  return { ...state, totalCost: state.totalCost + delta };
}
