import { execFile } from 'child_process';
import { promisify } from 'util';
const execFileAsync = promisify(execFile);
export async function execFileNoThrow(file, args = [], options = {}) {
    try {
        const { stdout, stderr } = await execFileAsync(file, args, {
            timeout: options.timeout ?? 10000,
            cwd: options.cwd,
            encoding: 'utf8',
        });
        return { stdout, stderr, status: 'success' };
    }
    catch (err) {
        const e = err;
        return {
            stdout: e.stdout ?? '',
            stderr: e.stderr ?? '',
            status: 'error',
            code: e.code,
        };
    }
}
//# sourceMappingURL=execFileNoThrow.js.map