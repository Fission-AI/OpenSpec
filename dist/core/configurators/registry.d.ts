import { ToolConfigurator } from './base.js';
export declare class ToolRegistry {
    private static tools;
    static register(tool: ToolConfigurator): void;
    static get(toolId: string): ToolConfigurator | undefined;
    static getAll(): ToolConfigurator[];
    static getAvailable(): ToolConfigurator[];
}
//# sourceMappingURL=registry.d.ts.map