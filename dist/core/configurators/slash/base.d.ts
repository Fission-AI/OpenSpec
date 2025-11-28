import { SlashCommandId } from '../../templates/index.js';
export interface SlashCommandTarget {
    id: SlashCommandId;
    path: string;
    kind: 'slash';
}
export declare abstract class SlashCommandConfigurator {
    abstract readonly toolId: string;
    abstract readonly isAvailable: boolean;
    getTargets(): SlashCommandTarget[];
    generateAll(projectPath: string, _openspecDir: string): Promise<string[]>;
    updateExisting(projectPath: string, _openspecDir: string): Promise<string[]>;
    protected abstract getRelativePath(id: SlashCommandId): string;
    protected abstract getFrontmatter(id: SlashCommandId): string | undefined;
    protected getBody(id: SlashCommandId): string;
    resolveAbsolutePath(projectPath: string, id: SlashCommandId): string;
    protected updateBody(filePath: string, body: string): Promise<void>;
}
//# sourceMappingURL=base.d.ts.map