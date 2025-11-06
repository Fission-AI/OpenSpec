import { SlashCommandConfigurator } from './base.js';
import { SlashCommandId } from '../../templates/index.js';
export declare class CodeBuddySlashCommandConfigurator extends SlashCommandConfigurator {
    readonly toolId = "codebuddy";
    readonly isAvailable = true;
    protected getRelativePath(id: SlashCommandId): string;
    protected getFrontmatter(id: SlashCommandId): string;
}
//# sourceMappingURL=codebuddy.d.ts.map