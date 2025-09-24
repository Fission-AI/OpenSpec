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
}

export const AI_TOOLS: AIToolOption[] = [
  { name: 'Claude Code (✅ OpenSpec custom slash commands available)', value: 'claude', available: true, successLabel: 'Claude Code' },
  { name: 'Cursor (✅ OpenSpec custom slash commands available)', value: 'cursor', available: true, successLabel: 'Cursor' },
  { name: 'OpenCode (✅ OpenSpec custom slash commands available)', value: 'opencode', available: true, successLabel: 'OpenCode' },
  { name: 'AGENTS.md (works with Codex, Amp, Copilot, …)', value: 'agents', available: true, successLabel: 'your AGENTS.md-compatible assistant' }
];
