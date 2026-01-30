export const OPENSPEC_DIR_NAME = 'openspec';

export const OPENSPEC_MARKERS = {
  start: '<!-- OPENSPEC:START -->',
  end: '<!-- OPENSPEC:END -->'
};

export interface OpenSpecConfig {
  aiTools: string[];
}

export interface AIToolOption {
  name: string;
  value: string;
  available: boolean;
  successLabel?: string;
  skillsDir?: string; // e.g., '.claude' - /skills suffix per Agent Skills spec
}

export const AI_TOOLS: AIToolOption[] = [
  { name: 'Amazon Q Developer', value: 'amazon-q', available: true, successLabel: 'Amazon Q Developer', skillsDir: '.amazonq' },
  { name: 'Antigravity', value: 'antigravity', available: true, successLabel: 'Antigravity', skillsDir: '.agent' },
  { name: 'Auggie (Augment CLI)', value: 'auggie', available: true, successLabel: 'Auggie', skillsDir: '.augment' },
  { name: 'Claude Code', value: 'claude', available: true, successLabel: 'Claude Code', skillsDir: '.claude' },
  { name: 'Cline', value: 'cline', available: true, successLabel: 'Cline', skillsDir: '.cline' },
  { name: 'Codex', value: 'codex', available: true, successLabel: 'Codex', skillsDir: '.codex' },
  { name: 'CodeBuddy Code (CLI)', value: 'codebuddy', available: true, successLabel: 'CodeBuddy Code', skillsDir: '.codebuddy' },
  { name: 'Continue', value: 'continue', available: true, successLabel: 'Continue (VS Code / JetBrains / Cli)', skillsDir: '.continue' },
  { name: 'CoStrict', value: 'costrict', available: true, successLabel: 'CoStrict', skillsDir: '.cospec' },
  { name: 'Crush', value: 'crush', available: true, successLabel: 'Crush', skillsDir: '.crush' },
  { name: 'Cursor', value: 'cursor', available: true, successLabel: 'Cursor', skillsDir: '.cursor' },
  { name: 'Factory Droid', value: 'factory', available: true, successLabel: 'Factory Droid', skillsDir: '.factory' },
  { name: 'Gemini CLI', value: 'gemini', available: true, successLabel: 'Gemini CLI', skillsDir: '.gemini' },
  { name: 'GitHub Copilot', value: 'github-copilot', available: true, successLabel: 'GitHub Copilot', skillsDir: '.github' },
  { name: 'iFlow', value: 'iflow', available: true, successLabel: 'iFlow', skillsDir: '.iflow' },
  { name: 'Kilo Code', value: 'kilocode', available: true, successLabel: 'Kilo Code', skillsDir: '.kilocode' },
  { name: 'OpenCode', value: 'opencode', available: true, successLabel: 'OpenCode', skillsDir: '.opencode' },
  { name: 'Qoder', value: 'qoder', available: true, successLabel: 'Qoder', skillsDir: '.qoder' },
  { name: 'Qwen Code', value: 'qwen', available: true, successLabel: 'Qwen Code', skillsDir: '.qwen' },
  { name: 'RooCode', value: 'roocode', available: true, successLabel: 'RooCode', skillsDir: '.roo' },
  { name: 'Trae', value: 'trae', available: true, successLabel: 'Trae', skillsDir: '.trae' },
  { name: 'Windsurf', value: 'windsurf', available: true, successLabel: 'Windsurf', skillsDir: '.windsurf' },
  { name: 'AGENTS.md (works with Amp, VS Code, …)', value: 'agents', available: false, successLabel: 'your AGENTS.md-compatible assistant' }
];
