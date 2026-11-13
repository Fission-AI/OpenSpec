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
import { lstatSync, readdirSync, readFileSync, realpathSync, renameSync, rmSync, writeFileSync } from 'fs';
import { spawnSync } from 'child_process';
import { createHash } from 'crypto';
import { AI_TOOLS, OPENSPEC_SKILL_NAMES, type AIToolOption } from './config.js';
import { sharedSkillTexts } from './shared/own-skill-texts.js';
import { classifySkillFile } from './shared/skill-links.js';
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
      "Fetching OpenSpec's skills needs git, and it isn't on your PATH. " +
        'Install git (https://git-scm.com/downloads) and run this again.'
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

/**
 * Agents the package calls universal, because in a project they read
 * `.agents/skills`, but that it gives a folder of their own for a global
 * install. A test installs for every covered tool and fails if this list and
 * the package disagree.
 */
const OWN_GLOBAL_FOLDER: ReadonlySet<string> = new Set(['antigravity', 'antigravity-cli']);

/** Whether a global install writes into this agent's own folder, and not only the shared one. */
function keepsOwnGlobalFolder(agent: { id: string; universal: boolean }): boolean {
  return !agent.universal || OWN_GLOBAL_FOLDER.has(agent.id);
}

/** The files a published skill folder holds. A test fails when the published skills gain another. */
const PUBLISHED_FILES: ReadonlySet<string> = new Set(['SKILL.md']);
/** Files the system drops into any folder: not the user's work. */
const SYSTEM_FILES: ReadonlySet<string> = new Set(['.DS_Store', 'Thumbs.db', 'desktop.ini']);

/**
 * Whether a skill folder holds anything OpenSpec didn't publish. The package
 * replaces a folder whole, so such a folder is the user's to keep.
 */
function holdsOtherFiles(dir: string): boolean {
  try {
    return readdirSync(dir).some((entry) => !PUBLISHED_FILES.has(entry) && !SYSTEM_FILES.has(entry));
  } catch {
    return false;
  }
}

function isLink(entry: string): boolean {
  try {
    return lstatSync(entry).isSymbolicLink();
  } catch {
    return false;
  }
}

/** Where the package keeps the one copy of every global skill. */
function sharedGlobalDir(): string {
  return path.join(os.homedir(), '.agents', 'skills');
}

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

/** Whether the skills can be fetched at all: a repository source takes git. */
export function canFetchSkills(): boolean {
  return !sourceNeedsGit(skillsSource()) || spawnSync('git', ['--version'], { stdio: 'ignore' }).status === 0;
}

function sameFolder(one: string, other: string | undefined): boolean {
  if (other === undefined) return false;
  try {
    return realpathSync.native(one) === realpathSync.native(other);
  } catch {
    return false;
  }
}

/**
 * Whether the lock file says a skill came from OpenSpec's own source. One from
 * anywhere else, or with no record at all, is someone's own and stays theirs.
 */
function isOurSource(source: string | undefined): boolean {
  if (source === undefined) return false;
  const ours = skillsSource();
  if (!sourceNeedsGit(ours)) return path.resolve(source) === path.resolve(ours);
  // The lock file records a GitHub source as owner/repo, however it was given.
  const repo = (value: string) =>
    value
      .trim()
      .replace(/^(?:https?:\/\/|git@)github\.com[/:]/i, '')
      .replace(/\.git$/i, '')
      .replace(/\/+$/, '')
      .toLowerCase();
  return repo(source) === repo(ours);
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
    // Any other failure (no connection, say) must not quietly install another release's skills.
    const tagMissing =
      isDiagnostic(error, 'SKILLS_GIT_CLONE_FAILED') && /Remote branch \S+ not found/i.test(String(error.message));
    if (!tagMissing) throw error;
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
 * at all (and so should not exist). A dry run uses it to say whether the
 * file changes, and a removal writes it; the `skills` package writes the
 * entries for what it installs. An unreadable lock file is returned as it is.
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
  // Only a lock file this call changed is rewritten or removed.
  if (lockedProjectSkills(planned).size === lockedProjectSkills(text).size) return;
  if (planned === undefined) rmSync(lockPath);
  else writeFileSync(lockPath, planned);
}

