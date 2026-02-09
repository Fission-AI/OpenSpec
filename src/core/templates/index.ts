import { agentsTemplate } from './agents-template.js';
import { ProjectContext } from './project-template.js';
import { claudeTemplate } from './claude-template.js';
import { clineTemplate } from './cline-template.js';
import { costrictTemplate } from './costrict-template.js';
import { agentsRootStubTemplate } from './agents-root-stub.js';
import {
  getAgentSkillBody,
  getAgentSkillFrontmatter,
  AgentSkillId,
} from './agent-skill-templates.js';

export interface Template {
  path: string;
  content: string | ((context: ProjectContext) => string);
}

export class TemplateManager {
  static getTemplates(context: ProjectContext = {}): Template[] {
    return [
      {
        path: 'AGENTS.md',
        content: agentsTemplate
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

  static getAgentsStandardTemplate(): string {
    return agentsRootStubTemplate;
  }

  static getAgentSkillBody(id: AgentSkillId): string {
    return getAgentSkillBody(id);
  }

  static getAgentSkillFrontmatter(id: AgentSkillId): string {
    return getAgentSkillFrontmatter(id);
  }
}

export { ProjectContext } from './project-template.js';
export type { AgentSkillId } from './agent-skill-templates.js';
