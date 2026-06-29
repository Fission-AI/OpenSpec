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
  detectionPaths?: string[]; // Override skillsDir for auto-detection; any path existing triggers detection
  requiresIdeRestart?: boolean; // True when slash commands are loaded by an IDE/editor process
}

export const AI_TOOLS: AIToolOption[] = [
  { name: 'Amazon Q Developer', value: 'amazon-q', available: true, successLabel: 'Amazon Q Developer', skillsDir: '.amazonq', requiresIdeRestart: true },
  { name: 'Antigravity', value: 'antigravity', available: true, successLabel: 'Antigravity', skillsDir: '.agent' },
  { name: 'Auggie (Augment CLI)', value: 'auggie', available: true, successLabel: 'Auggie', skillsDir: '.augment' },
  { name: 'Bob Shell', value: 'bob', available: true, successLabel: 'Bob Shell', skillsDir: '.bob' },
  { name: 'Claude Code', value: 'claude', available: true, successLabel: 'Claude Code', skillsDir: '.claude' },
  { name: 'Cline', value: 'cline', available: true, successLabel: 'Cline', skillsDir: '.cline', requiresIdeRestart: true },
  { name: 'Codex', value: 'codex', available: true, successLabel: 'Codex', skillsDir: '.codex' },
  { name: 'ForgeCode', value: 'forgecode', available: true, successLabel: 'ForgeCode', skillsDir: '.forge' },
  { name: 'CodeBuddy Code (CLI)', value: 'codebuddy', available: true, successLabel: 'CodeBuddy Code', skillsDir: '.codebuddy' },
  { name: 'Continue', value: 'continue', available: true, successLabel: 'Continue (VS Code / JetBrains / Cli)', skillsDir: '.continue', requiresIdeRestart: true },
  { name: 'CoStrict', value: 'costrict', available: true, successLabel: 'CoStrict', skillsDir: '.cospec', requiresIdeRestart: true },
  { name: 'Crush', value: 'crush', available: true, successLabel: 'Crush', skillsDir: '.crush' },
  { name: 'Cursor', value: 'cursor', available: true, successLabel: 'Cursor', skillsDir: '.cursor', requiresIdeRestart: true },
  { name: 'Factory Droid', value: 'factory', available: true, successLabel: 'Factory Droid', skillsDir: '.factory' },
  { name: 'Gemini CLI', value: 'gemini', available: true, successLabel: 'Gemini CLI', skillsDir: '.gemini' },
  { name: 'GitHub Copilot', value: 'github-copilot', available: true, successLabel: 'GitHub Copilot', skillsDir: '.github', detectionPaths: ['.github/copilot-instructions.md', '.github/instructions', '.github/workflows/copilot-setup-steps.yml', '.github/prompts', '.github/agents', '.github/skills', '.github/.mcp.json'], requiresIdeRestart: true },
  { name: 'iFlow', value: 'iflow', available: true, successLabel: 'iFlow', skillsDir: '.iflow' },
  { name: 'Junie', value: 'junie', available: true, successLabel: 'Junie', skillsDir: '.junie', requiresIdeRestart: true },
  { name: 'Kilo Code', value: 'kilocode', available: true, successLabel: 'Kilo Code', skillsDir: '.kilocode', requiresIdeRestart: true },
  { name: 'Kimi CLI', value: 'kimi', available: true, successLabel: 'Kimi CLI', skillsDir: '.kimi' },
  { name: 'Kiro', value: 'kiro', available: true, successLabel: 'Kiro', skillsDir: '.kiro' },
  { name: 'Lingma', value: 'lingma', available: true, successLabel: 'Lingma', skillsDir: '.lingma' },
  { name: 'Mistral Vibe', value: 'vibe', available: true, successLabel: 'Mistral Vibe', skillsDir: '.vibe' },
  { name: 'OpenCode', value: 'opencode', available: true, successLabel: 'OpenCode', skillsDir: '.opencode' },
  { name: 'Pi', value: 'pi', available: true, successLabel: 'Pi', skillsDir: '.pi' },
  { name: 'Qoder', value: 'qoder', available: true, successLabel: 'Qoder', skillsDir: '.qoder' },
  { name: 'Qwen Code', value: 'qwen', available: true, successLabel: 'Qwen Code', skillsDir: '.qwen' },
  { name: 'RooCode', value: 'roocode', available: true, successLabel: 'RooCode', skillsDir: '.roo', requiresIdeRestart: true },
  { name: 'Trae', value: 'trae', available: true, successLabel: 'Trae', skillsDir: '.trae', requiresIdeRestart: true },
  { name: 'Windsurf', value: 'windsurf', available: true, successLabel: 'Windsurf', skillsDir: '.windsurf', requiresIdeRestart: true },
  { name: 'AGENTS.md (works with Amp, VS Code, …)', value: 'agents', available: false, successLabel: 'your AGENTS.md-compatible assistant' }
];
