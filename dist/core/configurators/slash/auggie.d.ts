import { SlashCommandConfigurator } from './base.js';
import { SlashCommandId } from '../../templates/index.js';
export declare class AuggieSlashCommandConfigurator extends SlashCommandConfigurator {
    readonly toolId = "auggie";
    readonly isAvailable = true;
    protected getRelativePath(id: SlashCommandId): string;
    protected getFrontmatter(id: SlashCommandId): string;
}
//# sourceMappingURL=auggie.d.ts.map