import chalk from 'chalk';
import { loadState } from '../core/state.js';
import { loadConfig, configExists } from '../core/config.js';
import { PHASE_LABELS, ROLE_LABELS, STATUS_ICONS } from '../tui/theme.js';

export function runStatus(cwd: string = process.cwd()): void {
  if (!configExists(cwd)) {
    console.log(chalk.yellow('\n  No ags.yaml found. Run "ags init" first.\n'));
    return;
  }

  const config = loadConfig(cwd);
  const state = loadState(cwd);

  console.log();
  console.log(
    chalk.bold.hex('#7C3AED')('  ags status') +
    chalk.dim(` — ${config.project.name}`)
  );
  console.log();

  if (!state) {
    console.log(chalk.dim('  No active session. Run "ags run <task>" to start.\n'));
    return;
  }

  const elapsed = state.finishedAt
    ? Math.round((state.finishedAt - state.startedAt) / 1000)
    : Math.round((Date.now() - state.startedAt) / 1000);

  const phaseColor =
    state.phase === 'done' ? '#10B981' :
    state.phase === 'failed' ? '#EF4444' :
    '#818CF8';

  console.log(
    chalk.dim('  Task:    '),
    chalk.white(state.userTask)
  );
  console.log(
    chalk.dim('  Phase:   '),
    chalk.hex(phaseColor)(PHASE_LABELS[state.phase] ?? state.phase)
  );
  console.log(
    chalk.dim('  Elapsed: '),
    chalk.white(`${elapsed}s`)
  );
  console.log(
    chalk.dim('  Cost:    '),
    chalk.white(`$${state.totalCost.toFixed(4)}`)
  );
  if (state.revisionLoops > 0) {
    console.log(
      chalk.dim('  Revisions:'),
      chalk.white(`${state.revisionLoops}`)
    );
  }

  console.log();
  console.log(chalk.dim('  Agents:'));

  for (const agent of Object.values(state.agents)) {
    const icon = STATUS_ICONS[agent.status] ?? '?';
    const statusColor =
      agent.status === 'done'   ? '#10B981' :
      agent.status === 'failed' ? '#EF4444' :
      agent.status === 'working'? '#34D399' :
      '#6B7280';

    const label = `${ROLE_LABELS[agent.role] ?? agent.role}`;
    const instanceNum = agent.id.match(/-(\d+)$/)?.[1];
    const name = instanceNum && parseInt(instanceNum) > 1
      ? `${label} #${instanceNum}`
      : label;

    const cost = agent.cost ? chalk.dim(` ($${agent.cost.toFixed(4)})`) : '';

    console.log(
      `    ${chalk.hex(statusColor)(icon)} ${chalk.white(name.padEnd(16))}`,
      chalk.dim(agent.tool),
      cost
    );
  }

  if (state.lastError) {
    console.log();
    console.log(chalk.red('  Error:'), chalk.dim(state.lastError));
  }

  console.log();
}
