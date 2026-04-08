import chalk from 'chalk';
import { execFileNoThrow } from '../utils/execFileNoThrow.js';

interface Tool {
  name: string;
  command: string;
  versionArgs: string[];
  installHint: string;
}

const TOOLS: Tool[] = [
  {
    name: 'Claude Code',
    command: 'claude',
    versionArgs: ['--version'],
    installHint: 'npm install -g @anthropic-ai/claude-code',
  },
  {
    name: 'Codex CLI',
    command: 'codex',
    versionArgs: ['--version'],
    installHint: 'npm install -g @openai/codex',
  },
  {
    name: 'OpenCode',
    command: 'opencode',
    versionArgs: ['version'],
    installHint: 'npm install -g opencode-ai',
  },
  {
    name: 'Gemini CLI',
    command: 'gemini',
    versionArgs: ['--version'],
    installHint: 'npm install -g @google/gemini-cli',
  },
];

async function checkTool(tool: Tool): Promise<{ installed: boolean; version?: string }> {
  const result = await execFileNoThrow(tool.command, tool.versionArgs, { timeout: 5000 });
  if (result.status === 'success' || result.stdout) {
    const output = result.stdout + result.stderr;
    const versionMatch = output.match(/\d+\.\d+[\.\d]*/);
    return { installed: true, version: versionMatch?.[0] };
  }
  return { installed: false };
}

export async function runDoctor(): Promise<void> {
  console.log();
  console.log(chalk.bold.hex('#7C3AED')('  ags doctor') + chalk.dim(' — checking installed tools\n'));

  let allOk = true;

  for (const tool of TOOLS) {
    const result = await checkTool(tool);

    if (result.installed) {
      console.log(
        chalk.green('  ✓'),
        chalk.white(tool.name.padEnd(16)),
        chalk.dim(`v${result.version ?? '?'}`)
      );
    } else {
      allOk = false;
      console.log(
        chalk.red('  ✗'),
        chalk.white(tool.name.padEnd(16)),
        chalk.dim('not found')
      );
      console.log(
        chalk.dim(`       install: ${tool.installHint}`)
      );
    }
  }

  console.log();

  const nodeVersion = process.version;
  const nodeMajor = parseInt(nodeVersion.slice(1).split('.')[0], 10);
  if (nodeMajor >= 20) {
    console.log(chalk.green('  ✓'), chalk.white('Node.js'.padEnd(16)), chalk.dim(nodeVersion));
  } else {
    console.log(
      chalk.yellow('  ⚠'),
      chalk.white('Node.js'.padEnd(16)),
      chalk.dim(`${nodeVersion} (>=20 recommended)`)
    );
  }

  console.log();
  if (allOk) {
    console.log(chalk.green('  All tools available!'));
  } else {
    console.log(chalk.yellow('  Some tools are missing. Install them to use all roles.'));
  }
  console.log();
}
