export const OPENSPEC_DIR_NAME = 'openspec';

export const OPENSPEC_MARKERS = {
  start: '<!-- OPENSPEC:START -->',
  end: '<!-- OPENSPEC:END -->'
};

export interface OpenSpecConfig {
  aiTools: string[];
  language?: string;
}

export interface LanguageOption {
  code: string;
  name: string;
  nativeName: string;
}

export const SUPPORTED_LANGUAGES: LanguageOption[] = [
  { code: 'en-US', name: 'English', nativeName: 'English' },
  { code: 'zh-CN', name: 'Chinese', nativeName: '中文' },
  { code: 'fr-FR', name: 'French', nativeName: 'Français' },
  { code: 'ja-JP', name: 'Japanese', nativeName: '日本語' },
  { code: 'ar-SA', name: 'Arabic', nativeName: 'العربية' },
];

export const DEFAULT_LANGUAGE = 'en-US';

export const CONFIG_FILE_NAME = 'config.json';

export interface AIToolOption {
  name: string;
  value: string;
  available: boolean;
  successLabel?: string;
}

export const AI_TOOLS: AIToolOption[] = [
  { name: 'Auggie (Augment CLI)', value: 'auggie', available: true, successLabel: 'Auggie' },
  { name: 'Claude Code', value: 'claude', available: true, successLabel: 'Claude Code' },
  { name: 'Cline', value: 'cline', available: true, successLabel: 'Cline' },
  { name: 'CodeBuddy Code (CLI)', value: 'codebuddy', available: true, successLabel: 'CodeBuddy Code' },
  { name: 'CoStrict', value: 'costrict', available: true, successLabel: 'CoStrict' },
  { name: 'Crush', value: 'crush', available: true, successLabel: 'Crush' },
  { name: 'Cursor', value: 'cursor', available: true, successLabel: 'Cursor' },
  { name: 'Factory Droid', value: 'factory', available: true, successLabel: 'Factory Droid' },
  { name: 'OpenCode', value: 'opencode', available: true, successLabel: 'OpenCode' },
  { name: 'Kilo Code', value: 'kilocode', available: true, successLabel: 'Kilo Code' },
  { name: 'Qoder (CLI)', value: 'qoder', available: true, successLabel: 'Qoder' },
  { name: 'Windsurf', value: 'windsurf', available: true, successLabel: 'Windsurf' },
  { name: 'Codex', value: 'codex', available: true, successLabel: 'Codex' },
  { name: 'GitHub Copilot', value: 'github-copilot', available: true, successLabel: 'GitHub Copilot' },
  { name: 'Amazon Q Developer', value: 'amazon-q', available: true, successLabel: 'Amazon Q Developer' },
  { name: 'Qwen Code', value: 'qwen', available: true, successLabel: 'Qwen Code' },
  { name: 'AGENTS.md (works with Amp, VS Code, …)', value: 'agents', available: false, successLabel: 'your AGENTS.md-compatible assistant' }
];