/**
 * Record the text OpenSpec wrote for skills the package already has in a
 * project's lock file, so its hash matches what is on disk.
 */
export function rehashProjectLock(projectPath: string, written: ReadonlyMap<string, string>): void {
  const lockPath = projectLockPath(projectPath);
  let text: string;
  try {
    text = readFileSync(lockPath, 'utf-8');
  } catch {
    return;
  }
  const recorded = lockedProjectSkills(text);
  const known = new Map([...written].filter(([name]) => recorded.has(name)));
  if (known.size === 0) return;
  const planned = plannedProjectLock(text, known, []);
  if (planned !== undefined && planned !== text) writeFileSync(lockPath, planned);
}

export interface GlobalSkills {
  /** OpenSpec's skills installed for this machine. */
  skills: string[];
  /** Agents, by the `skills` package's ids, that reach them through a link in their own folder. */
  agents: string[];
  /** Skills with an OpenSpec name and someone else's text, that nothing records as OpenSpec's. */
  foreign: Array<{ name: string; path: string; agents: readonly string[] }>;
  /** Where each of OpenSpec's skills sits. */
  paths: Map<string, string>;
}

export async function readGlobalSkills(): Promise<GlobalSkills> {
  const { getSupportedAgents, listSkills } = await import('skills');
  const { skills } = await listSkills({ scope: 'global' });
  const named = skills.filter((skill) => (OPENSPEC_SKILL_NAMES as readonly string[]).includes(skill.name));
  const ours = named.filter((skill) => isOurSource(skill.source));
  const supported = getSupportedAgents();
  const agentDirs = new Map(supported.map((agent) => [agent.id, agent.globalSkillsDir]));
  const ownFolder = new Set(supported.filter(keepsOwnGlobalFolder).map((agent) => agent.id));
  const covered = new Set(Object.values(AGENT_IDS));
  // The package reports an agent for any folder of that name. A tool this
  // install was set up for holds, for one of these skills, a link to the
  // shared copy or a copy with OpenSpec's text: the package copies when a
  // tool is the only one installed for, and where it can't link.
  // A copy counts only for a tool the global install covers and writes a
  // folder for, so MiniMax Code's copies, which its project install keeps,
  // never do. A folder with the user's own text, or with no skill in it,
  // never makes a tool one of ours, and is never replaced.
  const linked = (agent: string): boolean => {
    const dir = agentDirs.get(agent);
    // A tool whose folder is the shared one needs nothing of its own.
    if (!dir || sameFolder(dir, sharedGlobalDir())) return false;
    const entries = ours.map((skill) => path.join(dir, skill.name));
    if (!ownFolder.has(agent) || !covered.has(agent)) {
      // Any other tool counts by its links alone, and not at all once it holds a real folder.
      const present = entries.filter((entry) => {
        try {
          lstatSync(entry);
          return true;
        } catch {
          return false;
        }
      });
      return present.length > 0 && present.every(isLink);
    }
    return entries.some((entry, index) => {
      if (isLink(entry)) return true;
      const spot = classifySkillFile(entry, sharedSkillTexts(ours[index].name));
      return spot === 'copy' || spot === 'released';
    });
  };
  // The package names one agent per folder, and which one depends on what
  // else is on the machine (Antigravity's folder can come back under its
  // CLI's id). Every covered tool with a folder of its own is looked at directly.
  const candidates = new Set([
    ...ours.flatMap((skill) => [...skill.agents]),
    ...[...covered].filter((agent) => ownFolder.has(agent)),
  ]);
  return {
    skills: ours.map((skill) => skill.name),
    agents: [...candidates].filter(linked),
    foreign: named
      .filter((skill) => !isOurSource(skill.source) && classifySkillFile(skill.path, sharedSkillTexts(skill.name)) === 'user')
      .map((skill) => ({ name: skill.name, path: skill.path, agents: skill.agents })),
    paths: new Map(ours.map((skill) => [skill.name, skill.path])),
  };
}

export interface GlobalInstallInput {
  /** Tools to add. The tools already set up are always kept and refreshed. */
  toolIds?: readonly string[];
  workflows: readonly string[];
  /** The CLI's version: the skills published with that release are the ones installed. */
  version: string;
  /** Fetch and install even when what is there already matches. */
  force?: boolean;
  /** Only work out whether anything would change; fetch and write nothing. */
  dryRun?: boolean;
}

