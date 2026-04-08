import { EventEmitter } from 'events';
import { join } from 'path';
import { writeFileSync } from 'fs';
import { createState, saveState, updateAgent, addAgentOutput, setPhase, addCost, ensureAgsDir, agsDir, } from './state.js';
import { createAgent } from '../agents/factory.js';
import { architectSystemPrompt, architectPrompt, coderSystemPrompt, coderPrompt, reviewerSystemPrompt, reviewerPrompt, testerSystemPrompt, testerPrompt, debuggerSystemPrompt, debuggerPrompt, } from '../roles/prompts.js';
// ─── Orchestrator ─────────────────────────────────────────────────────────────
export class Swarm extends EventEmitter {
    config;
    cwd;
    state;
    agents = new Map();
    aborted = false;
    constructor(config, cwd, userTask) {
        super();
        this.config = config;
        this.cwd = cwd;
        ensureAgsDir(cwd);
        // Build initial agent instances from config
        const agentInstances = this.buildAgentInstances();
        this.state = createState(userTask, cwd, agentInstances);
        saveState(this.state, cwd);
        // Create agent process handlers
        for (const [id, instance] of Object.entries(this.state.agents)) {
            const agent = createAgent(id, instance.tool, instance.model ?? '');
            agent.on('output', (line) => {
                this.state = addAgentOutput(this.state, id, line);
                this.emit('event', {
                    type: 'agent_output',
                    agentId: id,
                    line,
                });
                saveState(this.state, cwd);
            });
            this.agents.set(id, agent);
        }
    }
    // ─── Public API ─────────────────────────────────────────────────────────────
    getState() {
        return this.state;
    }
    abort() {
        this.aborted = true;
        this.emit('event', { type: 'error', message: 'Swarm aborted by user' });
    }
    async run() {
        const { userTask } = this.state;
        const ctx = this.makeCtx();
        this.emit('event', {
            type: 'phase_change',
            phase: 'architecting',
        });
        // ── Phase 1: Architect ────────────────────────────────────────────────────
        this.state = setPhase(this.state, 'architecting');
        saveState(this.state, this.cwd);
        const spec = await this.runRole('architect-1', {
            systemPrompt: architectSystemPrompt(ctx),
            prompt: architectPrompt(ctx),
            maxTurns: 20,
        });
        if (!spec || this.aborted) {
            this.fail('Architect failed to produce a spec');
            return;
        }
        // Save spec to disk
        this.state = { ...this.state, spec };
        const specPath = join(agsDir(this.cwd), 'specs', 'current.md');
        writeFileSync(specPath, spec, 'utf8');
        saveState(this.state, this.cwd);
        // ── Phase 2: Coding ───────────────────────────────────────────────────────
        this.state = setPhase(this.state, 'coding');
        this.emit('event', { type: 'phase_change', phase: 'coding' });
        const coderConfig = this.config.roles.coder;
        const coderInstances = coderConfig.instances ?? 1;
        // Tasks: one per coder instance (simplified — in a real impl we'd split spec into tasks)
        const coderCtx = { ...ctx, spec };
        const coderResults = [];
        // Run coders in parallel
        const coderPromises = Array.from({ length: coderInstances }, (_, i) => {
            const id = `coder-${i + 1}`;
            return this.runRole(id, {
                systemPrompt: coderSystemPrompt(coderCtx),
                prompt: coderPrompt(coderCtx),
                maxTurns: 40,
            }).then((result) => {
                if (result)
                    coderResults.push(result);
            });
        });
        await Promise.all(coderPromises);
        if (this.aborted) {
            this.fail('Aborted during coding');
            return;
        }
        // ── Phase 3: Review ───────────────────────────────────────────────────────
        if (this.config.workflow.autoReview !== false) {
            this.state = setPhase(this.state, 'reviewing');
            this.emit('event', { type: 'phase_change', phase: 'reviewing' });
            let revisionCount = 0;
            const maxLoops = this.config.workflow.maxRevisionLoops ?? 3;
            while (revisionCount < maxLoops && !this.aborted) {
                const reviewCtx = { ...ctx, spec };
                const reviewResult = await this.runRole('reviewer-1', {
                    systemPrompt: reviewerSystemPrompt(reviewCtx),
                    prompt: reviewerPrompt(reviewCtx),
                    maxTurns: 15,
                });
                if (!reviewResult)
                    break;
                // Parse reviewer verdict
                const verdict = this.extractVerdict(reviewResult);
                this.appendOutput('reviewer-1', `Verdict: ${verdict.verdict}`, 'info');
                if (verdict.verdict === 'approved') {
                    break;
                }
                revisionCount++;
                this.state = { ...this.state, revisionLoops: revisionCount };
                if (revisionCount >= maxLoops) {
                    this.appendOutput('reviewer-1', `Max revision loops (${maxLoops}) reached — proceeding`, 'info');
                    break;
                }
                // Run coder again with review feedback
                const revisedCtx = {
                    ...coderCtx,
                    previousOutput: `Review feedback:\n${reviewResult}`,
                };
                await this.runRole('coder-1', {
                    systemPrompt: coderSystemPrompt(revisedCtx),
                    prompt: `${coderPrompt(revisedCtx)}\n\nIMPORTANT: The reviewer requested changes:\n${reviewResult}\n\nFix the issues and re-implement.`,
                    maxTurns: 30,
                });
            }
        }
        if (this.aborted)
            return;
        // ── Phase 4: Testing ──────────────────────────────────────────────────────
        if (this.config.workflow.autoTest !== false) {
            this.state = setPhase(this.state, 'testing');
            this.emit('event', { type: 'phase_change', phase: 'testing' });
            const testCtx = { ...ctx, spec };
            const testResult = await this.runRole('tester-1', {
                systemPrompt: testerSystemPrompt(testCtx),
                prompt: testerPrompt(testCtx),
                maxTurns: 20,
            });
            if (testResult && !this.aborted) {
                const testReport = this.extractTestReport(testResult);
                if (!testReport.passed) {
                    // Debug phase
                    this.state = setPhase(this.state, 'debugging');
                    this.emit('event', { type: 'phase_change', phase: 'debugging' });
                    const debugCtx = { ...ctx, spec, testOutput: testResult };
                    await this.runRole('debugger-1', {
                        systemPrompt: debuggerSystemPrompt(debugCtx),
                        prompt: debuggerPrompt(debugCtx),
                        maxTurns: 30,
                    });
                }
            }
        }
        // ── Done ──────────────────────────────────────────────────────────────────
        if (!this.aborted) {
            this.state = setPhase(this.state, 'done');
            this.state = { ...this.state, finishedAt: Date.now() };
            saveState(this.state, this.cwd);
            this.emit('event', {
                type: 'swarm_done',
                success: true,
                summary: `Task completed in ${this.elapsedSeconds()}s. Total cost: $${this.state.totalCost.toFixed(4)}`,
            });
        }
    }
    // ─── Internal helpers ────────────────────────────────────────────────────────
    async runRole(agentId, opts) {
        const agent = this.agents.get(agentId);
        if (!agent)
            return null;
        this.state = updateAgent(this.state, agentId, {
            status: 'working',
            currentTask: opts.prompt.slice(0, 80),
            startedAt: Date.now(),
        });
        this.emit('event', {
            type: 'agent_status',
            agentId,
            status: 'working',
        });
        saveState(this.state, this.cwd);
        const result = await agent.run({
            prompt: opts.prompt,
            systemPrompt: opts.systemPrompt,
            cwd: this.cwd,
            maxTurns: opts.maxTurns,
        });
        const newStatus = result.success ? 'done' : 'failed';
        this.state = updateAgent(this.state, agentId, {
            status: newStatus,
            finishedAt: Date.now(),
            cost: (this.state.agents[agentId]?.cost ?? 0) + result.costUsd,
        });
        this.state = addCost(this.state, result.costUsd);
        this.emit('event', {
            type: 'agent_status',
            agentId,
            status: newStatus,
        });
        this.emit('event', {
            type: 'cost_update',
            agentId,
            delta: result.costUsd,
        });
        saveState(this.state, this.cwd);
        return result.success ? result.output : null;
    }
    fail(reason) {
        this.state = setPhase(this.state, 'failed');
        this.state = { ...this.state, lastError: reason, finishedAt: Date.now() };
        saveState(this.state, this.cwd);
        this.emit('event', {
            type: 'swarm_done',
            success: false,
            summary: reason,
        });
    }
    appendOutput(agentId, content, type = 'text') {
        const line = { timestamp: Date.now(), type, content };
        this.state = addAgentOutput(this.state, agentId, line);
        this.emit('event', {
            type: 'agent_output',
            agentId,
            line,
        });
    }
    makeCtx() {
        return {
            projectName: this.config.project.name,
            projectDescription: this.config.project.description,
            task: this.state.userTask,
            spec: this.state.spec,
        };
    }
    buildAgentInstances() {
        const instances = [];
        const addRole = (id, roleId, cfg) => {
            instances.push({
                id,
                role: roleId,
                tool: cfg.tool,
                model: cfg.model,
                status: 'idle',
                output: [],
            });
        };
        addRole('architect-1', 'architect', this.config.roles.architect ?? this.config.orchestrator);
        const coderCfg = this.config.roles.coder ?? this.config.orchestrator;
        const coderCount = coderCfg.instances ?? 1;
        for (let i = 0; i < coderCount; i++) {
            addRole(`coder-${i + 1}`, 'coder', coderCfg);
        }
        addRole('reviewer-1', 'reviewer', this.config.roles.reviewer ?? this.config.orchestrator);
        addRole('tester-1', 'tester', this.config.roles.tester ?? this.config.orchestrator);
        addRole('debugger-1', 'debugger', this.config.roles.debugger ?? this.config.orchestrator);
        return instances;
    }
    extractVerdict(reviewOutput) {
        try {
            const match = reviewOutput.match(/\{[\s\S]*?"verdict"\s*:\s*"(approved|needs_changes)"[\s\S]*?\}/);
            if (match) {
                const parsed = JSON.parse(match[0]);
                return parsed;
            }
        }
        catch {
            /* fall through */
        }
        // Heuristic fallback
        if (/approved/i.test(reviewOutput) && !/needs.changes/i.test(reviewOutput)) {
            return { verdict: 'approved' };
        }
        return { verdict: 'needs_changes' };
    }
    extractTestReport(testOutput) {
        try {
            const match = testOutput.match(/\{[\s\S]*?"passed"\s*:\s*(true|false)[\s\S]*?\}/);
            if (match) {
                const parsed = JSON.parse(match[0]);
                return parsed;
            }
        }
        catch {
            /* fall through */
        }
        if (/all tests passed|✓|PASS/i.test(testOutput))
            return { passed: true };
        if (/FAIL|failed|error/i.test(testOutput))
            return { passed: false };
        return { passed: true };
    }
    elapsedSeconds() {
        return Math.round((Date.now() - this.state.startedAt) / 1000);
    }
}
//# sourceMappingURL=orchestrator.js.map