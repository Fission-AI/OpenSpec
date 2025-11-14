import { SlashCommandConfigurator } from './base.js';
import { SlashCommandId } from '../../templates/index.js';
export declare class ClineSlashCommandConfigurator extends SlashCommandConfigurator {
    readonly toolId = "cline";
    readonly isAvailable = true;
    protected getRelativePath(id: SlashCommandId): string;
    protected getFrontmatter(id: SlashCommandId): string | undefined;
}
//# sourceMappingURL=cline.d.ts.map