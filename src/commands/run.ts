import React from 'react';
import { render } from 'ink';
import chalk from 'chalk';
import { loadConfig } from '../core/config.js';
import { Swarm } from '../core/orchestrator.js';
import { App } from '../tui/App.js';

export async function runTask(task: string, cwd: string = process.cwd()): Promise<void> {
  let config;
  try {
    config = loadConfig(cwd);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(chalk.red(`  ✗ ${msg}`));
    process.exit(1);
  }

  console.log();
  console.log(chalk.bold.hex('#7C3AED')('  ags') + chalk.dim(` — ${config.project.name}`));
  console.log(chalk.dim(`  Task: "${task}"`));
  console.log(chalk.dim('  Starting swarm…\n'));

  const swarm = new Swarm(config, cwd, task);

  // Start the swarm in the background
  swarm.run().catch((err: unknown) => {
    const msg = err instanceof Error ? err.message : String(err);
    // Error is displayed via TUI, but log to stderr just in case
    process.stderr.write(`\n[ags] Fatal error: ${msg}\n`);
  });

  // Render TUI
  const { waitUntilExit } = render(
    React.createElement(App, {
      swarm,
      projectName: config.project.name,
      onDone: (success) => {
        if (!success) process.exitCode = 1;
      },
      onAbort: () => {
        process.exitCode = 1;
      },
    }),
    { exitOnCtrlC: true }
  );

  await waitUntilExit();
}
