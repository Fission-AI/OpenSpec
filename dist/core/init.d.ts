type ToolLabel = {
    primary: string;
    annotation?: string;
};
type ToolWizardChoice = {
    kind: 'heading' | 'info';
    value: string;
    label: ToolLabel;
    selectable: false;
} | {
    kind: 'option';
    value: string;
    label: ToolLabel;
    configured: boolean;
    selectable: true;
};
type ToolWizardConfig = {
    extendMode: boolean;
    baseMessage: string;
    choices: ToolWizardChoice[];
    initialSelected?: string[];
};
type ToolSelectionPrompt = (config: ToolWizardConfig) => Promise<string[]>;
type InitCommandOptions = {
    prompt?: ToolSelectionPrompt;
    tools?: string;
};
export declare class InitCommand {
    private readonly prompt;
    private readonly toolsArg?;
    constructor(options?: InitCommandOptions);
    execute(targetPath: string): Promise<void>;
    private validate;
    private getConfiguration;
    private getSelectedTools;
    private resolveToolsArg;
    private promptForAITools;
    private getExistingToolStates;
    private isToolConfigured;
    private createDirectoryStructure;
    private generateFiles;
    private ensureTemplateFiles;
    private writeTemplateFiles;
    private configureAITools;
    private configureRootAgentsStub;
    private displaySuccessMessage;
    private formatToolNames;
    private renderBanner;
    private startSpinner;
}
export {};
//# sourceMappingURL=init.d.ts.map