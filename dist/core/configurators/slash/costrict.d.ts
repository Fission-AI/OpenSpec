import { SlashCommandConfigurator } from './base.js';
import { SlashCommandId } from '../../templates/index.js';
export declare class CostrictSlashCommandConfigurator extends SlashCommandConfigurator {
    readonly toolId = "costrict";
    readonly isAvailable = true;
    protected getRelativePath(id: SlashCommandId): string;
    protected getFrontmatter(id: SlashCommandId): string | undefined;
}
//# sourceMappingURL=costrict.d.ts.map