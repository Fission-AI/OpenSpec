import { agentsTemplate } from './agents-template.js';
import { projectTemplate, ProjectContext } from './project-template.js';
import { claudeTemplate } from './claude-template.js';
import { clineTemplate } from './cline-template.js';
import { costrictTemplate } from './costrict-template.js';
import { agentsRootStubTemplate } from './agents-root-stub.js';
import { getSlashCommandBody, SlashCommandId } from './slash-command-templates.js';

// Import Chinese translations
import { agentsRootStubTemplate as zhCN_agentsRootStubTemplate } from './i18n/zh-CN/agents-root-stub.js';
import { agentsTemplate as zhCN_agentsTemplate } from './i18n/zh-CN/agents-template.js';
import { projectTemplate as zhCN_projectTemplate } from './i18n/zh-CN/project-template.js';
import { getSlashCommandBody as zhCN_getSlashCommandBody } from './i18n/zh-CN/slash-command-templates.js';

// Import French translations
import { agentsRootStubTemplate as frFR_agentsRootStubTemplate } from './i18n/fr-FR/agents-root-stub.js';
import { agentsTemplate as frFR_agentsTemplate } from './i18n/fr-FR/agents-template.js';
import { projectTemplate as frFR_projectTemplate } from './i18n/fr-FR/project-template.js';
import { getSlashCommandBody as frFR_getSlashCommandBody } from './i18n/fr-FR/slash-command-templates.js';

// Import Japanese translations
import { agentsRootStubTemplate as jaJP_agentsRootStubTemplate } from './i18n/ja-JP/agents-root-stub.js';
import { agentsTemplate as jaJP_agentsTemplate } from './i18n/ja-JP/agents-template.js';
import { projectTemplate as jaJP_projectTemplate } from './i18n/ja-JP/project-template.js';
import { getSlashCommandBody as jaJP_getSlashCommandBody } from './i18n/ja-JP/slash-command-templates.js';

// Import Arabic translations
import { agentsRootStubTemplate as arSA_agentsRootStubTemplate } from './i18n/ar-SA/agents-root-stub.js';
import { agentsTemplate as arSA_agentsTemplate } from './i18n/ar-SA/agents-template.js';
import { projectTemplate as arSA_projectTemplate } from './i18n/ar-SA/project-template.js';
import { getSlashCommandBody as arSA_getSlashCommandBody } from './i18n/ar-SA/slash-command-templates.js';

export interface Template {
  path: string;
  content: string | ((context: ProjectContext) => string);
}

export class TemplateManager {
  static getTemplates(context: ProjectContext = {}, language: string = 'en-US'): Template[] {
    const normalizedLang = language.toLowerCase();
    
    if (normalizedLang === 'zh-cn') {
      return [
        {
          path: 'AGENTS.md',
          content: zhCN_agentsTemplate
        },
        {
          path: 'project.md',
          content: zhCN_projectTemplate(context)
        }
      ];
    }
    
    if (normalizedLang === 'fr-fr') {
      return [
        {
          path: 'AGENTS.md',
          content: frFR_agentsTemplate
        },
        {
          path: 'project.md',
          content: frFR_projectTemplate(context)
        }
      ];
    }
    
    if (normalizedLang === 'ja-jp') {
      return [
        {
          path: 'AGENTS.md',
          content: jaJP_agentsTemplate
        },
        {
          path: 'project.md',
          content: jaJP_projectTemplate(context)
        }
      ];
    }
    
    if (normalizedLang === 'ar-sa') {
      return [
        {
          path: 'AGENTS.md',
          content: arSA_agentsTemplate
        },
        {
          path: 'project.md',
          content: arSA_projectTemplate(context)
        }
      ];
    }
    
    // Default to English
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

  static getClaudeTemplate(language: string = 'en-US'): string {
    const normalizedLang = language.toLowerCase();
    
    if (normalizedLang === 'zh-cn') return zhCN_agentsRootStubTemplate;
    if (normalizedLang === 'fr-fr') return frFR_agentsRootStubTemplate;
    if (normalizedLang === 'ja-jp') return jaJP_agentsRootStubTemplate;
    if (normalizedLang === 'ar-sa') return arSA_agentsRootStubTemplate;
    
    return claudeTemplate;
  }

  static getClineTemplate(language: string = 'en-US'): string {
    const normalizedLang = language.toLowerCase();
    
    if (normalizedLang === 'zh-cn') return zhCN_agentsRootStubTemplate;
    if (normalizedLang === 'fr-fr') return frFR_agentsRootStubTemplate;
    if (normalizedLang === 'ja-jp') return jaJP_agentsRootStubTemplate;
    if (normalizedLang === 'ar-sa') return arSA_agentsRootStubTemplate;
    
    return clineTemplate;
  }

  static getCostrictTemplate(language: string = 'en-US'): string {
    const normalizedLang = language.toLowerCase();
    
    if (normalizedLang === 'zh-cn') return zhCN_agentsRootStubTemplate;
    if (normalizedLang === 'fr-fr') return frFR_agentsRootStubTemplate;
    if (normalizedLang === 'ja-jp') return jaJP_agentsRootStubTemplate;
    if (normalizedLang === 'ar-sa') return arSA_agentsRootStubTemplate;
    
    return costrictTemplate;
  }

  static getAgentsStandardTemplate(language: string = 'en-US'): string {
    const normalizedLang = language.toLowerCase();
    
    if (normalizedLang === 'zh-cn') return zhCN_agentsRootStubTemplate;
    if (normalizedLang === 'fr-fr') return frFR_agentsRootStubTemplate;
    if (normalizedLang === 'ja-jp') return jaJP_agentsRootStubTemplate;
    if (normalizedLang === 'ar-sa') return arSA_agentsRootStubTemplate;
    
    return agentsRootStubTemplate;
  }

  static getSlashCommandBody(id: SlashCommandId, language: string = 'en-US'): string {
    const normalizedLang = language.toLowerCase();
    
    if (normalizedLang === 'zh-cn') return zhCN_getSlashCommandBody(id);
    if (normalizedLang === 'fr-fr') return frFR_getSlashCommandBody(id);
    if (normalizedLang === 'ja-jp') return jaJP_getSlashCommandBody(id);
    if (normalizedLang === 'ar-sa') return arSA_getSlashCommandBody(id);
    
    return getSlashCommandBody(id);
  }
}

export { ProjectContext } from './project-template.js';
export type { SlashCommandId } from './slash-command-templates.js';
