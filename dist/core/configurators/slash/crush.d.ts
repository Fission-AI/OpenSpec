import { SlashCommandConfigurator } from './base.js';
import { SlashCommandId } from '../../templates/index.js';
export declare class CrushSlashCommandConfigurator extends SlashCommandConfigurator {
    readonly toolId = "crush";
    readonly isAvailable = true;
    protected getRelativePath(id: SlashCommandId): string;
    protected getFrontmatter(id: SlashCommandId): string;
}
//# sourceMappingURL=crush.d.ts.map