export interface GlobalInstallResult {
  skills: string[];
  /** Agents the skills are now installed for, by the `skills` package's ids. */
  agents: string[];
  removedSkills: string[];
  /** Skills left alone because something other than OpenSpec installed them. */
  leftAlone: string[];
  /** Skills OpenSpec installed that the user had edited, and that this run replaces. */
  replacedEdits: string[];
  /** True when the installed skills already matched and nothing was fetched. */
  unchanged: boolean;
  failures: string[];
}

/**
 * Install OpenSpec's skills for this machine, or refresh the ones there.
 * Reinstalling is the update: the `skills` package replaces what it finds.
 * Skills that already hold this version's text are left as they are.
 */
export async function installGlobalSkills(input: GlobalInstallInput): Promise<GlobalInstallResult> {
  const { getSupportedAgents, removeSkills } = await import('skills');
  const before = await readGlobalSkills();
  const supported = getSupportedAgents();
  // The agents that read the shared folder and get nothing of their own.
  const universal = new Set(supported.filter((agent) => !keepsOwnGlobalFolder(agent)).map((agent) => agent.id));
  universal.add(UNIVERSAL_AGENT);
  const inProfile = getSkillTemplates(input.workflows).map(({ dirName }) => dirName);
  const added = (input.toolIds ?? []).filter(supportsGlobalSkills).map((id) => AGENT_IDS[id]);
  const agents = [...new Set([UNIVERSAL_AGENT, ...before.agents, ...added])];
  // A skill of the same name with someone else's text, in a folder this
  // install writes to, is the user's own: never replace it.
  // One that only a tool outside this install holds (MiniMax Code's own copies, say) is not in the way.
  const inTheWay = before.foreign.filter(
    (skill) => skill.agents.length === 0 || skill.agents.some((agent) => universal.has(agent) || agents.includes(agent))
  );
  // So is a folder of that name in the shared folder holding files OpenSpec
  // didn't publish, with or without a skill beside them: the package lists
  // only skills, and replaces a folder whole.
  const sharedFolderIsUsers = (name: string): boolean => {
    const entry = path.join(sharedGlobalDir(), name);
    try {
      return lstatSync(entry).isDirectory() && holdsOtherFiles(entry);
    } catch {
      return false;
    }
  };
  const blocked = inProfile.filter(
    (name) => inTheWay.some((skill) => skill.name === name) || sharedFolderIsUsers(name)
  );
  const wanted = inProfile.filter((name) => !blocked.includes(name));
  // The package lists a skill once however many folders hold it, so a tool's
  // own folder is checked directly: a real folder there with someone else's
  // text is the user's, even when the shared copy is OpenSpec's.
  const agentDirs = new Map(supported.map((agent) => [agent.id, agent.globalSkillsDir]));
  const holdsLinks = (agent: string): boolean =>
    before.skills.some((name) => isLink(path.join(agentDirs.get(agent) ?? '', name)));
  const entryIn = (agent: string, name: string): 'missing' | 'ours' | 'theirs' => {
    const entry = path.join(agentDirs.get(agent) ?? '', name);
    try {
      if (lstatSync(entry).isSymbolicLink()) return 'ours';
    } catch {
      return 'missing';
    }
    // A folder with the user's files beside the skill is theirs to keep.
    if (holdsOtherFiles(entry)) return 'theirs';
    // `npx skills add --global` for one tool keeps each skill in that tool's
    // folder and nowhere else, so there the folder the package recorded is
    // OpenSpec's install, edited or not. Only in that shape: a tool that
    // holds links has its skills in the shared folder, and a real folder
    // beside them is the user's.
    if (before.agents.includes(agent) && !holdsLinks(agent) && sameFolder(entry, before.paths.get(name))) return 'ours';
    // Otherwise only OpenSpec's own text is OpenSpec's: a folder with other text, or with no skill in it, is the user's.
    const spot = classifySkillFile(entry, sharedSkillTexts(name));
    return spot === 'copy' || spot === 'released' ? 'ours' : 'theirs';
  };
  const isDir = (dir: string | null | undefined): dir is string => typeof dir === 'string';
  const linkedAgents = agents.filter((agent) => {
    const dir = agentDirs.get(agent);
    return !universal.has(agent) && isDir(dir) && !sameFolder(dir, sharedGlobalDir());
  });
  const heldBy = new Map(
    linkedAgents.map((agent) => [agent, wanted.filter((name) => entryIn(agent, name) === 'theirs')] as const)
  );
  const leftAlone = [...new Set([...blocked, ...[...heldBy.values()].flat()])];
  const removedSkills = before.skills.filter((name) => !inProfile.includes(name));
  // The package replaces what it finds, so an edit inside one of OpenSpec's
  // own skills goes, as does one in a skill the profile dropped. Named, so
  // the user can recover it and knows where it went. Only a folder this run
  // writes to counts: the shared folder, and the folder of a tool this
  // install is set up for. A copy the package recorded in the folder of a
  // tool that isn't set up is left as it is.
  const writtenDirs = [sharedGlobalDir(), ...linkedAgents.map((agent) => agentDirs.get(agent)).filter(isDir)];
  const skillText = (name: string): string | undefined => {
    try {
      return readFileSync(path.join(before.paths.get(name)!, 'SKILL.md'), 'utf8');
    } catch {
      return undefined;
    }
  };
  const replacedEdits = [...wanted, ...removedSkills].filter((name) => {
    const dir = before.paths.get(name);
    return (
      dir !== undefined &&
      writtenDirs.some((written) => sameFolder(path.dirname(dir), written)) &&
      classifySkillFile(dir, sharedSkillTexts(name)) === 'user'
    );
  });
  const editedText = new Map(replacedEdits.map((name) => [name, skillText(name)] as const));
  const result = { skills: wanted, agents, removedSkills, leftAlone, replacedEdits };

  if (inProfile.length > 0 && wanted.length === 0) {
    return {
      ...result,
      unchanged: true,
      failures: [
        `every skill in your profile is already in your home folder from somewhere else (${leftAlone.join(', ')}). ` +
          "Remove them to let OpenSpec install its own",
      ],
    };
  }

  const newAgent = added.some((agent) => !universal.has(agent) && !before.agents.includes(agent));
  const current = wanted.every((name) => {
    const dir = before.paths.get(name);
    return dir !== undefined && classifySkillFile(dir, publishedSkillText(name, input.version)) === 'copy';
  });
  // Every tool set up must still reach every skill: a deleted link is put
  // back, and a copy counts only while it holds the current text.
  const reaches = (agent: string, name: string): boolean => {
    const entry = path.join(agentDirs.get(agent) ?? '', name);
    try {
      if (lstatSync(entry).isSymbolicLink()) return true;
    } catch {
      return false;
    }
    return classifySkillFile(entry, publishedSkillText(name, input.version)) === 'copy';
  };
  const linksComplete = linkedAgents.every((agent) =>
    wanted.every((name) => heldBy.get(agent)!.includes(name) || reaches(agent, name))
  );
  if (!input.force && current && linksComplete && !newAgent && removedSkills.length === 0) {
    return { ...result, unchanged: true, failures: [] };
  }
  if (input.dryRun) return { ...result, unchanged: false, failures: [] };

  const options = { scope: 'global', telemetry: false } as const;
  const failures: string[] = [];
  // A profile with no workflows installs nothing, and only clears what was there.
  if (wanted.length > 0) {
    // A tool that holds a skill of its own is installed for separately, without that skill.
    const withOwn = linkedAgents.filter((agent) => heldBy.get(agent)!.length > 0);
    const installs: Array<[string[], string[]]> = [[agents.filter((agent) => !withOwn.includes(agent)), wanted]];
    for (const agent of withOwn) {
      // With the shared folder, so the tool is linked to the one copy where the package links.
      installs.push([[UNIVERSAL_AGENT, agent], wanted.filter((name) => !heldBy.get(agent)!.includes(name))]);
    }
    for (const [index, [forAgents, skills]] of installs.entries()) {
      if (skills.length === 0) continue;
      try {
        const installed = await installPublishedSkills(input.version, { scope: 'global', agents: forAgents, skills });
        failures.push(...installed.failed.map((failure) => failure.message));
      } catch (error) {
        // Nothing is written before the first install, so that failure is the
        // caller's to report. A later one comes after skills were replaced:
        // it is listed, and what was replaced is still reported below.
        if (index === 0) throw error;
        failures.push(describeSkillsError(error));
        break;
      }
    }
  }
  if (removedSkills.length > 0 && failures.length === 0) {
    // The package removes a skill from every tool's folder, whatever is in
    // it. A folder of that name holding anything but OpenSpec's text is the
    // user's: it steps aside for the removal and comes straight back. Only
    // the folder the package recorded for the skill, in a folder this install
    // writes to, is OpenSpec's to remove whatever it holds, and an edit there
    // was named above.
    const aside: Array<[string, string]> = [];
    const keptName = (name: string) => `.${name}.kept-`;
    try {
      for (const dir of new Set([...agentDirs.values()].filter(isDir))) {
        for (const name of removedSkills) {
          const entry = path.join(dir, name);
          // One a run that was cut short left behind goes back first, if its place is free.
          for (const left of leftovers(dir, keptName(name))) {
            try {
              lstatSync(entry);
              failures.push(`your own ${name} from an earlier run is still at ${left}`);
            } catch {
              renameSync(left, entry);
            }
          }
          try {
            if (!lstatSync(entry).isDirectory()) continue;
          } catch {
            continue;
          }
          const recorded =
            sameFolder(entry, before.paths.get(name)) && writtenDirs.some((written) => sameFolder(dir, written));
          // A folder with the user's files beside the skill is kept whoever installed the skill.
          if (!holdsOtherFiles(entry)) {
            if (recorded) continue;
            const spot = classifySkillFile(entry, sharedSkillTexts(name));
            if (spot === 'copy' || spot === 'released') continue;
          }
          const kept = path.join(dir, `${keptName(name)}${process.pid}`);
          // If it can't step aside, nothing is removed this run.
          renameSync(entry, kept);
          aside.push([kept, entry]);
        }
      }
      const removed = await removeSkills(removedSkills, options);
      failures.push(...removed.failed.map((failure) => failure.message));
    } catch (error) {
      failures.push(describeSkillsError(error));
    } finally {
      for (const [kept, entry] of aside) {
        try {
          renameSync(kept, entry);
        } catch {
          failures.push(`your own ${path.basename(entry)} could not be put back: it is at ${kept}`);
        }
      }
    }
  }

  // Only the edits that are really gone: an install that failed partway may have left some.
  // Told by the text itself, so it holds when the skill was removed or made a link.
  const replaced = replacedEdits.filter((name) => skillText(name) !== editedText.get(name));
  return { ...result, replacedEdits: replaced, unchanged: false, failures: [...new Set(failures)] };
}

