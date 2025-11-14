import { SlashCommandConfigurator } from './base.js';
import { SlashCommandId } from '../../templates/index.js';
export declare class GitHubCopilotSlashCommandConfigurator extends SlashCommandConfigurator {
    readonly toolId = "github-copilot";
    readonly isAvailable = true;
    protected getRelativePath(id: SlashCommandId): string;
    protected getFrontmatter(id: SlashCommandId): string;
}
//# sourceMappingURL=github-copilot.d.ts.map