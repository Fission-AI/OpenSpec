const isZhOS = (() => {
  // 在测试环境下强制使用英文模板
  if (process.env.NODE_ENV === 'test' || process.env.VITEST === 'true') {
    return false;
  }
  const lang = (process.env.LANG || process.env.LANGUAGE || process.env.LC_ALL || process.env.LC_MESSAGES || Intl.DateTimeFormat().resolvedOptions().locale || '').toLowerCase();
  return lang.startsWith('zh');
})();

import { agentsTemplate as agentsTemplateDefault } from './agents-template.js';
import { agentsTemplateZh } from './zh-cn/agents-template.js';
const agentsTemplate = isZhOS ? agentsTemplateZh : agentsTemplateDefault;

import { projectTemplate as projectTemplateDefault } from './project-template.js';
import { projectTemplateZh } from './zh-cn/project-template.js';
const projectTemplate = isZhOS ? projectTemplateZh : projectTemplateDefault;

import { agentsRootStubTemplate as agentsRootStubTemplateDefault } from './agents-root-stub.js';
import { agentsRootStubTemplateZh } from './zh-cn/agents-root-stub.js';
const agentsRootStubTemplate = isZhOS ? agentsRootStubTemplateZh : agentsRootStubTemplateDefault;

import { getSlashCommandBody as getSlashCommandBodyDefault } from './slash-command-templates.js';
import { getSlashCommandBody as getSlashCommandBodyZh } from './zh-cn/slash-command-templates.js';
const getSlashCommandBody = isZhOS ? getSlashCommandBodyZh : getSlashCommandBodyDefault;

import type { ProjectContext as ProjectContextEn } from './project-template.js';
import type { ProjectContext as ProjectContextZh } from './zh-cn/project-template.js';
import type { SlashCommandId as SlashCommandIdEn } from './slash-command-templates.js';
import type { SlashCommandId as SlashCommandIdZh } from './zh-cn/slash-command-templates.js';

import { claudeTemplate as claudeTemplateDefault } from './claude-template.js'
import { claudeTemplate as claudeTemplateZh } from './zh-cn/claude-template.js'
const claudeTemplate = isZhOS ? claudeTemplateZh : claudeTemplateDefault

import { clineTemplate as clineTemplateDefault } from './cline-template.js'
import { clineTemplate as clineTemplateZh } from './zh-cn/cline-template.js'
const clineTemplate = isZhOS ? clineTemplateZh : clineTemplateDefault

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
      },
      {
        path: 'project.md',
        content: projectTemplate(context)
      }
    ];
  }

  static getClaudeTemplate(): string {
    return claudeTemplate;
  }

  static getClineTemplate(): string {
    return clineTemplate;
  }

  static getAgentsStandardTemplate(): string {
    return agentsRootStubTemplate;
  }

  static getSlashCommandBody(id: SlashCommandId): string {
    return getSlashCommandBody(id);
  }
}

export type ProjectContext = ProjectContextZh | ProjectContextEn;
export type SlashCommandId = SlashCommandIdZh | SlashCommandIdEn;
