# ags — Agent Swarm

A multi-agent coding orchestrator that coordinates specialized AI agents (Claude Code, Codex, OpenCode) to complete complex coding tasks end-to-end.

```
┌─────────────────────────────────────────────────────────────────┐
│  ags  ◆  my-project  ◆  "Add JWT auth to the API"   ⟳ 3:42    │
├─────────────────────┬───────────────────────────────────────────┤
│  AGENTS             │  ORCHESTRATOR                             │
│                     │                                           │
│  [1] ✓ Architect    │  ✓ Spec written (middleware + routes)     │
│  [2] ● Coder #1     │  → Implementing src/auth/middleware.ts    │
│  [3] ● Coder #2     │  › Write src/auth/routes.ts               │
│  [4] ○ Reviewer     │  · 67 lines written                       │
│  [5] ○ Tester       │                                           │
│  [6] ○ Debugger     │                                           │
├─────────────────────┴───────────────────────────────────────────┤
│  ◈ Coding → Reviewing → Testing                                 │
│  [1-6] focus agent  [q] quit  [a] abort    2 active  1/6 done  │
└─────────────────────────────────────────────────────────────────┘
```

## How It Works

ags runs a structured pipeline of specialized agents:

```
Architect → Coder(s) → Reviewer → Tester → Debugger (if needed)
```

- **Architect** reads your codebase and writes a technical spec
- **Coder(s)** implement the spec (supports parallel instances)
- **Reviewer** checks the implementation and can request revisions
- **Tester** writes and runs tests, verifies correctness
- **Debugger** investigates and fixes failures

Each role can be backed by a different AI tool — Claude Code, Codex, OpenCode, or Gemini CLI.

## Requirements

- Node.js ≥ 20
- At least one of:
  - [Claude Code](https://claude.ai/code) — `npm install -g @anthropic-ai/claude-code`
  - [Codex CLI](https://github.com/openai/codex) — `npm install -g @openai/codex`
  - [OpenCode](https://opencode.ai) — `npm install -g opencode-ai`

Check what's installed:
```bash
ags doctor
```

## Quick Start

```bash
# Install globally
npm install -g .

# Set up a project
cd your-project
ags init

# Run a task
ags run "Add rate limiting to the API endpoints"
```

## Commands

| Command | Description |
|---|---|
| `ags init` | Interactive setup wizard — configure roles, tools, and workflow |
| `ags run "task"` | Run a task with the full agent swarm (opens TUI) |
| `ags status` | Show current swarm state from last run |
| `ags doctor` | Check which agent tools are installed |
| `ags sync` | Regenerate `CLAUDE.md` and `AGENTS.md` from `ags.yaml` |
| `ags config` | Open `ags.yaml` in `$EDITOR` |

## Configuration

`ags init` creates `ags.yaml`:

```yaml
version: 1
project:
  name: my-project
  description: "A Next.js app with Postgres"

orchestrator:
  tool: claude-code
  model: claude-opus-4-5

roles:
  architect:
    tool: claude-code
    model: claude-opus-4-5

  coder:
    tool: claude-code
    model: claude-sonnet-4-5
    instances: 2          # parallel coders
    worktrees: true       # isolated git branches

  reviewer:
    tool: codex           # default reviewer: Codex
    model: gpt-4.1

  tester:
    tool: claude-code
    model: claude-sonnet-4-5

  debugger:
    tool: claude-code
    model: claude-opus-4-5

workflow:
  autoReview: true        # always review after coding
  autoTest: true          # always test after review
  maxRevisionLoops: 3     # max coder→reviewer cycles
```

## TUI Controls

| Key | Action |
|---|---|
| `1`–`6` | Focus that agent's output panel |
| `q` / `Esc` | Quit |
| `a` | Abort the swarm |

## Generated Files

`ags init` creates:

```
your-project/
├── ags.yaml        ← main config (edit this)
├── CLAUDE.md       ← agent context for Claude Code
├── AGENTS.md       ← agent context for Codex/OpenCode
└── .ags/           ← runtime state (gitignored)
    ├── state.json
    ├── messages/
    └── specs/
```
