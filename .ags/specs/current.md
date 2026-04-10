Plan complete and saved to `docs/superpowers/plans/2026-04-09-rate-limiting.md`.

---

## What I Found in the Codebase

**"API endpoints" in this CLI tool are LLM API calls** — not HTTP routes. Here's the full picture:

| Agent | Mechanism | Rate-Limitable? |
|---|---|---|
| `ClaudeCodeAgent` | Spawns `claude` CLI process | ❌ Claude Code handles its own upstream quota |
| `AnthropicAgent` | `client.messages.stream()` — direct HTTP to Anthropic | ✅ **Primary target** |
| `CodexAgent` | Spawns `codex` CLI process | ❌ Codex handles its own upstream quota |
| `OpenCodeAgent` | Spawns `opencode` CLI process | ❌ OpenCode handles its own upstream quota |

So rate limiting targets `AnthropicAgent` — which makes direct Anthropic API calls — and the orchestrator's call frequency across all roles.

---

## Plan Summary

**10 tasks**, running **TDD** (write test → verify it fails → implement → verify it passes → commit):

1. **Add types** — `RateLimitConfig`, `RateLimitRoleConfig` in `src/types.ts`; wire into `AgsConfig`
2. **Config defaults** — parse `rateLimits:` from `ags.yaml`, add `getEffectiveRateLimit()` helper
3. **Create `RateLimiter`** — token-bucket singleton in `src/core/rateLimiter.ts`
4. **Integrate into `AnthropicAgent`** — `acquire()` before streaming call, `restore()` on error
5. **Orchestrator wiring** — pass per-role limits from config → `agent.run()` options
6. **Update `ags.yaml`** — add `rateLimits:` section with per-role defaults
7. **Set up Vitest** — add test runner to `package.json` + `vitest.config.ts`
8. **Unit tests** — token-bucket logic in `src/core/rateLimiter.test.ts`
9. **Integration tests** — rate-limit acquire/restore in `src/agents/anthropic.test.ts`
10. **Build & verify** — `tsc --noEmit`, `npm test`, `npm run build`

---

**Two execution options:**

**1. Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks for fast iteration

**2. Inline Execution** — Execute tasks in this session using `executing-plans`, batch execution with checkpoints

Which approach would you like?