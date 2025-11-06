import { ToolConfigurator } from './base.js';
export declare class ClaudeConfigurator implements ToolConfigurator {
    name: string;
    configFileName: string;
    isAvailable: boolean;
    configure(projectPath: string, openspecDir: string): Promise<void>;
}
//# sourceMappingURL=claude.d.ts.map