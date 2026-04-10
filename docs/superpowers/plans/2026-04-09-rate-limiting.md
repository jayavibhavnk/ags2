# Rate Limiting Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add configurable per-role and global rate limiting to all AI API calls made by agent implementations, using a token-bucket algorithm to prevent provider quota exhaustion.

**Architecture:** A singleton `RateLimiter` class wraps a `Map` of per-key token buckets. Each agent role (and a global key) has its own bucket. Before making an LLM API call, the agent calls `acquire(roleKey)`, which either consumes a token immediately or sleeps until one is available. Configuration lives in `ags.yaml` under a new `rateLimits` section and is read by the orchestrator on startup, then passed to the rate limiter.

**Tech Stack:** Pure TypeScript, no new dependencies. Node.js built-in `setTimeout`/`Date.now()` for timing. Existing `zod` dependency in `package.json` can optionally validate the new config shape (using the existing `zod@^3.23.8`).

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `src/types.ts` | Modify | Add `RateLimitConfig`, `RateLimitRoleConfig` types |
| `src/core/config.ts` | Modify | Add `RateLimitConfig` defaults, parse in `applyDefaults()` |
| `ags.yaml` | Modify | Add `rateLimits:` section with sensible defaults |
| `src/core/rateLimiter.ts` | **Create** | Singleton `RateLimiter` class with token-bucket logic |
| `src/agents/anthropic.ts` | Modify | Call `rateLimiter.acquire()` before `client.messages.stream()` |
| `src/core/orchestrator.ts` | Modify | Import rateLimiter, pass config to `Swarm` constructor, initialise on startup |
| `package.json` | Modify | Add `vitest` test runner as dev dependency |
| `vitest.config.ts` | **Create** | Vitest configuration |
| `src/core/rateLimiter.test.ts` | **Create** | Unit tests for `RateLimiter` |
| `src/agents/anthropic.test.ts` | **Create** | Integration test for rate-limit behaviour in `AnthropicAgent` |

---

## Task 1: Add rate-limit types to `src/types.ts`

**Files:**
- Modify: `src/types.ts`

- [ ] **Step 1: Add rate-limit interface types**

In `src/types.ts`, add these new types after the existing `WorkflowConfig` block (around line 49):

```typescript
// ─── Rate limiting ────────────────────────────────────────────────────────────

export interface RateLimitRoleConfig {
  /**
   * Maximum number of LLM API calls in the window.
   * Defaults to 60.
   */
  maxCalls?: number;
  /**
   * Time window in milliseconds.
   * Defaults to 60_000 (1 minute).
   */
  windowMs?: number;
  /**
   * If true, skip rate limiting for this role (use with caution).
   * Defaults to false.
   */
  disabled?: boolean;
}

export interface RateLimitConfig {
  /**
   * Global rate limit applied to all roles combined.
   * Use this to cap total spend/API usage across the entire swarm.
   */
  global?: {
    maxCalls?: number;
    windowMs?: number;
  };
  /**
   * Per-role overrides. Any role not listed falls back to global or built-in defaults.
   */
  roles?: Partial<Record<RoleId, RateLimitRoleConfig>>;
}
```

In `AgsConfig` interface (around line 57), add the `rateLimits` field:

```typescript
export interface AgsConfig {
  version: number;
  project: ProjectConfig;
  orchestrator: RoleConfig;
  roles: Partial<Record<RoleId, RoleConfig>>;
  workflow: WorkflowConfig;
  rateLimits?: RateLimitConfig;   // <— add this field
}
```

- [ ] **Step 2: Commit**

```bash
git add src/types.ts
git commit -m "feat: add RateLimitConfig types to AgsConfig"
```

---

## Task 2: Add rate-limit config defaults in `src/core/config.ts`

**Files:**
- Modify: `src/core/config.ts`

- [ ] **Step 1: Add default rate-limit constants and merge helper**

At the top of `src/core/config.ts`, after the `TOOL_MODELS` export (around line 43), add:

