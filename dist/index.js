#!/usr/bin/env node
import { Command } from 'commander';
import { resolve, join, dirname } from 'path';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const __dirname = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(readFileSync(join(__dirname, '../package.json'), 'utf8'));
const program = new Command();
program
    .name('ags')
    .description('Agent Swarm — multi-agent coding orchestrator')
    .version(pkg.version);
// ─── init ────────────────────────────────────────────────────────────────────
program
    .command('init')
    .description('Set up ags for this project (interactive wizard)')
    .option('-d, --dir <path>', 'project directory', process.cwd())
    .action(async (opts) => {
    const { runInit } = await import('./commands/init.js');
    await runInit(resolve(opts.dir));
});
// ─── run ─────────────────────────────────────────────────────────────────────
program
    .command('run <task>')
    .description('Run a coding task with the full agent swarm')
    .option('-d, --dir <path>', 'project directory', process.cwd())
    .action(async (task, opts) => {
    const { runTask } = await import('./commands/run.js');
    await runTask(task, resolve(opts.dir));
});
// ─── status ──────────────────────────────────────────────────────────────────
program
    .command('status')
    .description('Show current swarm state')
    .option('-d, --dir <path>', 'project directory', process.cwd())
    .action(async (opts) => {
    const { runStatus } = await import('./commands/status.js');
    runStatus(resolve(opts.dir));
});
// ─── doctor ──────────────────────────────────────────────────────────────────
program
    .command('doctor')
    .description('Check which agent tools are installed')
    .action(async () => {
    const { runDoctor } = await import('./commands/doctor.js');
    await runDoctor();
});
// ─── sync ────────────────────────────────────────────────────────────────────
program
    .command('sync')
    .description('Regenerate CLAUDE.md and AGENTS.md from ags.yaml')
    .option('-d, --dir <path>', 'project directory', process.cwd())
    .action(async (opts) => {
    const { runSync } = await import('./commands/sync.js');
    runSync(resolve(opts.dir));
});
// ─── config ──────────────────────────────────────────────────────────────────
program
    .command('config')
    .description('Open ags.yaml in $EDITOR')
    .option('-d, --dir <path>', 'project directory', process.cwd())
    .action((opts) => {
    const { spawnSync } = require('child_process');
    const editor = process.env.EDITOR ?? process.env.VISUAL ?? 'vi';
    const configPath = resolve(opts.dir, 'ags.yaml');
    spawnSync(editor, [configPath], { stdio: 'inherit' });
});
program.parse();
//# sourceMappingURL=index.js.map