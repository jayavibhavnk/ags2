import React from 'react';
import type { Swarm } from '../core/orchestrator.js';
interface Props {
    swarm: Swarm;
    projectName: string;
    onDone?: (success: boolean) => void;
    onAbort?: () => void;
}
export declare function App({ swarm, projectName, onDone, onAbort }: Props): React.ReactElement;
export {};
//# sourceMappingURL=App.d.ts.map