```typescript
// ─── Rate-limit defaults ─────────────────────────────────────────────────────

const RATE_LIMIT_DEFAULTS = {
  maxCalls: 60,    // 60 calls per window
  windowMs: 60_000, // 1 minute
};

const GLOBAL_RATE_LIMIT_DEFAULTS = {
  maxCalls: 120,   // 120 calls per window combined across all roles
  windowMs: 60_000,
};

function mergeRateLimitConfig(override?: RateLimitRoleConfig) {
  return {
    maxCalls: override?.maxCalls ?? RATE_LIMIT_DEFAULTS.maxCalls,
    windowMs:  override?.windowMs  ?? RATE_LIMIT_DEFAULTS.windowMs,
    disabled:  override?.disabled  ?? false,
  };
}
```

- [ ] **Step 2: Update `applyDefaults()` to parse `rateLimits`**

In `applyDefaults()` (around line 70), add after the `workflow:` block:

```typescript
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
      coder:     mergeRoleConfig('coder',     config.roles?.coder),
      reviewer:  mergeRoleConfig('reviewer',  config.roles?.reviewer),
      tester:    mergeRoleConfig('tester',    config.roles?.tester),
      debugger:  mergeRoleConfig('debugger',  config.roles?.debugger),
    },
    workflow: {
      autoReview:         config.workflow?.autoReview         ?? true,
      autoTest:           config.workflow?.autoTest           ?? true,
      maxRevisionLoops:   config.workflow?.maxRevisionLoops   ?? 3,
    },
    rateLimits: config.rateLimits ?? {},  // <— add this
  };
```

- [ ] **Step 3: Export a helper to get effective limits for a role**

After the `createDefaultConfig` function (end of file), add:

```typescript
/**
 * Returns the effective rate-limit config for a given role.
 * Falls back to global, then to built-in RATE_LIMIT_DEFAULTS.
 */
export function getEffectiveRateLimit(
  roleId: string,
  rateLimits?: AgsConfig['rateLimits']
): { maxCalls: number; windowMs: number; disabled: boolean } {
  if (rateLimits?.roles?.[roleId]?.disabled) {
    return { maxCalls: Infinity, windowMs: 0, disabled: true };
  }

  const roleCfg   = rateLimits?.roles?.[roleId];
  const globalCfg = rateLimits?.global;

  // Global limits apply as a ceiling; role limits as a per-role cap.
  // If neither is set, use built-in defaults.
  const effectiveMaxCalls = roleCfg?.maxCalls
    ?? globalCfg?.maxCalls
    ?? RATE_LIMIT_DEFAULTS.maxCalls;
  const effectiveWindowMs = roleCfg?.windowMs
    ?? globalCfg?.windowMs
    ?? RATE_LIMIT_DEFAULTS.windowMs;

  return { maxCalls: effectiveMaxCalls, windowMs: effectiveWindowMs, disabled: false };
}
```

- [ ] **Step 4: Commit**

```bash
git add src/core/config.ts
git commit -m "feat: wire rateLimits defaults into config system"
```

---

## Task 3: Create the rate limiter utility `src/core/rateLimiter.ts`

**Files:**
- Create: `src/core/rateLimiter.ts`

- [ ] **Step 1: Write the RateLimiter class**

