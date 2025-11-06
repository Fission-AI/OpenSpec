import { SlashCommandConfigurator } from './base.js';
import { SlashCommandId } from '../../templates/index.js';
export declare class WindsurfSlashCommandConfigurator extends SlashCommandConfigurator {
    readonly toolId = "windsurf";
    readonly isAvailable = true;
    protected getRelativePath(id: SlashCommandId): string;
    protected getFrontmatter(id: SlashCommandId): string | undefined;
}
//# sourceMappingURL=windsurf.d.ts.map