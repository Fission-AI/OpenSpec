import { agentsTemplate } from './agents-template.js';
import { agentsChineseTemplate } from './agents-chinese-template.js';
import { projectTemplate, ProjectContext } from './project-template.js';
import { projectChineseTemplate } from './project-chinese-template.js';
import { claudeTemplate } from './claude-template.js';
import { clineTemplate } from './cline-template.js';
import { costrictTemplate } from './costrict-template.js';
import { agentsRootStubTemplate } from './agents-root-stub.js';
import { agentsRootStubChineseTemplate } from './agents-root-stub-chinese.js';
import { getSlashCommandBody, SlashCommandId } from './slash-command-templates.js';

export interface Template {
  path: string;
  content: string | ((context: ProjectContext) => string);
}

export class TemplateManager {
  static getTemplates(context: ProjectContext = {}, language: 'en' | 'zh' = 'en'): Template[] {
    const agentsContent = language === 'zh' ? agentsChineseTemplate : agentsTemplate;
    const projectContent = language === 'zh' ? projectChineseTemplate(context) : projectTemplate(context);
    
    return [
      {
        path: 'AGENTS.md',
        content: agentsContent
      },
      {
        path: 'project.md',
        content: projectContent
      }
    ];
  }

  static getClaudeTemplate(): string {
    return claudeTemplate;
  }

  static getClineTemplate(): string {
    return clineTemplate;
  }

  static getCostrictTemplate(): string {
    return costrictTemplate;
  }

  static getAgentsStandardTemplate(language: 'en' | 'zh' = 'en'): string {
    return language === 'zh' ? agentsRootStubChineseTemplate : agentsRootStubTemplate;
  }

  static getSlashCommandBody(id: SlashCommandId): string {
    return getSlashCommandBody(id);
  }
}

export { ProjectContext } from './project-template.js';
export type { SlashCommandId } from './slash-command-templates.js';
