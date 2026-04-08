export interface RolePromptContext {
    projectName: string;
    projectDescription?: string;
    task: string;
    spec?: string;
    previousOutput?: string;
    diff?: string;
    testOutput?: string;
    errorOutput?: string;
}
export declare function orchestratorSystemPrompt(ctx: RolePromptContext): string;
export declare function orchestratorPrompt(ctx: RolePromptContext): string;
export declare function architectSystemPrompt(ctx: RolePromptContext): string;
export declare function architectPrompt(ctx: RolePromptContext): string;
export declare function coderSystemPrompt(ctx: RolePromptContext): string;
export declare function coderPrompt(ctx: RolePromptContext): string;
export declare function reviewerSystemPrompt(ctx: RolePromptContext): string;
export declare function reviewerPrompt(ctx: RolePromptContext): string;
export declare function testerSystemPrompt(ctx: RolePromptContext): string;
export declare function testerPrompt(ctx: RolePromptContext): string;
export declare function debuggerSystemPrompt(ctx: RolePromptContext): string;
export declare function debuggerPrompt(ctx: RolePromptContext): string;
export declare function generateClaudeMd(projectName: string, description: string | undefined, techStack?: string): string;
export declare function generateAgentsMd(projectName: string, description: string | undefined): string;
//# sourceMappingURL=prompts.d.ts.map