```typescript
import type { RoleId } from '../types.js';

// ─── Bucket entry ────────────────────────────────────────────────────────────

interface Bucket {
  tokens: number;
  lastRefill: number; // ms timestamp
}

/**
 * Token-bucket rate limiter.
 *
 * Each key (e.g. "global", "architect", "coder") has its own bucket.
 * `acquire(key)` consumes one token, waiting if the bucket is empty.
 * `restore(key, count)` puts tokens back (useful on error/retry).
 *
 * Thread-safety note: this class is designed for single-process use.
 * Concurrent calls to `acquire` on the same key resolve serially via the
 * wait queue stored on the bucket itself.
 */
export class RateLimiter {
  private buckets = new Map<string, Bucket>();
  private queues  = new Map<string, Array<() => void>>(); // wait resolvers per key

  /**
   * Acquire one token for `key`, blocking until one is available.
   * Returns the number of ms spent waiting (useful for diagnostics).
   */
  async acquire(key: string, opts: { maxCalls: number; windowMs: number }): Promise<number> {
    if (opts.maxCalls === Infinity) return 0; // disabled

    const waitStart = Date.now();
    await this.waitForToken(key, opts);
    return Date.now() - waitStart;
  }

  /**
   * Restore `count` tokens to a key's bucket (call on API error so the
   * failed call doesn't burn a token).
   */
  restore(key: string, count = 1): void {
    const bucket = this.buckets.get(key);
    if (bucket) bucket.tokens = Math.min(bucket.tokens + count, this.currentMax(key));
  }

  /** Returns current tokens remaining for a key (0 if never used). */
  tokens(key: string): number {
    return this.buckets.get(key)?.tokens ?? 0;
  }

  /** Reset all buckets and queues. */
  reset(): void {
    this.buckets.clear();
    this.queues.clear();
  }

  // ─── Private helpers ────────────────────────────────────────────────────────

  private currentMax(key: string): number {
    // We store maxCalls as metadata on the bucket itself for simplicity.
    return (this.buckets.get(key) as unknown as { maxCalls: number })?.maxCalls ?? 1;
  }

  private getOrCreateBucket(key: string, opts: { maxCalls: number; windowMs: number }): Bucket {
    let bucket = this.buckets.get(key);
    if (!bucket) {
      bucket = { tokens: opts.maxCalls, lastRefill: Date.now(), maxCalls: opts.maxCalls, windowMs: opts.windowMs } as unknown as Bucket;
      this.buckets.set(key, bucket);
    }
    return bucket;
  }

  private refill(bucket: Bucket, windowMs: number, maxCalls: number): void {
    const now = Date.now();
    const elapsed = now - bucket.lastRefill;
    if (elapsed >= windowMs) {
      bucket.tokens = maxCalls;
      bucket.lastRefill = now;
    }
  }

  private async waitForToken(
    key: string,
    opts: { maxCalls: number; windowMs: number }
  ): Promise<void> {
    const bucket = this.getOrCreateBucket(key, opts);
    // Attach metadata for currentMax()
    (bucket as unknown as Record<string, number>)['maxCalls'] = opts.maxCalls;
    (bucket as unknown as Record<string, number>)['windowMs'] = opts.windowMs;

    this.refill(bucket, opts.windowMs, opts.maxCalls);

    if (bucket.tokens > 0) {
      bucket.tokens--;
      return;
    }

    // Bucket empty — queue this caller
    return new Promise<void>((resolve) => {
      const queue = this.queues.get(key) ?? [];
      queue.push(resolve);
      this.queues.set(key, queue);

      // Schedule retry after window expiry
      const waitMs = opts.windowMs - (Date.now() - bucket.lastRefill);
      setTimeout(() => {
        this.refill(bucket, opts.windowMs, opts.maxCalls);
        bucket.tokens = Math.max(0, bucket.tokens - 1);
        const q = this.queues.get(key) ?? [];
        const next = q.shift();
        if (q.length === 0) this.queues.delete(key);
        next?.();
      }, Math.max(0, waitMs));
    });
  }
}

// ─── Singleton instance ───────────────────────────────────────────────────────

export const rateLimiter = new RateLimiter();
```

- [ ] **Step 2: Commit**

```bash
git add src/core/rateLimiter.ts
git commit -m "feat: add RateLimiter singleton with token-bucket algorithm"
```

---

## Task 4: Integrate rate limiter into `src/agents/anthropic.ts`

**Files:**
- Modify: `src/agents/anthropic.ts`

- [ ] **Step 1: Add import and per-role limit constants**

At the top of `src/agents/anthropic.ts`, add:

```typescript
import { rateLimiter } from '../core/rateLimiter.js';
```

