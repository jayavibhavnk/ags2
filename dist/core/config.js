import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { parse, stringify } from 'yaml';
export const CONFIG_FILE = 'ags.yaml';
export const AGS_DIR = '.ags';
// ─── Default configs per role ─────────────────────────────────────────────────
const ROLE_DEFAULTS = {
    orchestrator: { tool: 'claude-code', model: 'claude-opus-4-5', instances: 1 },
    architect: { tool: 'claude-code', model: 'claude-opus-4-5', instances: 1 },
    coder: { tool: 'claude-code', model: 'claude-sonnet-4-5', instances: 1, worktrees: false },
    reviewer: { tool: 'codex', model: 'gpt-4.1', instances: 1 },
    tester: { tool: 'claude-code', model: 'claude-sonnet-4-5', instances: 1 },
    debugger: { tool: 'claude-code', model: 'claude-opus-4-5', instances: 1 },
};
// ─── Tool model presets ───────────────────────────────────────────────────────
export const TOOL_MODELS = {
    'claude-code': [
        'claude-opus-4-5',
        'claude-sonnet-4-5',
        'claude-haiku-4-5',
    ],
    'codex': [
        'gpt-4.1',
        'gpt-4o',
        'o3',
        'o4-mini',
    ],
    'opencode': [
        'claude-opus-4-5',
        'claude-sonnet-4-5',
        'gpt-4.1',
    ],
    'gemini': [
        'gemini-2.5-pro',
        'gemini-2.5-flash',
    ],
};
// ─── Load config ──────────────────────────────────────────────────────────────
export function loadConfig(cwd = process.cwd()) {
    const configPath = join(cwd, CONFIG_FILE);
    if (!existsSync(configPath)) {
        throw new Error(`No ags.yaml found in ${cwd}. Run "ags init" to set up this project.`);
    }
    const raw = readFileSync(configPath, 'utf8');
    const parsed = parse(raw);
    return applyDefaults(parsed);
}
export function saveConfig(config, cwd = process.cwd()) {
    const configPath = join(cwd, CONFIG_FILE);
    writeFileSync(configPath, stringify(config, { lineWidth: 80 }), 'utf8');
}
export function configExists(cwd = process.cwd()) {
    return existsSync(join(cwd, CONFIG_FILE));
}
// ─── Defaults ─────────────────────────────────────────────────────────────────
function applyDefaults(config) {
    return {
        version: config.version ?? 1,
        project: {
            name: config.project?.name ?? 'my-project',
            description: config.project?.description,
            root: config.project?.root ?? '.',
        },
        orchestrator: mergeRoleConfig('orchestrator', config.orchestrator),
        roles: {
            architect: mergeRoleConfig('architect', config.roles?.architect),
            coder: mergeRoleConfig('coder', config.roles?.coder),
            reviewer: mergeRoleConfig('reviewer', config.roles?.reviewer),
            tester: mergeRoleConfig('tester', config.roles?.tester),
            debugger: mergeRoleConfig('debugger', config.roles?.debugger),
        },
        workflow: {
            autoReview: config.workflow?.autoReview ?? true,
            autoTest: config.workflow?.autoTest ?? true,
            maxRevisionLoops: config.workflow?.maxRevisionLoops ?? 3,
        },
    };
}
function mergeRoleConfig(role, override) {
    const defaults = ROLE_DEFAULTS[role] ?? { tool: 'claude-code' };
    return { ...defaults, ...override };
}
// ─── Create default config ────────────────────────────────────────────────────
export function createDefaultConfig(name, description, overrides) {
    return applyDefaults({
        version: 1,
        project: { name, description },
        orchestrator: ROLE_DEFAULTS.orchestrator,
        roles: {
            architect: ROLE_DEFAULTS.architect,
            coder: ROLE_DEFAULTS.coder,
            reviewer: ROLE_DEFAULTS.reviewer,
            tester: ROLE_DEFAULTS.tester,
            debugger: ROLE_DEFAULTS.debugger,
        },
        workflow: {},
        ...overrides,
    });
}
//# sourceMappingURL=config.js.map