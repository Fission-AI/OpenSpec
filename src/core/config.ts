export const OPENSPEC_DIR_NAME = 'openspec';

export const OPENSPEC_SKILL_NAMES = [
  'openspec-explore',
  'openspec-new-change',
  'openspec-continue-change',
  'openspec-apply-change',
  'openspec-update-change',
  'openspec-ff-change',
  'openspec-sync-specs',
  'openspec-archive-change',
  'openspec-bulk-archive-change',
  'openspec-verify-change',
  'openspec-onboard',
  'openspec-propose',
] as const;

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
  legacySkillsDirs?: string[]; // Former roots read for detection and migrated after replacement
  globalSkillsDir?: string; // e.g., '.minimax' - /skills suffix, resolved from the user's home directory
  detectionPaths?: string[]; // Override skillsDir for auto-detection; any path existing triggers detection
  searchAliases?: string[]; // Extra single-word terms the init tool picker matches; never displayed
  setupNote?: string; // Manual setup required before the tool picks up generated files; shown after init/update
  requiresIdeRestart?: boolean; // True when slash commands are loaded by an IDE/editor process (a CLI picks them up immediately, so no restart hint — see #1067)
}

export const AI_TOOLS: AIToolOption[] = [
  { name: 'Amazon Q Developer', value: 'amazon-q', available: true, successLabel: 'Amazon Q Developer', skillsDir: '.amazonq', requiresIdeRestart: true },
  // Antigravity moved workspace skills and workflows from `.agent` to the
  // shared `.agents` root in v1.20.5. Detection keys off `.agent` and
  // `.agents/workflows` rather than the bare `.agents` root: that root is
  // shared with Codex, Zed, and the vendor-neutral target, so its presence
  // alone says nothing about Antigravity.
  { name: 'Antigravity', value: 'antigravity', available: true, successLabel: 'Antigravity', skillsDir: '.agents', legacySkillsDirs: ['.agent'], detectionPaths: ['.agent', '.agents/workflows'], requiresIdeRestart: true },
  { name: 'Auggie (Augment CLI)', value: 'auggie', available: true, successLabel: 'Auggie', skillsDir: '.augment' },
  { name: 'Bob Shell', value: 'bob', available: true, successLabel: 'Bob Shell', skillsDir: '.bob' },
  { name: 'Claude Code', value: 'claude', available: true, successLabel: 'Claude Code', skillsDir: '.claude' },
  { name: 'Cline', value: 'cline', available: true, successLabel: 'Cline', skillsDir: '.cline', requiresIdeRestart: true },
  { name: 'Command Code', value: 'command-code', available: true, successLabel: 'Command Code', skillsDir: '.commandcode' },
  { name: 'CodeArts', value: 'codeartsagent', available: true, successLabel: 'CodeArts', skillsDir: '.codeartsdoer' },
  { name: 'Codex', value: 'codex', available: true, successLabel: 'Codex', skillsDir: '.agents', legacySkillsDirs: ['.codex'], detectionPaths: ['.agents/skills', '.codex/skills'] },
  { name: 'Devin Desktop (formerly Windsurf)', value: 'devin', available: true, successLabel: 'Devin Desktop', skillsDir: '.devin', detectionPaths: ['.devin', '.windsurf'], requiresIdeRestart: true },
  { name: 'ForgeCode', value: 'forgecode', available: true, successLabel: 'ForgeCode', skillsDir: '.forge' },
  { name: 'CodeBuddy Code (CLI)', value: 'codebuddy', available: true, successLabel: 'CodeBuddy Code', skillsDir: '.codebuddy' },
  { name: 'Continue', value: 'continue', available: true, successLabel: 'Continue (VS Code / JetBrains / Cli)', skillsDir: '.continue', requiresIdeRestart: true },
  { name: 'CoStrict', value: 'costrict', available: true, successLabel: 'CoStrict', skillsDir: '.cospec', requiresIdeRestart: true },
  { name: 'Crush', value: 'crush', available: true, successLabel: 'Crush', skillsDir: '.crush' },
  { name: 'Cursor', value: 'cursor', available: true, successLabel: 'Cursor', skillsDir: '.cursor', requiresIdeRestart: true },
  { name: 'Factory Droid', value: 'factory', available: true, successLabel: 'Factory Droid', skillsDir: '.factory' },
  { name: 'Gemini CLI', value: 'gemini', available: true, successLabel: 'Gemini CLI', skillsDir: '.gemini' },
  { name: 'GitHub Copilot', value: 'github-copilot', available: true, successLabel: 'GitHub Copilot', skillsDir: '.github', detectionPaths: ['.github/copilot-instructions.md', '.github/instructions', '.github/workflows/copilot-setup-steps.yml', '.github/prompts', '.github/agents', '.github/skills', '.github/.mcp.json'], requiresIdeRestart: true },
  { name: 'Hermes Agent', value: 'hermes', available: true, successLabel: 'Hermes Agent', skillsDir: '.hermes', detectionPaths: ['.hermes', 'HERMES.md', '.hermes.md'], setupNote: "Hermes only loads skills from ~/.hermes/skills by default. Add this project's .hermes/skills directory to skills.external_dirs in ~/.hermes/config.yaml so Hermes picks up the generated OpenSpec skills." },
  { name: 'iFlow', value: 'iflow', available: true, successLabel: 'iFlow', skillsDir: '.iflow' },
  { name: 'Junie', value: 'junie', available: true, successLabel: 'Junie', skillsDir: '.junie', requiresIdeRestart: true },
  { name: 'Kilo Code', value: 'kilocode', available: true, successLabel: 'Kilo Code', skillsDir: '.kilocode', requiresIdeRestart: true },
  { name: 'Kimi Code', value: 'kimi', available: true, successLabel: 'Kimi Code', skillsDir: '.kimi-code', detectionPaths: ['.kimi-code', '.kimi'] },
  { name: 'Kiro', value: 'kiro', available: true, successLabel: 'Kiro', skillsDir: '.kiro', requiresIdeRestart: true },
  { name: 'Lingma', value: 'lingma', available: true, successLabel: 'Lingma', skillsDir: '.lingma', requiresIdeRestart: true },
  { name: 'MiniMax Code', value: 'minimax-code', available: true, successLabel: 'MiniMax Code', globalSkillsDir: '.minimax' },
  { name: 'Mistral Vibe', value: 'vibe', available: true, successLabel: 'Mistral Vibe', skillsDir: '.vibe' },
  { name: 'Oh My Pi', value: 'oh-my-pi', available: true, successLabel: 'Oh My Pi', skillsDir: '.omp' },
  { name: 'OpenCode', value: 'opencode', available: true, successLabel: 'OpenCode', skillsDir: '.opencode' },
  { name: 'Pi', value: 'pi', available: true, successLabel: 'Pi', skillsDir: '.pi' },
  { name: 'SourceCraft Code Assistant', value: 'codeassistant', available: true, successLabel: 'SourceCraft Code Assistant', skillsDir: '.codeassistant' },
  { name: 'Qoder', value: 'qoder', available: true, successLabel: 'Qoder', skillsDir: '.qoder', requiresIdeRestart: true },
  { name: 'Qwen Code', value: 'qwen', available: true, successLabel: 'Qwen Code', skillsDir: '.qwen' },
  { name: 'Rovo Dev CLI', value: 'rovodev', available: true, successLabel: 'Rovo Dev CLI', skillsDir: '.rovodev', detectionPaths: ['.rovodev/skills', '.rovodev'] },
  { name: 'Zoo Code', value: 'roocode', available: true, successLabel: 'Zoo Code', skillsDir: '.roo', requiresIdeRestart: true },
  { name: 'Trae', value: 'trae', available: true, successLabel: 'Trae', skillsDir: '.trae', requiresIdeRestart: true },
  { name: 'Zed Agent', value: 'zed', available: true, successLabel: 'Zed Agent', skillsDir: '.agents', detectionPaths: ['.zed', '.agents/skills'] },
  { name: 'ZCode', value: 'zcode', available: true, successLabel: 'ZCode', skillsDir: '.zcode' },
  // Vendor-neutral target for assistants that read the shared `.agents` root.
  // Detection keys off `.agents/skills` rather than the bare root: frameworks use
  // `.agents/` for more than skills, so the root alone says nothing about skills.
  // A project that does keep skills there is a project this target fits, the same
  // way `.claude/` selects Claude Code — the signal is the user's setup, not
  // OpenSpec's own files.
  // The picker is searchable, so this entry also answers to the words someone
  // whose assistant is not on the list actually types (#653) — it is named for
  // a directory, which none of them would guess. Aliases are single words: the
  // space bar toggles a selection rather than typing into the search box.
  { name: 'Other / Universal (shared .agents skills)', value: 'agents', available: true, successLabel: 'shared .agents skills', skillsDir: '.agents', detectionPaths: ['.agents/skills'], searchAliases: ['universal', 'other', 'generic', 'custom', 'proprietary', 'unlisted', 'unsupported', 'vendor-neutral', 'agents.md'] }
];

/**
 * Retired tool ids that still resolve, so a rebrand does not break scripted
 * `--tools` invocations. Windsurf was rebranded to Devin Desktop on
 * 2026-06-02 and its config directory moved from `.windsurf/` to `.devin/`;
 * `--tools windsurf` therefore configures `devin`.
 */
export const TOOL_ID_ALIASES: Record<string, string> = {
  windsurf: 'devin',
};

/**
 * Resolves a tool id through TOOL_ID_ALIASES, leaving current ids untouched.
 */
export function resolveToolIdAlias(toolId: string): string {
  return TOOL_ID_ALIASES[toolId] ?? toolId;
}
