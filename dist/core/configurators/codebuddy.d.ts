import { ToolConfigurator } from './base.js';
export declare class CodeBuddyConfigurator implements ToolConfigurator {
    name: string;
    configFileName: string;
    isAvailable: boolean;
    configure(projectPath: string, openspecDir: string): Promise<void>;
}
//# sourceMappingURL=codebuddy.d.ts.map