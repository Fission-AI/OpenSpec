import { ToolConfigurator } from './base.js';
export declare class CostrictConfigurator implements ToolConfigurator {
    name: string;
    configFileName: string;
    isAvailable: boolean;
    configure(projectPath: string, openspecDir: string): Promise<void>;
}
//# sourceMappingURL=costrict.d.ts.map