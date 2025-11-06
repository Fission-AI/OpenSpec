import { SlashCommandConfigurator } from './base.js';
import { SlashCommandId } from '../../templates/index.js';
export declare class AmazonQSlashCommandConfigurator extends SlashCommandConfigurator {
    readonly toolId = "amazon-q";
    readonly isAvailable = true;
    protected getRelativePath(id: SlashCommandId): string;
    protected getFrontmatter(id: SlashCommandId): string;
}
//# sourceMappingURL=amazon-q.d.ts.map