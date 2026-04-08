import { writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import chalk from 'chalk';
import { loadConfig } from '../core/config.js';
import { generateClaudeMd, generateAgentsMd } from '../roles/prompts.js';

export function runSync(cwd: string = process.cwd()): void {
  let config;
  try {
    config = loadConfig(cwd);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(chalk.red(`  ✗ ${msg}`));
    process.exit(1);
  }

  console.log();
  console.log(chalk.bold.hex('#7C3AED')('  ags sync') + chalk.dim(' — regenerating project files\n'));

  // Overwrite CLAUDE.md
  const claudeMdPath = join(cwd, 'CLAUDE.md');
  writeFileSync(
    claudeMdPath,
    generateClaudeMd(config.project.name, config.project.description),
    'utf8'
  );
  console.log(chalk.green('  ✓ Updated: CLAUDE.md'));

  // Overwrite AGENTS.md
  const agentsMdPath = join(cwd, 'AGENTS.md');
  writeFileSync(
    agentsMdPath,
    generateAgentsMd(config.project.name, config.project.description),
    'utf8'
  );
  console.log(chalk.green('  ✓ Updated: AGENTS.md'));

  console.log(chalk.dim('\n  Tip: Edit ags.yaml to change role/tool assignments, then re-run "ags sync".\n'));
}
