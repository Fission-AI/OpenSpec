import { DEFAULT_LANGUAGE, SUPPORTED_LANGUAGES, LanguageOption } from '../config.js';

export type LanguageCode = string;

export interface I18nResources {
  [key: string]: string | I18nResources;
}

// Language resource maps
const resources: Record<LanguageCode, I18nResources> = {
  'en-US': {},
  'zh-CN': {},
  'fr-FR': {},
  'ja-JP': {},
  'ar-SA': {},
};

export function getLanguage(languageCode?: string): LanguageCode {
  if (!languageCode) {
    return DEFAULT_LANGUAGE;
  }
  
  const normalized = languageCode.toLowerCase();
  const language = SUPPORTED_LANGUAGES.find(
    (lang) => lang.code.toLowerCase() === normalized
  );
  
  return language?.code || DEFAULT_LANGUAGE;
}

export function t(key: string, language: LanguageCode = DEFAULT_LANGUAGE, params?: Record<string, string>): string {
  const lang = getLanguage(language);
  const langResources = resources[lang] || resources[DEFAULT_LANGUAGE];
  
  // Simple key lookup (supports nested keys with dot notation)
  const keys = key.split('.');
  let value: any = langResources;
  
  for (const k of keys) {
    if (value && typeof value === 'object' && k in value) {
      value = value[k];
    } else {
      // Fallback to default language
      value = resources[DEFAULT_LANGUAGE];
      for (const fallbackKey of keys) {
        if (value && typeof value === 'object' && fallbackKey in value) {
          value = value[fallbackKey];
        } else {
          return key; // Return key if translation not found
        }
      }
      break;
    }
  }
  
  if (typeof value !== 'string') {
    return key;
  }
  
  // Simple parameter substitution
  if (params) {
    return value.replace(/\{\{(\w+)\}\}/g, (match, paramKey) => {
      return params[paramKey] || match;
    });
  }
  
  return value;
}

// For now, return English templates by default
// This will be expanded with actual translations later
export function getTemplate(templateName: string, language: LanguageCode = DEFAULT_LANGUAGE): string {
  // For initial implementation, return English templates
  // Multi-language templates will be added in subsequent steps
  return '';
}

