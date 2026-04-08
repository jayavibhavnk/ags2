import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

export interface ExecResult {
  stdout: string;
  stderr: string;
  status: 'success' | 'error';
  code?: number;
}

export async function execFileNoThrow(
  file: string,
  args: string[] = [],
  options: { timeout?: number; cwd?: string } = {}
): Promise<ExecResult> {
  try {
    const { stdout, stderr } = await execFileAsync(file, args, {
      timeout: options.timeout ?? 10000,
      cwd: options.cwd,
      encoding: 'utf8',
    });
    return { stdout, stderr, status: 'success' };
  } catch (err: unknown) {
    const e = err as { stdout?: string; stderr?: string; code?: number };
    return {
      stdout: e.stdout ?? '',
      stderr: e.stderr ?? '',
      status: 'error',
      code: e.code,
    };
  }
}
