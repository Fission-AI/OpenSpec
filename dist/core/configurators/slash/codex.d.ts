import { SlashCommandConfigurator } from "./base.js";
import { SlashCommandId } from "../../templates/index.js";
export declare class CodexSlashCommandConfigurator extends SlashCommandConfigurator {
    readonly toolId = "codex";
    readonly isAvailable = true;
    protected getRelativePath(id: SlashCommandId): string;
    protected getFrontmatter(id: SlashCommandId): string | undefined;
    private getGlobalPromptsDir;
    generateAll(projectPath: string, _openspecDir: string): Promise<string[]>;
    updateExisting(projectPath: string, _openspecDir: string): Promise<string[]>;
    private updateFullFile;
    resolveAbsolutePath(_projectPath: string, id: SlashCommandId): string;
}
//# sourceMappingURL=codex.d.ts.map