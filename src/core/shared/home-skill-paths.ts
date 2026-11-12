/**
 * Where a machine-wide (`--global`) install puts each tool's skills. The one
 * real copy goes to `~/.agents/skills/`; a tool that doesn't read that folder
 * gets a link in its own home skills folder. Every folder here is the one the
 * skills CLI (`npx skills add -g`, version 1.8.1) uses, so a skill installed
 * either way lands in the same place and the two never fight over a path.
 */
import * as fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

/** How a global install reaches a tool. */
export type HomeSkillsReach =
  /** The tool reads `~/.agents/skills/` itself. */
  | { kind: 'shared' }
  /** The tool reads only `dir`; each skill is linked into it. `base` bounds every write. */
  | { kind: 'link'; dir: string; base: string }
  /** No known home skills folder: set it up per project. */
  | { kind: 'none' };

interface HomeEnv {
  home: string;
  env: NodeJS.ProcessEnv;
}

type LinkBase = (e: HomeEnv) => string;

const fromEnv = (name: string, fallback: string): LinkBase => (e) =>
  e.env[name]?.trim() || path.join(e.home, fallback);
const inHome = (folder: string): LinkBase => (e) => path.join(e.home, folder);
const inConfig = (folder: string): LinkBase => (e) =>
  path.join(e.env.XDG_CONFIG_HOME?.trim() || path.join(e.home, '.config'), folder);

/**
 * Each tool's home skills folder is `<base>/skills`. Tools absent here (and
 * not in SHARED) have no known home folder.
 */
const LINKED: Readonly<Record<string, LinkBase>> = {
  claude: fromEnv('CLAUDE_CONFIG_DIR', '.claude'),
  antigravity: inHome('.gemini/config'),
  auggie: inHome('.augment'),
  bob: inHome('.bob'),
  'command-code': inHome('.commandcode'),
  codeartsagent: inHome('.codeartsdoer'),
  codebuddy: inHome('.codebuddy'),
  codestudio: inHome('.codestudio'),
  continue: inHome('.continue'),
  crush: inConfig('crush'),
  devin: inConfig('devin'),
  forgecode: inHome('.forge'),
  grok: fromEnv('GROK_HOME', '.grok'),
  hermes: fromEnv('HERMES_HOME', '.hermes'),
  iflow: inHome('.iflow'),
  junie: inHome('.junie'),
  kiro: inHome('.kiro'),
  lingma: inHome('.lingma'),
  vibe: fromEnv('VIBE_HOME', '.vibe'),
  qoder: inHome('.qoder'),
  qwen: inHome('.qwen'),
  rovodev: inHome('.rovodev'),
  roocode: inHome('.roo'),
  trae: inHome('.trae'),
  zcode: inHome('.zcode'),
};

/** Tools that read `~/.agents/skills/` themselves. */
const SHARED: ReadonlySet<string> = new Set([
  'amp',
  'cline',
  'codex',
  'cursor',
  'factory',
  'gemini',
  'github-copilot',
  'kilocode',
  'kimi',
  'opencode',
  'pi',
  'warp',
  'zed',
  'agents',
]);

/** The home folder, as the rest of OpenSpec resolves it. */
export function resolveHomeDir(env: NodeJS.ProcessEnv = process.env): string {
  return env.USERPROFILE ?? env.HOME ?? os.homedir();
}

/** `~/.agents/skills/`: the one real copy of a global install. */
export function resolveHomeSharedSkillsDir(home: string = resolveHomeDir()): string {
  return path.join(home, '.agents', 'skills');
}

export function resolveHomeSkillsReach(
  toolId: string,
  options: { home?: string; env?: NodeJS.ProcessEnv } = {}
): HomeSkillsReach {
  const env = options.env ?? process.env;
  const home = options.home ?? resolveHomeDir(env);
  if (SHARED.has(toolId)) return { kind: 'shared' };
  const base = LINKED[toolId];
  if (!base) return { kind: 'none' };
  const dir = base({ home, env });
  return { kind: 'link', dir: path.join(dir, 'skills'), base: dir };
}

/**
 * Skill names the skills CLI records as installed for this machine, from its
 * lock file (`$XDG_STATE_HOME/skills/.skill-lock.json`, else
 * `~/.agents/.skill-lock.json`). Empty when it isn't there or can't be read.
 */
export function readNpxSkillsLock(options: { home?: string; env?: NodeJS.ProcessEnv } = {}): Set<string> {
  const env = options.env ?? process.env;
  const home = options.home ?? resolveHomeDir(env);
  const state = env.XDG_STATE_HOME?.trim();
  const lockPath = state ? path.join(state, 'skills', '.skill-lock.json') : path.join(home, '.agents', '.skill-lock.json');
  try {
    const parsed = JSON.parse(fs.readFileSync(lockPath, 'utf-8')) as { skills?: unknown };
    if (!parsed.skills || typeof parsed.skills !== 'object' || Array.isArray(parsed.skills)) return new Set();
    return new Set(Object.keys(parsed.skills));
  } catch {
    return new Set();
  }
}
