/**
 * Skills installed once for this machine, for every project.
 *
 * OpenSpec writes the skill text; Vercel's `skills` package (the one behind
 * `npx skills`) puts it in place. It owns the layout, the links each tool needs
 * and the lock file, so this module holds no paths of its own.
 */

import os from 'os';
import path from 'path';
import { realpathSync } from 'fs';
import { promises as fs } from 'fs';
import { AI_TOOLS, OPENSPEC_SKILL_NAMES } from './config.js';
import { getGlobalDataDir } from './global-config.js';
import { sharedSkillContents } from './shared/shared-skill-install.js';
import { getSkillTemplates } from './shared/skill-generation.js';
import { getConfiguredTools } from './shared/tool-detection.js';

export type SkillScope = 'global' | 'project';

export const SKILL_SCOPES: readonly SkillScope[] = ['global', 'project'];

/** The agent every tool that reads `~/.agents/skills` shares. */
const UNIVERSAL_AGENT = 'universal';

/**
 * OpenSpec tool id to the id the `skills` package uses. A tool missing here has
 * no machine-wide skills folder the package knows, so it stays per project.
 * MiniMax Code is left out on purpose: OpenSpec already keeps its skills in the
 * home folder, and two installers must not share that folder.
 */
const AGENT_IDS: Readonly<Record<string, string>> = {
  agents: UNIVERSAL_AGENT,
  amp: 'amp',
  antigravity: 'antigravity',
  auggie: 'augment',
  bob: 'bob',
  claude: 'claude-code',
  cline: 'cline',
  codeartsagent: 'codearts-agent',
  codebuddy: 'codebuddy',
  codestudio: 'codestudio',
  codex: 'codex',
  'command-code': 'command-code',
  continue: 'continue',
  crush: 'crush',
  cursor: 'cursor',
  devin: 'devin',
  factory: 'droid',
  forgecode: 'forgecode',
  gemini: 'gemini-cli',
  'github-copilot': 'github-copilot',
  grok: 'grok',
  hermes: 'hermes-agent',
  iflow: 'iflow-cli',
  junie: 'junie',
  kilocode: 'kilo',
  kimi: 'kimi-code-cli',
  kiro: 'kiro-cli',
  lingma: 'lingma',
  opencode: 'opencode',
  pi: 'pi',
  qoder: 'qoder',
  qwen: 'qwen-code',
  roocode: 'roo',
  rovodev: 'rovodev',
  trae: 'trae',
  vibe: 'mistral-vibe',
  warp: 'warp',
  zcode: 'zcode',
  zed: 'zed',
};

export function supportsGlobalSkills(toolId: string): boolean {
  return Object.hasOwn(AGENT_IDS, toolId);
}

/** Whether a path is the home folder, where the global skills live. */
export function isHomeFolder(projectPath: string): boolean {
  const real = (target: string): string => {
    try {
      return realpathSync.native(target);
    } catch {
      return path.resolve(target);
    }
  };
  return real(projectPath) === real(os.homedir());
}

/**
 * Whether the project holds OpenSpec skills or commands of its own. The home
 * folder never does: what sits in its `.agents/skills` is the global install.
 */
export function projectHasOwnSkills(projectPath: string): boolean {
  if (isHomeFolder(projectPath)) return false;
  return getConfiguredTools(projectPath).some(
    (id) => !AI_TOOLS.find((tool) => tool.value === id)?.globalSkillsDir
  );
}

/** Where OpenSpec writes the skill text the `skills` package installs from. */
function sourceDir(): string {
  return path.join(getGlobalDataDir(), 'skills');
}

/**
 * Whether the lock file says OpenSpec installed a skill. One that someone added
 * with `npx skills add` has another source, and stays theirs to manage.
 */
function isOurSource(source: string | undefined): boolean {
  return source !== undefined && path.resolve(source) === path.resolve(sourceDir());
}

export interface GlobalSkills {
  /** OpenSpec's skills installed for this machine. */
  skills: string[];
  /** Agents, by the `skills` package's ids, that have a link to them. */
  agents: string[];
  /** Skills with an OpenSpec name that something else put there. */
  foreign: string[];
}

