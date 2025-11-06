import { agentsTemplate } from './agents-template.js';
import { projectTemplate } from './project-template.js';
import { claudeTemplate } from './claude-template.js';
import { clineTemplate } from './cline-template.js';
import { costrictTemplate } from './costrict-template.js';
import { agentsRootStubTemplate } from './agents-root-stub.js';
import { getSlashCommandBody } from './slash-command-templates.js';
export class TemplateManager {
    static getTemplates(context = {}) {
        return [
            {
                path: 'AGENTS.md',
                content: agentsTemplate
            },
            {
                path: 'project.md',
                content: projectTemplate(context)
            }
        ];
    }
    static getClaudeTemplate() {
        return claudeTemplate;
    }
    static getClineTemplate() {
        return clineTemplate;
    }
    static getCostrictTemplate() {
        return costrictTemplate;
    }
    static getAgentsStandardTemplate() {
        return agentsRootStubTemplate;
    }
    static getSlashCommandBody(id) {
        return getSlashCommandBody(id);
    }
}
//# sourceMappingURL=index.js.map