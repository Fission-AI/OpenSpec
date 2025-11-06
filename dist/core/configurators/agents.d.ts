import { ToolConfigurator } from './base.js';
export declare class AgentsStandardConfigurator implements ToolConfigurator {
    name: string;
    configFileName: string;
    isAvailable: boolean;
    configure(projectPath: string, _openspecDir: string): Promise<void>;
}
//# sourceMappingURL=agents.d.ts.map