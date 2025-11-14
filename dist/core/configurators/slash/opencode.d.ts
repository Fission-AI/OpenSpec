import { SlashCommandConfigurator } from "./base.js";
import { SlashCommandId } from "../../templates/index.js";
export declare class OpenCodeSlashCommandConfigurator extends SlashCommandConfigurator {
    readonly toolId = "opencode";
    readonly isAvailable = true;
    protected getRelativePath(id: SlashCommandId): string;
    protected getFrontmatter(id: SlashCommandId): string | undefined;
    generateAll(projectPath: string, _openspecDir: string): Promise<string[]>;
    updateExisting(projectPath: string, _openspecDir: string): Promise<string[]>;
    private rewriteArchiveFile;
}
//# sourceMappingURL=opencode.d.ts.map