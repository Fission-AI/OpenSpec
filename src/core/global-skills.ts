/**
 * Skills installed once for this machine, for every project.
 *
 * Vercel's `skills` package (the one behind `npx skills`) does the install: it
 * fetches the skills published in OpenSpec's repository, and owns the layout,
 * the links each tool needs and the lock file. This module holds no paths and
 * writes no skill text of its own.
 *
 * A project's own skills go through the same package (see
 * `installProjectSkills`), called by the installer that owns that layout.
 */

import os from 'os';
import path from 'path';
import { readFileSync, realpathSync, rmSync, writeFileSync } from 'fs';
import { spawnSync } from 'child_process';
import { createHash } from 'crypto';
import { AI_TOOLS, OPENSPEC_SKILL_NAMES, type AIToolOption } from './config.js';
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

/**
 * Install skills from OpenSpec's source: the ones published with this release,
 * so they always match the CLI. Throws `GitMissingError` when the source has
 * to be cloned and git is missing.
 */
async function installPublishedSkills(
  version: string,
  options: { scope: SkillScope; cwd?: string; agents: readonly string[]; skills: readonly string[] }
) {
  const { installSkills, isDiagnostic } = await import('skills');
  const source = skillsSource();
  const install = (ref?: string) => installSkills(source, { ...options, telemetry: false, ...(ref ? { ref } : {}) });
  if (!sourceNeedsGit(source)) return install();
  if (spawnSync('git', ['--version'], { stdio: 'ignore' }).status !== 0) {
    // Counted, so we learn how often the git requirement gets in someone's way.
    const { trackCommand } = await import('../telemetry/index.js');
    await trackCommand('skills:git-missing', version);
    throw new GitMissingError();
  }
  try {
    return await install(`v${version}`);
  } catch (error) {
    // A release whose tag isn't published yet: the default branch holds the same skills.
    if (!isDiagnostic(error, 'SKILLS_GIT_CLONE_FAILED')) throw error;
    return install();
  }
}

/** The record the `skills` package keeps of a project's skills. */
const PROJECT_LOCK_FILE = 'skills-lock.json';

export function projectLockPath(projectPath: string): string {
  return path.join(projectPath, PROJECT_LOCK_FILE);
}

interface ProjectLock {
  version: number;
  skills: Record<string, unknown>;
}

function parseProjectLock(text: string | undefined): ProjectLock | undefined {
  try {
    const lock = JSON.parse(text ?? '') as ProjectLock;
    return typeof lock?.version === 'number' && typeof lock.skills === 'object' && lock.skills !== null
      ? lock
      : undefined;
  } catch {
    return undefined;
  }
}

/** The skills a project's lock file records, by name. */
export function lockedProjectSkills(lockText: string | undefined): Set<string> {
  return new Set(Object.keys(parseProjectLock(lockText)?.skills ?? {}));
}

/** The hash the `skills` package records for a skill folder that holds only this SKILL.md. */
function lockHash(skillText: string): string {
  const content = Buffer.from(skillText.replaceAll('\r\n', '\n'), 'utf-8');
  return createHash('sha256').update(`SKILL.md\0${content.length}\0`).update(content).digest('hex');
}

/**
 * A project's lock file once `installed` (skill name to SKILL.md text) are
 * recorded and `removed` are not, or undefined when it then records no skill
 * at all (and so should not exist). Only a dry run uses the text, to say
 * whether the file changes: the `skills` package writes the real one. An
 * unreadable lock file is returned as it is.
 */
export function plannedProjectLock(
  lockText: string | undefined,
  installed: ReadonlyMap<string, string>,
  removed: readonly string[]
): string | undefined {
  const lock = parseProjectLock(lockText) ?? (lockText === undefined ? { version: 2, skills: {} } : undefined);
  if (!lock) return lockText;
  const skills = { ...lock.skills };
  for (const name of removed) delete skills[name];
  for (const [name, text] of installed) {
    skills[name] = { source: skillsSource(), ...(skills[name] as object | undefined), computedHash: lockHash(text) };
  }
  if (Object.keys(skills).length === 0) return undefined;
  return JSON.stringify({ version: lock.version, skills }, null, 2) + '\n';
}