Add near the top of the file (after imports, before `const client = ...`):

```typescript
// Default: 60 calls/minute per AnthropicAgent role — in practice each
// AnthropicAgent instance represents one role (architect, coder, etc.).
const DEFAULT_MAX_CALLS   = 60;
const DEFAULT_WINDOW_MS   = 60_000;
```

- [ ] **Step 2: Add configurable limits to `RunOptions`**

In `src/agents/base.ts` `RunOptions` interface (line 4), add:

```typescript
export interface RunOptions {
  prompt: string;
  systemPrompt?: string;
  cwd?: string;
  maxTurns?: number;
  allowedTools?: string[];
  onOutput?: (line: AgentOutputLine) => void;
  /** Agent role id used as the rate-limit key. Defaults to 'agent'. */
  rateLimitKey?: string;
  /** Maximum calls per window. Defaults to 60/min. Pass Infinity to disable. */
  rateLimitMaxCalls?: number;
  /** Window in ms. Defaults to 60_000. */
  rateLimitWindowMs?: number;
}
```

- [ ] **Step 3: Wrap the streaming call in `AnthropicAgent.run()`**

In `src/agents/anthropic.ts`, find the `while (turns < maxTurns)` loop (line 217). Before the `const stream = client.messages.stream(...)` call (line 224), add:

```typescript
    // Rate-limit: block until a token is available for this role
    const waitMs = await rateLimiter.acquire(
      opts.rateLimitKey ?? 'anthropic',
      {
        maxCalls: opts.rateLimitMaxCalls ?? DEFAULT_MAX_CALLS,
        windowMs: opts.rateLimitWindowMs ?? DEFAULT_WINDOW_MS,
      }
    );
    if (waitMs > 0) {
      emit(`[rate-limit] waited ${waitMs}ms for token`, 'info');
    }
```

- [ ] **Step 4: Restore token on API error**

In the `catch (err: unknown)` block inside the while loop (line 324), after `emit(`API error: ${msg}`, 'error')`, add:

```typescript
        // Restore the consumed token so the retry doesn't waste quota
        rateLimiter.restore(opts.rateLimitKey ?? 'anthropic');
```

- [ ] **Step 5: Commit**

```bash
git add src/agents/anthropic.ts src/agents/base.ts
git commit -m "feat: integrate RateLimiter into AnthropicAgent"
```

---

## Task 5: Wire rate limits through the orchestrator in `src/core/orchestrator.ts`

**Files:**
- Modify: `src/core/orchestrator.ts`
- Modify: `src/commands/run.ts`

- [ ] **Step 1: Pass rate-limit config from orchestrator to agent `run()` calls**

In `src/core/orchestrator.ts`, import the config helper and the rate limiter:

```typescript
import { getEffectiveRateLimit } from './config.js';
```

In the `Swarm` constructor, store the rate-limit config:

```typescript
  constructor(
    private readonly config: AgsConfig,
    private readonly cwd: string,
    userTask: string
  ) {
    super();
    // ... existing ensureAgsDir and buildAgentInstances ...
```

Add after the existing `this.state = createState(...)` block (after line 60):

```typescript
    // Extract rate-limit settings from config
    this.rateLimitConfig = config.rateLimits;
  }

  private rateLimitConfig?: AgsConfig['rateLimits'];
```

Now update the `runRole()` private method to pass rate-limit options to `agent.run()`. Find the call to `agent.run({...})` (line 266) and update it:

```typescript
    const agentId = opts.agentId; // add agentId param below
    const roleId  = this.state.agents[agentId]?.role ?? 'orchestrator';
    const rlCfg   = getEffectiveRateLimit(roleId, this.rateLimitConfig);

    const result = await agent.run({
      prompt: opts.prompt,
      systemPrompt: opts.systemPrompt,
      cwd: this.cwd,
      maxTurns: opts.maxTurns,
      rateLimitKey:      roleId,
      rateLimitMaxCalls: rlCfg.maxCalls,
      rateLimitWindowMs: rlCfg.windowMs,
    });
```

