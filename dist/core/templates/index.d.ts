import { ProjectContext } from './project-template.js';
import { SlashCommandId } from './slash-command-templates.js';
export interface Template {
    path: string;
    content: string | ((context: ProjectContext) => string);
}
export declare class TemplateManager {
    static getTemplates(context?: ProjectContext): Template[];
    static getClaudeTemplate(): string;
    static getClineTemplate(): string;
    static getCostrictTemplate(): string;
    static getAgentsStandardTemplate(): string;
    static getSlashCommandBody(id: SlashCommandId): string;
}
export { ProjectContext } from './project-template.js';
export type { SlashCommandId } from './slash-command-templates.js';
//# sourceMappingURL=index.d.ts.map