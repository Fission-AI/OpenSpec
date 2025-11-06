import { SlashCommandConfigurator } from './base.js';
import { SlashCommandId } from '../../templates/index.js';
export declare class CursorSlashCommandConfigurator extends SlashCommandConfigurator {
    readonly toolId = "cursor";
    readonly isAvailable = true;
    protected getRelativePath(id: SlashCommandId): string;
    protected getFrontmatter(id: SlashCommandId): string;
}
//# sourceMappingURL=cursor.d.ts.map