/** Folders in `dir` whose name starts with `prefix`. */
function leftovers(dir: string, prefix: string): string[] {
  try {
    return readdirSync(dir)
      .filter((entry) => entry.startsWith(prefix))
      .map((entry) => path.join(dir, entry));
  } catch {
    return [];
  }
}

/** The text this CLI publishes for a skill: what a current install holds. */
function publishedSkillText(name: string, version: string): string[] {
  return sharedSkillTexts(name, version).filter((text) => !/^ {2}generatedBy: /m.test(text));
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
    `Left ${leftAlone.join(', ')} in your home folder alone: ${one ? 'it holds' : 'they hold'} text or files that aren't OpenSpec's. ` +
    `Move ${one ? 'it' : 'them'} away to get OpenSpec's own.`
  );
}

/**
 * What to tell the user about edits a global refresh replaces, in the words
 * a project update uses for the same thing. `done` is false in a dry run.
 */
export function describeReplacedEdits(names: readonly string[], done = true): string | undefined {
  if (names.length === 0) return undefined;
  const one = names.length === 1;
  return (
    `${done ? 'Replaced' : 'Update will replace'} your edits in ${names.length} skill${one ? '' : 's'} OpenSpec installs for this machine: ` +
    `${names.join(', ')}. OpenSpec refreshes ${one ? 'this skill' : 'these skills'} on every update and keeps no copy. ` +
    `${done ? 'Keep' : 'Save your text first, and keep'} lasting changes in a skill of your own under another name.`
  );
}
