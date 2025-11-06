import { ToolConfigurator } from './base.js';
export declare class ClineConfigurator implements ToolConfigurator {
    name: string;
    configFileName: string;
    isAvailable: boolean;
    configure(projectPath: string, openspecDir: string): Promise<void>;
}
//# sourceMappingURL=cline.d.ts.map