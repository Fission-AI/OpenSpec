/**
 * Skills installed once for this machine, for every project.
 *
 * Vercel's `skills` package (the one behind `npx skills`) does the install: it
 * fetches the skills published in OpenSpec's repository, and owns the layout,
 * the links each tool needs and the lock file. This module holds no paths and
 * writes no skill text of its own.
 */

import os from 'os';
import path from 'path';
import { realpathSync } from 'fs';
import { spawnSync } from 'child_process';
import { AI_TOOLS, OPENSPEC_SKILL_NAMES } from './config.js';
import { getSkillTemplates } from './shared/skill-generation.js';
import { getConfiguredTools } from './shared/tool-detection.js';

export type SkillScope = 'global' | 'project';

export const SKILL_SCOPES: readonly SkillScope[] = ['global', 'project'];

/** Where the skills are published: the same place `npx skills add` reads them from. */
const PUBLISHED_SOURCE = 'Fission-AI/OpenSpec';

/**
 * Another place to install the skills from, for tests and for anyone who keeps
 * a copy of OpenSpec's `skills/` folder: a local path, or any source the
 * `skills` package accepts.
 */
const SOURCE_OVERRIDE_ENV = 'OPENSPEC_SKILLS_SOURCE';

/** Told to the user when the skills can't be fetched because git is missing. */
export class GitMissingError extends Error {
  constructor() {
    super(
      "Installing OpenSpec's skills for this machine needs git, and it isn't on your PATH. " +
        'Install git (https://git-scm.com/downloads) and run this again, or keep the skills in the project: openspec init --scope project'
    );
    this.name = 'GitMissingError';
  }
}

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

function skillsSource(): string {
  return process.env[SOURCE_OVERRIDE_ENV]?.trim() || PUBLISHED_SOURCE;
}

/** Whether the source is a repository to clone, which takes git. */
function sourceNeedsGit(source: string): boolean {
  return !path.isAbsolute(source) && !source.startsWith('.');
}

/**
 * Whether the lock file says a skill came from OpenSpec's own source. One from
 * anywhere else, or with no record at all, is someone's own and stays theirs.
 */
function isOurSource(source: string | undefined): boolean {
  if (source === undefined) return false;
  const ours = skillsSource();
  return sourceNeedsGit(ours)
    ? source.toLowerCase() === ours.toLowerCase()
    : path.resolve(source) === path.resolve(ours);
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
  /** The CLI's version: the skills published with that release are the ones installed. */
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
  const { installSkills, isDiagnostic, removeSkills } = await import('skills');
  const before = await readGlobalSkills();
  const inProfile = getSkillTemplates(input.workflows).map(({ dirName }) => dirName);
  // A skill of the same name that OpenSpec didn't install is someone's own: never replace it.
  const leftAlone = inProfile.filter((name) => before.foreign.includes(name));
  const wanted = inProfile.filter((name) => !leftAlone.includes(name));
  const added = (input.toolIds ?? []).filter(supportsGlobalSkills).map((id) => AGENT_IDS[id]);
  const agents = [...new Set([UNIVERSAL_AGENT, ...before.agents, ...added])];

  const source = skillsSource();
  const options = { scope: 'global', telemetry: false } as const;
  const failures: string[] = [];
  // A profile with no workflows installs nothing, and only clears what was there.
  if (wanted.length > 0) {
    const install = (ref?: string) =>
      installSkills(source, { ...options, agents, skills: wanted, ...(ref ? { ref } : {}) });
    let installed;
    if (!sourceNeedsGit(source)) {
      installed = await install();
    } else {
      if (spawnSync('git', ['--version'], { stdio: 'ignore' }).status !== 0) {
        // Counted, so we learn how often the git requirement gets in someone's way.
        const { trackCommand } = await import('../telemetry/index.js');
        await trackCommand('skills:git-missing', input.version);
        throw new GitMissingError();
      }
      try {
        // The skills published with this release, so they always match the CLI.
        installed = await install(`v${input.version}`);
      } catch (error) {
        // A release whose tag isn't published yet: the default branch holds the same skills.
        if (!isDiagnostic(error, 'SKILLS_GIT_CLONE_FAILED')) throw error;
        installed = await install();
      }
    }
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