export async function readGlobalSkills(): Promise<GlobalSkills> {
  const { listSkills } = await import('skills');
  const { skills } = await listSkills({ scope: 'global' });
  const named = skills.filter((skill) => (OPENSPEC_SKILL_NAMES as readonly string[]).includes(skill.name));
  const ours = named.filter((skill) => isOurSource(skill.source));
  return {
    skills: ours.map((skill) => skill.name),
    agents: [...new Set(ours.flatMap((skill) => [...skill.agents]))],
    foreign: [...new Set(named.filter((skill) => !isOurSource(skill.source)).map((skill) => skill.name))],
  };
}

export interface GlobalInstallInput {
  /** Tools to add. The tools already set up are always kept and refreshed. */
  toolIds?: readonly string[];
  workflows: readonly string[];
  /** The CLI's version, stamped into each skill. */
  version: string;
}

export interface GlobalInstallResult {
  skills: string[];
  /** Agents the skills are now installed for, by the `skills` package's ids. */
  agents: string[];
  removedSkills: string[];
  /** Skills left alone because something other than OpenSpec installed them. */
  leftAlone: string[];
  failures: string[];
}

/**
 * Install OpenSpec's skills for this machine, or refresh the ones there.
 * Reinstalling is the update: the `skills` package replaces what it finds.
 */
export async function installGlobalSkills(input: GlobalInstallInput): Promise<GlobalInstallResult> {
  const { installSkills, removeSkills } = await import('skills');
  const before = await readGlobalSkills();
  const inProfile = getSkillTemplates(input.workflows).map(({ dirName }) => dirName);
  // A skill of the same name that OpenSpec didn't install is someone's own: never replace it.
  const leftAlone = inProfile.filter((name) => before.foreign.includes(name));
  const wanted = inProfile.filter((name) => !leftAlone.includes(name));
  const added = (input.toolIds ?? []).filter(supportsGlobalSkills).map((id) => AGENT_IDS[id]);
  const agents = [...new Set([UNIVERSAL_AGENT, ...before.agents, ...added])];

  const source = sourceDir();
  await fs.rm(source, { recursive: true, force: true });
  for (const [name, content] of sharedSkillContents(input.version, input.workflows)) {
    await fs.mkdir(path.join(source, name), { recursive: true });
    await fs.writeFile(path.join(source, name, 'SKILL.md'), content, 'utf8');
  }

  const options = { scope: 'global', telemetry: false } as const;
  const failures: string[] = [];
  // A profile with no workflows installs nothing, and only clears what was there.
  if (wanted.length > 0) {
    const installed = await installSkills(source, { ...options, agents, skills: wanted });
    failures.push(...installed.failed.map((failure) => failure.message));
  }

  const removedSkills = before.skills.filter((name) => !inProfile.includes(name));
  if (removedSkills.length > 0) {
    const removed = await removeSkills(removedSkills, options);
    failures.push(...removed.failed.map((failure) => failure.message));
  }

  return { skills: wanted, agents, removedSkills, leftAlone, failures: [...new Set(failures)] };
}

/**
 * A note for a project that has its own skills on a machine that also has the
 * global ones, where a tool may list each skill twice.
 */
export async function duplicateSkillsNote(projectPath: string): Promise<string | undefined> {
  try {
    if (!projectHasOwnSkills(projectPath) || (await readGlobalSkills()).skills.length === 0) return undefined;
  } catch {
    return undefined;
  }
  return (
    'This project has its own copy of the OpenSpec skills and this machine has the global ones, ' +
    'so a tool may list each skill twice. To use only the global ones here: openspec init --scope global'
  );
}

/** A problem from the `skills` package, with the fix it suggests when it has one. */
export function describeSkillsError(error: unknown): string {
  if (!(error instanceof Error)) return String(error);
  const fix = (error as { fix?: unknown }).fix;
  return typeof fix === 'string' && fix.length > 0 ? `${error.message} ${fix}` : error.message;
}

/** What to tell the user about skills a global install did not touch. */
export function describeLeftAlone(leftAlone: readonly string[]): string | undefined {
  if (leftAlone.length === 0) return undefined;
  const one = leftAlone.length === 1;
  return (
    `Left ${leftAlone.join(', ')} in your home folder alone: OpenSpec didn't install ${one ? 'it' : 'them'}. ` +
    `Remove ${one ? 'it' : 'them'} to get OpenSpec's own.`
  );
}
