import type { AgsConfig, ToolType } from '../types.js';
export declare const CONFIG_FILE = "ags.yaml";
export declare const AGS_DIR = ".ags";
export declare const TOOL_MODELS: Record<ToolType, string[]>;
export declare function loadConfig(cwd?: string): AgsConfig;
export declare function saveConfig(config: AgsConfig, cwd?: string): void;
export declare function configExists(cwd?: string): boolean;
export declare function createDefaultConfig(name: string, description?: string, overrides?: Partial<AgsConfig>): AgsConfig;
//# sourceMappingURL=config.d.ts.map