/**
 * The agents, by the `skills` package's ids, to install a project's skills
 * for: the shared `.agents/skills`, and each given tool the package links
 * skills for in the very folder OpenSpec does.
 */
async function projectAgents(tools: readonly AIToolOption[]): Promise<string[]> {
  const { getSupportedAgents } = await import('skills');
  const linkDirs = new Map(
    getSupportedAgents()
      .filter((agent) => !agent.universal)
      .map((agent) => [agent.id, path.normalize(agent.projectSkillsDir)])
  );
  return [
    UNIVERSAL_AGENT,
    ...tools
      .filter((tool) => linkDirs.get(AGENT_IDS[tool.value]) === path.join(tool.skillsDir ?? '', 'skills'))
      .map((tool) => AGENT_IDS[tool.value]),
  ];
}

export interface ProjectInstallInput {
  projectPath: string;
  /** Tools whose own skills folder the package may link the skills into. */
  linkedTools: readonly AIToolOption[];
  skills: readonly string[];
  /** The CLI's version: the skills published with that release are the ones installed. */
  version: string;
}

/**
 * Install OpenSpec's skills into a project's `.agents/skills`, recorded in its
 * `skills-lock.json`. Returns what failed for single skills; throws when
 * nothing could be fetched (`GitMissingError` when git is why).
 */
export async function installProjectSkills(input: ProjectInstallInput): Promise<string[]> {
  const installed = await installPublishedSkills(input.version, {
    scope: 'project',
    // The real folder, so a link the package makes reads as the one OpenSpec makes.
    cwd: realpathSync(input.projectPath),
    agents: await projectAgents(input.linkedTools),
    skills: input.skills,
  });
  return [...new Set(installed.failed.map((failure) => failure.message))];
}

/**
 * Take skills out of a project's `.agents/skills` and its lock file. Links in
 * tools' own folders are left to the caller, which knows whose they are.
 */
export async function removeLockedProjectSkills(projectPath: string, names: readonly string[]): Promise<void> {
  const { removeSkills } = await import('skills');
  await removeSkills(names, {
    cwd: realpathSync(projectPath),
    scope: 'project',
    agents: [UNIVERSAL_AGENT],
    telemetry: false,
  });
}

/**
 * Drop skills from a project's lock file without touching their folders, and
 * delete a lock file that then records no skill at all.
 */
export function dropFromProjectLock(projectPath: string, names: readonly string[]): void {
  const lockPath = projectLockPath(projectPath);
  let text: string;
  try {
    text = readFileSync(lockPath, 'utf-8');
  } catch {
    return;
  }
  const planned = plannedProjectLock(text, new Map(), names);
  if (planned === undefined) rmSync(lockPath);
  else if (lockedProjectSkills(planned).size !== lockedProjectSkills(text).size) writeFileSync(lockPath, planned);
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
  const { removeSkills } = await import('skills');
  const before = await readGlobalSkills();
  const inProfile = getSkillTemplates(input.workflows).map(({ dirName }) => dirName);
  // A skill of the same name that OpenSpec didn't install is someone's own: never replace it.
  const leftAlone = inProfile.filter((name) => before.foreign.includes(name));
  const wanted = inProfile.filter((name) => !leftAlone.includes(name));
  const added = (input.toolIds ?? []).filter(supportsGlobalSkills).map((id) => AGENT_IDS[id]);
  const agents = [...new Set([UNIVERSAL_AGENT, ...before.agents, ...added])];

  const options = { scope: 'global', telemetry: false } as const;
  const failures: string[] = [];
  // A profile with no workflows installs nothing, and only clears what was there.
  if (wanted.length > 0) {
    const installed = await installPublishedSkills(input.version, { scope: 'global', agents, skills: wanted });
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
