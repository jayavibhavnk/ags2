import { EventEmitter } from 'events';
import type { AgsConfig, SwarmState } from '../types.js';
export declare class Swarm extends EventEmitter {
    private readonly config;
    private readonly cwd;
    private state;
    private agents;
    private aborted;
    constructor(config: AgsConfig, cwd: string, userTask: string);
    getState(): SwarmState;
    abort(): void;
    run(): Promise<void>;
    private runRole;
    private fail;
    private appendOutput;
    private makeCtx;
    private buildAgentInstances;
    private extractVerdict;
    private extractTestReport;
    private elapsedSeconds;
}
//# sourceMappingURL=orchestrator.d.ts.map