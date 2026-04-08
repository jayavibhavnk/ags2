export interface ExecResult {
    stdout: string;
    stderr: string;
    status: 'success' | 'error';
    code?: number;
}
export declare function execFileNoThrow(file: string, args?: string[], options?: {
    timeout?: number;
    cwd?: string;
}): Promise<ExecResult>;
//# sourceMappingURL=execFileNoThrow.d.ts.map