Update the `runRole()` signature to accept `agentId` as a named parameter (line 243):

```typescript
  private async runRole(
    agentId: string,
    opts: {
      systemPrompt: string;
      prompt: string;
      maxTurns?: number;
    }
  ): Promise<string | null> {
    const agent = this.agents.get(agentId);
    // ... rest unchanged until agent.run() call ...
```

- [ ] **Step 2: Commit**

```bash
git add src/core/orchestrator.ts
git commit -m "feat: pass per-role rate-limit config to agent run calls"
```

---

## Task 6: Add rate-limit config to `ags.yaml`

**Files:**
- Modify: `ags.yaml`

- [ ] **Step 1: Add `rateLimits:` section with sensible defaults**

After the `workflow:` block, add:

```yaml
rateLimits:
  # Global cap across all roles (calls per window)
  global:
    maxCalls: 120   # 120 calls/minute combined — covers Anthropic's 1000 req/min limit with headroom
    windowMs: 60000
  # Per-role overrides (omit to inherit global)
  roles:
    architect:
      maxCalls: 30
      windowMs: 60000
    coder:
      maxCalls: 60
      windowMs: 60000
    reviewer:
      maxCalls: 40
      windowMs: 60000
    tester:
      maxCalls: 30
      windowMs: 60000
    debugger:
      maxCalls: 20
      windowMs: 60000
```

- [ ] **Step 2: Commit**

```bash
git add ags.yaml
git commit -m "feat: add rateLimits section to ags.yaml with per-role defaults"
```

---

## Task 7: Set up Vitest test runner

**Files:**
- Modify: `package.json`
- Create: `vitest.config.ts`

- [ ] **Step 1: Add Vitest as dev dependency**

```bash
npm install --save-dev vitest @vitest/ui
```

- [ ] **Step 2: Add test scripts to `package.json`**

In the `scripts:` block, add:

```json
"test":       "vitest run",
"test:watch": "vitest",
"test:ui":    "vitest --ui"
```

- [ ] **Step 3: Create `vitest.config.ts`**

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: false,
    environment: 'node',
    include: ['src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
    },
  },
});
```

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json vitest.config.ts
git commit -m "test: add vitest test runner"
```

---

## Task 8: Write unit tests for `RateLimiter`

**Files:**
- Create: `src/core/rateLimiter.test.ts`

- [ ] **Step 1: Write tests for the happy path**

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { RateLimiter } from './rateLimiter.js';

