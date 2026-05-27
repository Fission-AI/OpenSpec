export const PASTELSDD_DIR_NAME = 'pastelsdd';

export const PASTELSDD_MARKERS = {
  start: '<!-- PASTELSDD:START -->',
  end: '<!-- PASTELSDD:END -->'
};

export interface PastelsddConfig {
  aiTools: string[];
}

export interface AIToolOption {
  name: string;
  value: string;
  available: boolean;
  successLabel?: string;
  skillsDir?: string; // e.g., '.claude' - /skills suffix per Agent Skills spec
  detectionPaths?: string[]; // Override skillsDir for auto-detection; any path existing triggers detection
}

export const AI_TOOLS: AIToolOption[] = [
  { name: 'Claude Code', value: 'claude', available: true, successLabel: 'Claude Code', skillsDir: '.claude' },
  { name: 'Codex', value: 'codex', available: true, successLabel: 'Codex', skillsDir: '.codex' },
  { name: 'Cursor', value: 'cursor', available: true, successLabel: 'Cursor', skillsDir: '.cursor' },
  { name: 'Gemini CLI', value: 'gemini', available: true, successLabel: 'Gemini CLI', skillsDir: '.gemini' },
  { name: 'GitHub Copilot', value: 'github-copilot', available: true, successLabel: 'GitHub Copilot', skillsDir: '.github', detectionPaths: ['.github/copilot-instructions.md', '.github/instructions', '.github/workflows/copilot-setup-steps.yml', '.github/prompts', '.github/agents', '.github/skills', '.github/.mcp.json'] },
];
