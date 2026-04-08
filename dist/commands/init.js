import { basename } from 'path';
import { writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import chalk from 'chalk';
import { createDefaultConfig, saveConfig, CONFIG_FILE } from '../core/config.js';
import { generateClaudeMd, generateAgentsMd } from '../roles/prompts.js';
import { ensureAgsDir } from '../core/state.js';
// We import enquirer dynamically to avoid ESM issues
async function prompt(questions) {
    const { default: Enquirer } = await import('enquirer');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const e = new Enquirer();
    return e.prompt(questions);
}
const TOOL_CHOICES = [
    { name: 'claude-code', message: 'Claude Code (Anthropic)' },
    { name: 'codex', message: 'Codex CLI (OpenAI)' },
    { name: 'opencode', message: 'OpenCode (open source)' },
    { name: 'gemini', message: 'Gemini CLI (Google)' },
];
export async function runInit(cwd = process.cwd()) {
    console.log();
    console.log(chalk.bold.hex('#7C3AED')('  ags') + chalk.dim(' — Agent Swarm Setup'));
    console.log(chalk.dim('  Setting up multi-agent coding swarm for this project.\n'));
    const configPath = join(cwd, CONFIG_FILE);
    if (existsSync(configPath)) {
        const { overwrite } = await prompt({
            type: 'confirm',
            name: 'overwrite',
            message: chalk.yellow('ags.yaml already exists. Overwrite?'),
            initial: false,
        });
        if (!overwrite) {
            console.log(chalk.dim('  Aborted.'));
            return;
        }
    }
    // Project info
    const projectName = basename(cwd);
    const basics = await prompt([
        {
            type: 'input',
            name: 'name',
            message: 'Project name',
            initial: projectName,
        },
        {
            type: 'input',
            name: 'description',
            message: 'Short description (optional)',
        },
        {
            type: 'input',
            name: 'techStack',
            message: 'Tech stack (e.g. "TypeScript, Next.js, Postgres")',
        },
    ]);
    // Coder instances
    const coderSetup = await prompt([
        {
            type: 'select',
            name: 'instances',
            message: 'How many parallel Coder agents?',
            choices: ['1', '2', '3'],
            initial: 0,
        },
        {
            type: 'confirm',
            name: 'worktrees',
            message: 'Use git worktrees for parallel coders? (isolates changes)',
            initial: false,
        },
    ]);
    // Tool choices per role
    console.log(chalk.dim('\n  Configure tools per role (defaults shown):'));
    const tools = await prompt([
        {
            type: 'select',
            name: 'architectTool',
            message: 'Architect tool',
            choices: TOOL_CHOICES,
            initial: 0, // claude-code
        },
        {
            type: 'select',
            name: 'coderTool',
            message: 'Coder tool',
            choices: TOOL_CHOICES,
            initial: 0, // claude-code
        },
        {
            type: 'select',
            name: 'reviewerTool',
            message: 'Reviewer tool',
            choices: TOOL_CHOICES,
            initial: 1, // codex
        },
        {
            type: 'select',
            name: 'testerTool',
            message: 'Tester tool',
            choices: TOOL_CHOICES,
            initial: 0, // claude-code
        },
        {
            type: 'select',
            name: 'debuggerTool',
            message: 'Debugger tool',
            choices: TOOL_CHOICES,
            initial: 0, // claude-code
        },
    ]);
    // Workflow options
    const workflow = await prompt([
        {
            type: 'confirm',
            name: 'autoReview',
            message: 'Auto-route code to Reviewer after Coder?',
            initial: true,
        },
        {
            type: 'confirm',
            name: 'autoTest',
            message: 'Auto-run Tester after Reviewer approves?',
            initial: true,
        },
        {
            type: 'select',
            name: 'maxRevisionLoops',
            message: 'Max Reviewer → Coder revision loops',
            choices: ['1', '2', '3', '5'],
            initial: 2,
        },
    ]);
    // Build config
    const config = createDefaultConfig(basics.name, basics.description || undefined, {
        roles: {
            architect: { tool: tools.architectTool, model: getDefaultModel(tools.architectTool, 'architect') },
            coder: {
                tool: tools.coderTool,
                model: getDefaultModel(tools.coderTool, 'coder'),
                instances: parseInt(coderSetup.instances, 10),
                worktrees: coderSetup.worktrees,
            },
            reviewer: { tool: tools.reviewerTool, model: getDefaultModel(tools.reviewerTool, 'reviewer') },
            tester: { tool: tools.testerTool, model: getDefaultModel(tools.testerTool, 'tester') },
            debugger: { tool: tools.debuggerTool, model: getDefaultModel(tools.debuggerTool, 'debugger') },
        },
        workflow: {
            autoReview: workflow.autoReview,
            autoTest: workflow.autoTest,
            maxRevisionLoops: parseInt(workflow.maxRevisionLoops, 10),
        },
    });
    // Write files
    saveConfig(config, cwd);
    console.log(chalk.green(`\n  ✓ Written: ${CONFIG_FILE}`));
    // Generate CLAUDE.md
    const claudeMdPath = join(cwd, 'CLAUDE.md');
    if (!existsSync(claudeMdPath)) {
        writeFileSync(claudeMdPath, generateClaudeMd(basics.name, basics.description || undefined, basics.techStack || undefined), 'utf8');
        console.log(chalk.green(`  ✓ Written: CLAUDE.md`));
    }
    else {
        console.log(chalk.dim(`  ○ Skipped: CLAUDE.md (already exists)`));
    }
    // Generate AGENTS.md
    const agentsMdPath = join(cwd, 'AGENTS.md');
    if (!existsSync(agentsMdPath)) {
        writeFileSync(agentsMdPath, generateAgentsMd(basics.name, basics.description || undefined), 'utf8');
        console.log(chalk.green(`  ✓ Written: AGENTS.md`));
    }
    else {
        console.log(chalk.dim(`  ○ Skipped: AGENTS.md (already exists)`));
    }
    // Ensure .ags/ exists
    ensureAgsDir(cwd);
    console.log(chalk.green(`  ✓ Created: .ags/`));
    // .gitignore .ags/state.json
    const gitignorePath = join(cwd, '.gitignore');
    if (existsSync(gitignorePath)) {
        const { readFileSync, appendFileSync } = await import('fs');
        const content = readFileSync(gitignorePath, 'utf8');
        if (!content.includes('.ags/')) {
            appendFileSync(gitignorePath, '\n# ags\n.ags/\n');
            console.log(chalk.green(`  ✓ Updated: .gitignore`));
        }
    }
    console.log();
    console.log(chalk.bold('  Ready! Run a task with:'));
    console.log(chalk.hex('#7C3AED')(`    ags run "your task"`));
    console.log();
    printConfig(config);
}
function getDefaultModel(tool, role) {
    const models = {
        'claude-code': {
            architect: 'claude-opus-4-5',
            coder: 'claude-sonnet-4-5',
            reviewer: 'claude-sonnet-4-5',
            tester: 'claude-sonnet-4-5',
            debugger: 'claude-opus-4-5',
        },
        'codex': {
            architect: 'gpt-4.1',
            coder: 'gpt-4.1',
            reviewer: 'gpt-4.1',
            tester: 'gpt-4.1',
            debugger: 'gpt-4.1',
        },
        'opencode': {
            architect: 'claude-opus-4-5',
            coder: 'claude-sonnet-4-5',
            reviewer: 'claude-sonnet-4-5',
            tester: 'claude-sonnet-4-5',
            debugger: 'claude-opus-4-5',
        },
        'gemini': {
            architect: 'gemini-2.5-pro',
            coder: 'gemini-2.5-flash',
            reviewer: 'gemini-2.5-pro',
            tester: 'gemini-2.5-flash',
            debugger: 'gemini-2.5-pro',
        },
    };
    return models[tool]?.[role] ?? 'default';
}
function printConfig(config) {
    console.log(chalk.dim('  Agent configuration:'));
    const roles = [
        ['Architect', config.roles.architect],
        ['Coder', config.roles.coder],
        ['Reviewer', config.roles.reviewer],
        ['Tester', config.roles.tester],
        ['Debugger', config.roles.debugger],
    ];
    for (const [name, role] of roles) {
        if (!role)
            continue;
        const instances = role.instances && role.instances > 1 ? ` ×${role.instances}` : '';
        console.log(chalk.dim(`    ${name.padEnd(12)}`), chalk.white(`${role.tool}`), chalk.dim(`(${role.model ?? 'default'})${instances}`));
    }
    console.log();
}
//# sourceMappingURL=init.js.map