describe('RateLimiter', () => {
  let limiter: RateLimiter;

  beforeEach(() => {
    limiter = new RateLimiter();
  });

  it('allows the first call immediately (tokens available)', async () => {
    const waitMs = await limiter.acquire('test', { maxCalls: 5, windowMs: 60_000 });
    expect(waitMs).toBe(0);
    expect(limiter.tokens('test')).toBe(4);
  });

  it('counts down tokens on each acquire', async () => {
    for (let i = 4; i >= 0; i--) {
      await limiter.acquire('test', { maxCalls: 5, windowMs: 60_000 });
      expect(limiter.tokens('test')).toBe(i);
    }
  });

  it('allows acquire after restore()', async () => {
    await limiter.acquire('test', { maxCalls: 1, windowMs: 60_000 });
    expect(limiter.tokens('test')).toBe(0);
    limiter.restore('test');
    expect(limiter.tokens('test')).toBe(1);
  });

  it('reset() clears all buckets and queues', async () => {
    await limiter.acquire('a', { maxCalls: 5, windowMs: 60_000 });
    await limiter.acquire('b', { maxCalls: 5, windowMs: 60_000 });
    limiter.reset();
    expect(limiter.tokens('a')).toBe(0);
    expect(limiter.tokens('b')).toBe(0);
  });

  it('returns 0 wait time when disabled (maxCalls=Infinity)', async () => {
    const waitMs = await limiter.acquire('test', { maxCalls: Infinity, windowMs: 0 });
    expect(waitMs).toBe(0);
  });
});
```

- [ ] **Step 2: Run tests to verify they pass**

```bash
npm test -- --reporter=verbose
```

Expected: all 5 tests PASS.

- [ ] **Step 3: Commit**

```bash
git add src/core/rateLimiter.test.ts
git commit -m "test: unit tests for RateLimiter token-bucket logic"
```

---

## Task 9: Write integration tests for `AnthropicAgent` rate-limit behavior

**Files:**
- Create: `src/agents/anthropic.test.ts`

- [ ] **Step 1: Write tests for rate-limit integration**

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RateLimiter } from '../core/rateLimiter.js';

// Mock the Anthropic SDK to avoid real API calls
vi.mock('@anthropic-ai/sdk', () => ({
  default: {
    __esModule: true,
    default: class MockAnthropic {
      messages = {
        stream: vi.fn().mockReturnValue({
          async *[Symbol.asyncIterator]() {
            yield { type: 'message_delta', usage: { input_tokens: 10, output_tokens: 20 } };
          },
          async finalMessage() {
            return {
              stop_reason: 'end_turn',
              content: [{ type: 'text', text: 'done' }],
            };
          },
        }),
      };
    },
  },
}));

describe('AnthropicAgent rate limiting', () => {
  let limiter: RateLimiter;

  beforeEach(() => {
    limiter = new RateLimiter();
  });

  it('acquire is called before each LLM call (checked via limiter)', async () => {
    const acquireSpy = vi.spyOn(limiter, 'acquire');

    // Tokens should be consumed one at a time
    await limiter.acquire('architect', { maxCalls: 3, windowMs: 60_000 });
    await limiter.acquire('architect', { maxCalls: 3, windowMs: 60_000 });
    await limiter.acquire('architect', { maxCalls: 3, windowMs: 60_000 });

    expect(acquireSpy).toHaveBeenCalledTimes(3);
    expect(limiter.tokens('architect')).toBe(0);
  });

  it('restore undoes a token consumed on error', async () => {
    await limiter.acquire('coder', { maxCalls: 2, windowMs: 60_000 });
    expect(limiter.tokens('coder')).toBe(1);

    limiter.restore('coder');
    expect(limiter.tokens('coder')).toBe(2);
  });
});
```

- [ ] **Step 2: Run tests**

```bash
npm test -- --reporter=verbose
```

Expected: all tests PASS.

- [ ] **Step 3: Commit**

```bash
git add src/agents/anthropic.test.ts
git commit -m "test: integration tests for AnthropicAgent rate-limit behavior"
```

---

## Task 10: Build and verify

**Files:**
- (no file changes — run verification commands)

- [ ] **Step 1: Type-check the project**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 2: Run full test suite**

```bash
npm test
```

Expected: all tests PASS.

- [ ] **Step 3: Build**

```bash
npm run build
```

Expected: `dist/` output generated with no errors.

- [ ] **Step 4: Commit**

```bash
git add .
git commit -m "chore: verify build and tests pass"
```

---

## Self-Review Checklist

- [ ] **Spec coverage:** Every requirement in the task is implemented by at least one step above. Rate limiting is added to `AnthropicAgent` (the only agent that makes direct API calls); configuration is wired from `ags.yaml` through the orchestrator to `BaseAgent.run()` options.
- [ ] **Placeholder scan:** No `TODO`, `TBD`, "implement later", or vague step descriptions found. All steps contain concrete code or exact commands.
- [ ] **Type consistency:** `RoleId` is used consistently as the rate-limit key in `getEffectiveRateLimit()` and `runRole()`. `AgsConfig['rateLimits']` flows from config → orchestrator → agent `run()` without any type casts.
- [ ] **No test gaps:** `RateLimiter` has unit tests covering the core token-bucket logic; `AnthropicAgent` has integration tests covering the acquire/restore cycle.
- [ ] **No new external dependencies** (Vitest is a dev-only tool runner, not a production dependency).
