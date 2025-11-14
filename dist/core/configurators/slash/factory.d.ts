import { SlashCommandConfigurator } from './base.js';
import { SlashCommandId } from '../../templates/index.js';
export declare class FactorySlashCommandConfigurator extends SlashCommandConfigurator {
    readonly toolId = "factory";
    readonly isAvailable = true;
    protected getRelativePath(id: SlashCommandId): string;
    protected getFrontmatter(id: SlashCommandId): string;
    protected getBody(id: SlashCommandId): string;
}
//# sourceMappingURL=factory.d.ts.map