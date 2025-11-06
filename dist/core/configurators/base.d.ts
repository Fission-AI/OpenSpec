export interface ToolConfigurator {
    name: string;
    configFileName: string;
    isAvailable: boolean;
    configure(projectPath: string, openspecDir: string): Promise<void>;
}
//# sourceMappingURL=base.d.ts.map