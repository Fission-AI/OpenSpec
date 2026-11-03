/**
 * Machine setup: install OpenSpec's skills once per machine instead of once
 * per project, under the SKILL_NAMESPACE (`openspec-beta`) router layout.
 *
 * - Claude Code gets an `openspec-beta` plugin, so the skills appear as
 *   `/openspec-beta:propose`, `/openspec-beta:apply`, and so on. The plugin
 *   lives in OpenSpec's data directory and is registered as a local
 *   marketplace; Claude Code loads it in place, so a refresh only rewrites it.
 * - Agents that read the shared user folder `~/.agents/skills` (Codex, Gemini
 *   CLI, OpenCode, Cursor, and others) get `openspec-beta` and
 *   `openspec-beta-<workflow>` there.
 * - Setup moves what an older OpenSpec wrote into a backup with a manifest;
 *   `revertMachineSetup` moves it back.
 */
import chalk from 'chalk';
import { spawnSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { createRequire } from 'node:module';

import { getGlobalConfig, getGlobalDataDir, saveGlobalConfig } from './global-config.js';
import { ALL_WORKFLOWS, getProfileWorkflows } from './profiles.js';
import { FileSystemUtils } from '../utils/file-system.js';
import {
  SKILL_NAMESPACE,
  WORKFLOW_ORDER,
  hasLayoutMarker,
  generateOpenSpecSkillSet,
  workflowSkillName,
  type GeneratedSkill,
} from './shared/openspec-skill.js';
import { AI_TOOLS } from './config.js';
import { CommandAdapterRegistry } from './command-generation/registry.js';
import { getBetaSkillTemplates, type GeneratedSkillFile } from './shared/skill-generation.js';

const require = createRequire(import.meta.url);
const { version: OPENSPEC_VERSION } = require('../../package.json');

export const PLUGIN_NAME = SKILL_NAMESPACE;
export const MARKETPLACE_NAME = `${SKILL_NAMESPACE}-local`;

/** An agent found on this machine, and how OpenSpec reaches it. */
export interface MachineAgent {
  id: string;
  name: string;
  route: 'claude-plugin' | 'shared-skills';
}

/**
 * Agents that read `~/.agents/skills`, with the user-level folder each one
 * creates. Claude Code does not read that folder; it gets the plugin.
 */
const SHARED_SKILL_AGENTS: ReadonlyArray<{ id: string; name: string; marker: string }> = [
  { id: 'codex', name: 'Codex', marker: '.codex' },
  { id: 'gemini', name: 'Gemini CLI', marker: '.gemini' },
  { id: 'opencode', name: 'OpenCode', marker: '.config/opencode' },
  { id: 'cursor', name: 'Cursor', marker: '.cursor' },
  { id: 'github-copilot', name: 'GitHub Copilot', marker: '.copilot' },
  { id: 'amp', name: 'Amp', marker: '.config/amp' },
  { id: 'qwen', name: 'Qwen Code', marker: '.qwen' },
  { id: 'crush', name: 'Crush', marker: '.config/crush' },
  { id: 'goose', name: 'Goose', marker: '.config/goose' },
  { id: 'cline', name: 'Cline', marker: '.cline' },
  { id: 'kilocode', name: 'Kilo Code', marker: '.kilocode' },
];

export interface MachineSetupOptions {
  homedir?: string;
  env?: NodeJS.ProcessEnv;
  /** Runs `claude <args>`; injectable so tests never touch a real install. */
  runClaude?: (args: string[]) => { ok: boolean; output: string };
  /** Register the Claude plugin. A refresh skips this: the plugin loads in place. */
  register?: boolean;
  dryRun?: boolean;
  /**
   * Move the skills an older OpenSpec wrote into a backup. `openspec setup`
   * does; the refresh `openspec update` runs does not.
   */
  migrate?: boolean;
  /** A project whose OpenSpec-written skills the migration also moves. */
  projectPath?: string;
}

/** One folder the migration moved, and where it went. */
export interface MovedSkill {
  from: string;
  to: string;
}

export interface MachineSetupResult {
  agents: MachineAgent[];
  workflows: string[];
  claudePlugin?: {
    dir: string;
    registered: boolean;
    /** Why registration failed, and the commands that finish it by hand. */
    error?: string;
    manualCommands: string[];
  };
  sharedSkills?: { dir: string; installed: string[]; removed: string[] };
  /** Older OpenSpec skills the migration moved (or, on a dry run, would move). */
  moved: MovedSkill[];
  /** Where they were moved, with a manifest `--revert` reads. */
  backupDir?: string;
}

/** The user's home, from the environment first so a sandboxed HOME is honored. */
function resolveHome(env: NodeJS.ProcessEnv): string {
  return (process.platform === 'win32' ? env.USERPROFILE : env.HOME) || os.homedir();
}

function claudeConfigDir(home: string, env: NodeJS.ProcessEnv): string {
  return env.CLAUDE_CONFIG_DIR || path.join(home, '.claude');
}

function sharedSkillsDir(home: string): string {
  return path.join(home, '.agents', 'skills');
}

/**
 * `claude plugin uninstall` leaves its copy of the plugin in
 * `plugins/cache/<marketplace>/`, marked with `.orphaned_at` and never pruned,
 * so a revert otherwise leaves our skill files on disk for good. Remove only
 * our own marketplace folder, and only once Claude Code has marked it orphaned:
 * without that marker the cache is still in use and is not ours to delete.
 */
async function removeOrphanedPluginCache(configDir: string, pluginName: string): Promise<void> {
  const marketplace = path.join(configDir, 'plugins', 'cache', `${pluginName}-local`);
  if (!fs.existsSync(marketplace)) return;
  // A folder counts as orphaned when it carries the marker, or when it holds
  // at least one subfolder and every one of those is orphaned. A leaf without
  // the marker is a live cache, so an empty `every()` must not vouch for it.
  const orphaned = (dir: string): boolean => {
    if (fs.existsSync(path.join(dir, '.orphaned_at'))) return true;
    const children = fs
      .readdirSync(dir, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => path.join(dir, entry.name));
    return children.length > 0 && children.every(orphaned);
  };
  try {
    if (orphaned(marketplace)) await fs.promises.rm(marketplace, { recursive: true, force: true });
  } catch {
    // Claude Code's cache is its own; failing to tidy it never fails a revert.
  }
}

export function getClaudePluginDir(env: NodeJS.ProcessEnv = process.env, home = resolveHome(env)): string {
  return path.join(getGlobalDataDir({ env, homedir: home }), 'claude-plugin');
}

/** Finds the agents installed on this machine from the folders they create. */
export function detectMachineAgents(options: Pick<MachineSetupOptions, 'homedir' | 'env'> = {}): MachineAgent[] {
  const env = options.env ?? process.env;
  const home = options.homedir ?? resolveHome(env);
  const agents: MachineAgent[] = [];
  if (fs.existsSync(claudeConfigDir(home, env))) {
    agents.push({ id: 'claude', name: 'Claude Code', route: 'claude-plugin' });
  }
  for (const agent of SHARED_SKILL_AGENTS) {
    if (fs.existsSync(path.join(home, agent.marker))) {
      agents.push({ id: agent.id, name: agent.name, route: 'shared-skills' });
    }
  }
  return agents;
}

function defaultRunClaude(env: NodeJS.ProcessEnv) {
  // Windows installs `claude.cmd`, which only a shell can run. The only
  // non-literal argument is OpenSpec's own data directory, quoted.
  const shell = process.platform === 'win32';
  return (args: string[]) => {
    // `cmd` expands `%VAR%` even inside double quotes and a command line has
    // no escape for it, so a path holding `%` cannot be passed through safely.
    // Say so instead of running a command that means something else.
    if (shell && args.some((arg) => arg.includes('%'))) {
      return {
        ok: false,
        output:
          'Cannot run `claude` with a path containing "%" on Windows: cmd.exe would expand it. ' +
          'Set XDG_DATA_HOME to a path without "%", or register the plugin by hand.',
      };
    }
    const result = spawnSync('claude', shell ? args.map(quote) : args, {
      encoding: 'utf8',
      env,
      timeout: 60_000,
      shell,
    });
    const output = `${result.stdout ?? ''}${result.stderr ?? ''}`.trim();
    if (result.error) return { ok: false, output: result.error.message };
    return { ok: result.status === 0, output };
  };
}

/**
 * Characters `cmd.exe` acts on rather than passes through. Double quotes
 * neutralise all of them, so an argument holding any one must be quoted: a
 * data directory under a user name like `a&b` would otherwise end the command
 * at the `&` and run the rest as a second one. `%` is the exception and is
 * handled by its caller, since `cmd` expands `%VAR%` inside quotes too.
 */
const CMD_METACHARACTERS = /[\s"&|<>^()!,;=]/;

/**
 * Quotes one argument for a Windows command line (CommandLineToArgvW rules):
 * backslashes are literal except before a quote, so those, and any trailing
 * run before the closing quote, are doubled.
 */
function quote(arg: string): string {
  if (!CMD_METACHARACTERS.test(arg)) return arg;
  const escaped = arg.replace(/(\\*)"/g, '$1$1\\"').replace(/(\\+)$/, '$1$1');
  return `"${escaped}"`;
}

function readSkill(skillDir: string): string {
  const skillFile = path.join(skillDir, 'SKILL.md');
  return fs.existsSync(skillFile) ? fs.readFileSync(skillFile, 'utf8') : '';
}

/** A skill folder OpenSpec generated: its SKILL.md records `generatedBy`. */
function isOurs(skillDir: string): boolean {
  return /^\s+generatedBy: /m.test(readSkill(skillDir));
}

/** A skill folder this setup wrote: generated, in the namespace, with the layout marker. */
function isCurrentLayout(skillDir: string): boolean {
  const skill = readSkill(skillDir);
  return /^\s+generatedBy: /m.test(skill) && hasLayoutMarker(skill);
}

async function writeFiles(root: string, skillDir: string, files: readonly GeneratedSkillFile[]): Promise<void> {
  for (const file of files) {
    const target = path.join(skillDir, file.relativePath);
    FileSystemUtils.assertPathWithin(root, target);
    await FileSystemUtils.writeFile(target, file.content);
  }
}

/** Writes each skill under `dir`, replacing any copy OpenSpec wrote before. */
async function writeSkillSet(dir: string, skills: readonly GeneratedSkill[]): Promise<void> {
  for (const skill of skills) {
    const skillDir = path.join(dir, skill.dirName);
    if (isOurs(skillDir)) await fs.promises.rm(skillDir, { recursive: true, force: true });
    await writeFiles(dir, skillDir, skill.files);
  }
}

/** Writes the Claude Code plugin into `dir`: the router and one thin skill per workflow. */
export async function writeClaudePlugin(dir: string, workflows: readonly string[]): Promise<void> {
  // The plugin folder belongs to OpenSpec, so it is rebuilt whole. Thin skills
  // are named bare (`propose`): the plugin namespaces them as `/openspec:propose`.
  for (const sub of ['skills', 'commands']) {
    await fs.promises.rm(path.join(dir, sub), { recursive: true, force: true });
  }
  await writeSkillSet(
    path.join(dir, 'skills'),
    generateOpenSpecSkillSet({
      workflows,
      version: OPENSPEC_VERSION,
      skillName: (id) => id,
      invoke: (id) => `/${PLUGIN_NAME}:${id}`,
    })
  );

  const manifestDir = path.join(dir, '.claude-plugin');
  await fs.promises.mkdir(manifestDir, { recursive: true });
  const description = 'OpenSpec skills: write and maintain specs, and propose, apply, verify, and archive changes';
  await fs.promises.writeFile(
    path.join(manifestDir, 'plugin.json'),
    `${JSON.stringify({ name: PLUGIN_NAME, version: OPENSPEC_VERSION, description }, null, 2)}\n`
  );
  await fs.promises.writeFile(
    path.join(manifestDir, 'marketplace.json'),
    `${JSON.stringify(
      {
        name: MARKETPLACE_NAME,
        owner: { name: 'OpenSpec' },
        plugins: [{ name: PLUGIN_NAME, source: './', description }],
      },
      null,
      2
    )}\n`
  );
}

function inNamespace(name: string): boolean {
  return name === SKILL_NAMESPACE || name.startsWith(`${SKILL_NAMESPACE}-`);
}

/** Skill folders in `dir` this setup wrote: the namespace's router and workflow skills. */
function namespaceSkillDirs(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && (entry.name === SKILL_NAMESPACE || entry.name.startsWith(`${SKILL_NAMESPACE}-`)))
    .map((entry) => entry.name)
    .filter((name) => isCurrentLayout(path.join(dir, name)));
}

/**
 * What the new skills replace or would sit on top of: `openspec` and
 * `openspec-*` skill folders an older OpenSpec wrote (SKILL.md records
 * `generatedBy`, no layout marker) in the machine's shared folders and, when
 * given, a project's tool folders; that project's generated `/opsx` command
 * files, which would otherwise offer every workflow a second time; and any
 * other entry under the namespace's names in the machine folders.
 */
function findOlderFiles(
  home: string,
  env: NodeJS.ProcessEnv,
  installing: ReadonlySet<string>,
  projectPath?: string
): string[] {
  const machineRoots = [sharedSkillsDir(home), path.join(claudeConfigDir(home, env), 'skills')];
  const roots = new Set(machineRoots);
  if (projectPath) {
    for (const tool of AI_TOOLS) {
      if (tool.skillsDir) roots.add(path.join(projectPath, tool.skillsDir, 'skills'));
    }
  }
  const found: string[] = [];
  for (const root of roots) {
    if (!fs.existsSync(root)) continue;
    for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
      if (!entry.isDirectory() || !/^openspec(-|$)/.test(entry.name)) continue;
      const dir = path.join(root, entry.name);
      // Skills from an earlier namespace (say openspec-beta, after a rename)
      // carry the layout marker too, so the namespace decides what is current.
      if (isOurs(dir) && !(inNamespace(entry.name) && isCurrentLayout(dir))) found.push(dir);
    }
  }
  // A copy of these skills this setup did not write - from `npx skills add`,
  // or its symlink - is in the way and goes into the backup too, never
  // deleted. Two things mark one: it sits on a name this install writes, or it
  // carries the layout marker, which only these generated skills have (the
  // committed `skills/` mirror has the marker but no `generatedBy`, so the
  // marker is what recognises an npx copy of a workflow we do not install).
  // A skill of the user's own that merely shares the prefix has neither, and
  // is none of our business to move.
  for (const root of machineRoots) {
    if (!fs.existsSync(root)) continue;
    const entries = fs.readdirSync(root, { withFileTypes: true });
    for (const entry of entries) {
      if (!inNamespace(entry.name)) continue;
      const dir = path.join(root, entry.name);
      if (isCurrentLayout(dir)) continue;
      if (installing.has(entry.name) || hasLayoutMarker(readSkill(dir))) found.push(dir);
    }
    // On a case-insensitive filesystem (macOS, Windows) a folder spelled
    // `OpenSpec-Beta` answers to the name we write, so the write would land
    // inside it and overwrite its SKILL.md with no backup. The filesystem
    // proves the clash: our name resolves while nothing is spelled that way.
    // Matching case-insensitively instead would wrongly claim a genuinely
    // separate folder on Linux, where both names can coexist.
    const spelled = new Set(entries.map((entry) => entry.name));
    for (const name of installing) {
      if (spelled.has(name) || !fs.existsSync(path.join(root, name))) continue;
      const real = [...spelled].find((other) => other.toLowerCase() === name.toLowerCase());
      if (real !== undefined) found.push(path.join(root, real));
    }
  }
  if (projectPath) {
    for (const adapter of CommandAdapterRegistry.getAll()) {
      for (const workflow of ALL_WORKFLOWS) {
        const relative = adapter.getFilePath(workflow);
        if (path.isAbsolute(relative)) continue;
        const file = FileSystemUtils.resolveProjectArtifactPath(projectPath, relative);
        if (fs.existsSync(file) && fs.statSync(file).isFile()) found.push(file);
      }
    }
  }
  return [...new Set(found)];
}

/**
 * Whether anything is at `target`, including a symlink whose target is gone.
 * A relative symlink moved into the backup dangles there, and existsSync
 * would report it missing, so revert would skip it and then delete it.
 */
function pathExists(target: string): boolean {
  try {
    fs.lstatSync(target);
    return true;
  } catch {
    return false;
  }
}

const MANIFEST = 'manifest.json';

/** Moves each folder or file into `backupDir` and records where it came from. */
async function backUp(folders: readonly string[], backupDir: string): Promise<MovedSkill[]> {
  const moved: MovedSkill[] = [];
  if (folders.length === 0) return moved;
  await fs.promises.mkdir(backupDir, { recursive: true });
  for (const [index, from] of folders.entries()) {
    const to = path.join(backupDir, `${index + 1}-${path.basename(from)}`);
    await move(from, to);
    moved.push({ from, to });
    // Written after every move, so an interrupted setup can still be reverted.
    // Written to a temporary file and renamed, so an interruption mid-write
    // leaves the previous complete manifest rather than a truncated one: the
    // revert reads this to put folders back, and cannot guess at half a list.
    const manifest = path.join(backupDir, MANIFEST);
    const body = `${JSON.stringify(moved, null, 2)}\n`;
    const pending = `${manifest}.tmp`;
    try {
      await fs.promises.writeFile(pending, body);
      await fs.promises.rename(pending, manifest);
    } catch {
      // A rename can fail where the temporary file and the manifest are not on
      // one device. Write in place instead: less safe against an interruption,
      // which the revert now survives anyway, and better than no manifest.
      await fs.promises.rm(pending, { force: true });
      await fs.promises.writeFile(manifest, body);
    }
  }
  return moved;
}

/**
 * Moves a file, folder, or symlink. A rename cannot cross disks (a project on
 * another drive than the data directory), so that case copies, then removes.
 */
async function move(from: string, to: string): Promise<void> {
  try {
    await fs.promises.rename(from, to);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'EXDEV') throw error;
    await fs.promises.cp(from, to, { recursive: true, verbatimSymlinks: true, errorOnExist: true, force: false });
    await fs.promises.rm(from, { recursive: true, force: true });
  }
}

async function writeSharedSkills(
  dir: string,
  workflows: readonly string[],
  codexPresent: boolean
): Promise<{ installed: string[]; removed: string[] }> {
  const skills = generateOpenSpecSkillSet({
    workflows,
    version: OPENSPEC_VERSION,
    skillName: workflowSkillName,
    invoke: (id) =>
      codexPresent ? `/${workflowSkillName(id)} ($${workflowSkillName(id)} in Codex)` : `/${workflowSkillName(id)}`,
  });
  const installed = skills.map((skill) => skill.dirName);

  // A workflow the user turned off leaves its skill behind; remove it.
  const removed: string[] = [];
  for (const name of namespaceSkillDirs(dir)) {
    if (installed.includes(name)) continue;
    await fs.promises.rm(path.join(dir, name), { recursive: true, force: true });
    removed.push(name);
  }
  await writeSkillSet(dir, skills);
  return { installed, removed };
}

/**
 * Installs OpenSpec for every agent found on this machine and records it in
 * the global config, so `openspec update` keeps it current.
 */
export async function setupMachine(options: MachineSetupOptions = {}): Promise<MachineSetupResult> {
  const env = options.env ?? process.env;
  const home = options.homedir ?? resolveHome(env);
  const register = options.register ?? true;
  const config = getGlobalConfig();
  // Resolved through the templates so a workflow that needs another (archive
  // needs sync) brings it along. Only workflows with a skill of their own are
  // listed; the router ships the rest (sync) as steps.
  const workflows = getBetaSkillTemplates(getProfileWorkflows(config.profile ?? 'core', config.workflows))
    .map((entry) => entry.workflowId)
    .filter((id) => WORKFLOW_ORDER.includes(id))
    .sort((a, b) => WORKFLOW_ORDER.indexOf(a) - WORKFLOW_ORDER.indexOf(b));
  const agents = detectMachineAgents({ homedir: home, env });
  const result: MachineSetupResult = { agents, workflows, moved: [] };

  // Move the skills an older OpenSpec wrote out of the way, so agents do not
  // load both; `openspec setup --revert` moves them back.
  const installing = new Set([SKILL_NAMESPACE, ...workflows.map((id) => workflowSkillName(id))]);
  const older = options.migrate ? findOlderFiles(home, env, installing, options.projectPath) : [];
  if (older.length > 0) {
    const backupDir = path.join(
      getGlobalDataDir({ env, homedir: home }),
      'backups',
      new Date().toISOString().replace(/[:.]/g, '-')
    );
    result.backupDir = backupDir;
    result.moved = options.dryRun
      ? older.map((from, index) => ({ from, to: path.join(backupDir, `${index + 1}-${path.basename(from)}`) }))
      : await backUp(older, backupDir);
    if (!options.dryRun && result.moved.length > 0) {
      // Recorded before installing, so a failed install can still be reverted.
      const current = getGlobalConfig();
      saveGlobalConfig({
        ...current,
        machineSetup: {
          version: OPENSPEC_VERSION,
          claudePlugin: current.machineSetup?.claudePlugin ?? false,
          sharedSkills: current.machineSetup?.sharedSkills ?? false,
          backups: [...(current.machineSetup?.backups ?? []), backupDir],
        },
      });
    }
  }

  if (agents.some((agent) => agent.route === 'claude-plugin')) {
    const dir = getClaudePluginDir(env, home);
    const manualCommands = [
      `claude plugin marketplace add ${quote(dir)}`,
      `claude plugin install ${PLUGIN_NAME}@${MARKETPLACE_NAME}`,
    ];
    result.claudePlugin = { dir, registered: false, manualCommands };
    if (!options.dryRun) {
      await writeClaudePlugin(dir, workflows);
      if (register) {
        const runClaude = options.runClaude ?? defaultRunClaude(env);
        // A plugin registered under an earlier name (before a namespace rename)
        // would load beside this one; unregister it first.
        const previous = config.machineSetup?.claudePlugin ? config.machineSetup.pluginName : undefined;
        if (previous && previous !== PLUGIN_NAME) {
          runClaude(['plugin', 'uninstall', `${previous}@${previous}-local`]);
          runClaude(['plugin', 'marketplace', 'remove', `${previous}-local`]);
        }
        for (const args of [
          ['plugin', 'marketplace', 'add', dir],
          ['plugin', 'install', `${PLUGIN_NAME}@${MARKETPLACE_NAME}`],
        ]) {
          const outcome = runClaude(args);
          if (!outcome.ok) {
            result.claudePlugin.error = outcome.output || `claude ${args.join(' ')} failed`;
            break;
          }
        }
        result.claudePlugin.registered = result.claudePlugin.error === undefined;
      } else {
        result.claudePlugin.registered = config.machineSetup?.claudePlugin === true;
      }
    }
  }

  // The canonical install. `~/.agents/skills` is the cross-vendor Agent Skills
  // location, so writing it unconditionally is what lets a harness OpenSpec has
  // never heard of pick these skills up: it honours the convention instead of
  // waiting for us to learn its name. Detection below only decides what the
  // summary says, never whether this copy exists, and never writes a second
  // copy under a harness's own folder - two copies of one name is what makes
  // harnesses that read both locations warn on every start (#2180).
  const sharedDir = sharedSkillsDir(home);
  result.sharedSkills = { dir: sharedDir, installed: [], removed: [] };
  if (!options.dryRun) {
    result.sharedSkills = {
      dir: sharedDir,
      ...(await writeSharedSkills(sharedDir, workflows, agents.some((agent) => agent.id === 'codex'))),
    };
  }

  if (!options.dryRun) {
    const backups = getGlobalConfig().machineSetup?.backups ?? [];
    saveGlobalConfig({
      ...getGlobalConfig(),
      machineSetup: {
        version: OPENSPEC_VERSION,
        claudePlugin: result.claudePlugin?.registered ?? false,
        ...(result.claudePlugin?.registered ? { pluginName: PLUGIN_NAME } : {}),
        sharedSkills: result.sharedSkills !== undefined,
        ...(backups.length > 0 ? { backups } : {}),
      },
    });
  }
  return result;
}

export interface MachineRevertResult {
  /** The Claude Code plugin was unregistered and its folder removed. */
  pluginRemoved: boolean;
  /** Skill folders setup had written to ~/.agents/skills, now removed. */
  removed: string[];
  /** Folders moved back to where they were. */
  restored: string[];
  /** Folders left in the backup because something now has their place. */
  skipped: string[];
  /** Backup folders kept on disk because something in them could not go back. */
  keptBackups: string[];
  /** Why `claude plugin uninstall` failed, if it did. */
  error?: string;
}

/**
 * Undoes `openspec setup`: unregisters and removes the Claude Code plugin,
 * removes the skills setup wrote to ~/.agents/skills, and moves every folder
 * the migration moved back where it was. Returns null when setup never ran.
 */
export async function revertMachineSetup(
  options: Pick<MachineSetupOptions, 'homedir' | 'env' | 'runClaude'> = {}
): Promise<MachineRevertResult | null> {
  const env = options.env ?? process.env;
  const home = options.homedir ?? resolveHome(env);
  const record = getGlobalConfig().machineSetup;
  if (!record) return null;
  const result: MachineRevertResult = { pluginRemoved: false, removed: [], restored: [], skipped: [], keptBackups: [] };

  const pluginDir = getClaudePluginDir(env, home);
  if (record.claudePlugin || fs.existsSync(pluginDir)) {
    if (record.claudePlugin) {
      const runClaude = options.runClaude ?? defaultRunClaude(env);
      const name = record.pluginName ?? PLUGIN_NAME;
      for (const args of [
        ['plugin', 'uninstall', `${name}@${name}-local`],
        ['plugin', 'marketplace', 'remove', `${name}-local`],
      ]) {
        const outcome = runClaude(args);
        if (!outcome.ok) result.error ??= outcome.output || `claude ${args.join(' ')} failed`;
      }
    }
    await fs.promises.rm(pluginDir, { recursive: true, force: true });
    await removeOrphanedPluginCache(claudeConfigDir(home, env), record.pluginName ?? PLUGIN_NAME);
    result.pluginRemoved = result.error === undefined;
  }

  const sharedDir = sharedSkillsDir(home);
  for (const name of namespaceSkillDirs(sharedDir)) {
    await fs.promises.rm(path.join(sharedDir, name), { recursive: true, force: true });
    result.removed.push(name);
  }

  // Newest backup first, so a folder moved twice ends where it started.
  for (const backupDir of [...(record.backups ?? [])].reverse()) {
    const manifest = path.join(backupDir, MANIFEST);
    if (!fs.existsSync(manifest)) continue;
    // A setup interrupted mid-write can leave the manifest truncated. Throwing
    // here would abort the revert after the plugin and shared skills are
    // already gone and before the record is cleared, so every later revert
    // would fail on the same file and the user could never finish. Report the
    // backup and carry on with the rest.
    let moved: MovedSkill[];
    try {
      const parsed: unknown = JSON.parse(fs.readFileSync(manifest, 'utf8'));
      if (!Array.isArray(parsed)) throw new Error('manifest is not a list of moves');
      moved = parsed as MovedSkill[];
    } catch {
      result.skipped.push(backupDir);
      continue;
    }
    let complete = true;
    for (const { from, to } of moved) {
      if (!pathExists(to)) continue;
      if (pathExists(from)) {
        result.skipped.push(from);
        complete = false;
        continue;
      }
      // One folder that cannot go back (a permission, a read-only parent) must
      // not abort the revert: the plugin and the shared skills are already
      // gone by now, and throwing here would leave the record in place so
      // every later revert died on the same file. Leave it in the backup, say
      // so, and keep going.
      try {
        await fs.promises.mkdir(path.dirname(from), { recursive: true });
        await move(to, from);
        result.restored.push(from);
      } catch {
        result.skipped.push(from);
        complete = false;
      }
    }
    if (complete) await fs.promises.rm(backupDir, { recursive: true, force: true });
    else result.keptBackups.push(backupDir);
  }

  const { machineSetup: _removed, ...rest } = getGlobalConfig();
  saveGlobalConfig(rest);
  return result;
}

/** The summary `openspec setup --revert` prints. */
export function formatMachineRevert(result: MachineRevertResult | null): string {
  if (!result) return 'OpenSpec was not set up on this machine; nothing to revert.';
  const lines = ['Reverted the OpenSpec machine install.', ''];
  if (result.pluginRemoved) lines.push(`  Claude Code   removed the "${PLUGIN_NAME}" plugin`);
  if (result.error) {
    lines.push(chalk.yellow(`  Claude Code   could not unregister the plugin: ${result.error}`));
    lines.push(`                finish by running: claude plugin uninstall ${PLUGIN_NAME}@${MARKETPLACE_NAME}`);
  }
  if (result.removed.length > 0) lines.push(`  Removed       ${result.removed.join(', ')}`);
  if (result.restored.length > 0) {
    lines.push(`  Restored      ${result.restored.length} files: ${byFolder(result.restored).join(', ')}`);
  }
  if (result.skipped.length > 0) {
    lines.push(chalk.yellow(`  Left in the backup, because something now has their place: ${byFolder(result.skipped).join(', ')}`));
    for (const dir of result.keptBackups) lines.push(chalk.dim(`                kept at ${tilde(dir)}`));
  }
  lines.push('', 'Start a new agent session to pick up the change.');
  return lines.join('\n');
}

/** Whether `openspec setup` has run on this machine. */
export function isMachineSetUp(): boolean {
  return getGlobalConfig().machineSetup !== undefined;
}

/**
 * Rewrites the machine install with this version's skills. Registration is
 * not repeated: the plugin and the shared folder are read in place.
 */
export async function refreshMachineSetup(
  options: Omit<MachineSetupOptions, 'register'> = {}
): Promise<MachineSetupResult | null> {
  if (!isMachineSetUp()) return null;
  return setupMachine({ ...options, register: false });
}

/** One line for `openspec update` after a refresh. */
export function formatMachineRefresh(result: MachineSetupResult): string {
  const places = [
    result.claudePlugin ? 'the Claude Code plugin' : undefined,
    result.sharedSkills ? '~/.agents/skills' : undefined,
  ].filter((place): place is string => place !== undefined);
  return places.length > 0
    ? `Updated machine skills (${places.join(' and ')}) to ${OPENSPEC_VERSION}.`
    : 'No coding agents found on this machine; nothing to update outside this project.';
}

/** `path/to/folder (3)` per parent folder, shortest spelling first: ./ for cwd, ~ for home. */
function byFolder(paths: readonly string[]): string[] {
  const counts = new Map<string, number>();
  for (const file of paths) counts.set(path.dirname(file), (counts.get(path.dirname(file)) ?? 0) + 1);
  const cwd = process.cwd();
  const show = (dir: string) => {
    const relative = path.relative(cwd, dir);
    return relative && !relative.startsWith('..') && !path.isAbsolute(relative) ? relative : tilde(dir);
  };
  return [...counts].map(([dir, count]) => `${show(dir)} (${count})`);
}

function tilde(dir: string): string {
  const home = resolveHome(process.env);
  return dir.startsWith(home) ? `~${dir.slice(home.length)}` : dir;
}

/** The summary `openspec setup` and interactive `openspec init` print. */
export function formatMachineSetup(result: MachineSetupResult, options: { dryRun?: boolean } = {}): string {
  // There is no "nothing installed" case any more: the canonical copy at
  // `~/.agents/skills` is always written, so the summary's job is to say where
  // it went and which agents will pick it up, never to report a dead end.
  const lines = [options.dryRun ? 'OpenSpec would install:' : 'OpenSpec is set up on this machine.', ''];
  const row = (label: string, text: string) =>
    lines.push(label.length <= 12 ? `  ${label.padEnd(14)}${text}` : `  ${label}\n${' '.repeat(16)}${text}`);
  const indent = ' '.repeat(16);
  const plugin = result.claudePlugin;
  if (plugin) {
    row('Claude Code', `plugin "${PLUGIN_NAME}": /${PLUGIN_NAME}:propose`);
    if (!options.dryRun && !plugin.registered) {
      lines.push(chalk.yellow(`${indent}could not register it: ${plugin.error ?? 'unknown error'}`));
      lines.push(`${indent}finish by running:`);
      for (const command of plugin.manualCommands) lines.push(`${indent}  ${command}`);
    }
  }
  const shared = result.sharedSkills;
  if (shared) {
    const agents = result.agents.filter((agent) => agent.route === 'shared-skills');
    const onlyCodex = agents.length === 1 && agents[0].id === 'codex';
    const propose = workflowSkillName('propose');
    const invoke = onlyCodex
      ? `$${propose}`
      : agents.some((agent) => agent.id === 'codex')
        ? `/${propose} ($${propose} in Codex)`
        : `/${propose}`;
    // Named agents when we recognise one, otherwise say what the folder is for:
    // any harness that follows the Agent Skills convention reads it, including
    // ones OpenSpec does not know by name.
    const label = agents.length > 0 ? agents.map((agent) => agent.name).join(', ') : 'Any agent';
    row(label, `${tilde(shared.dir)}: ${invoke}`);
    if (agents.length === 0 && !plugin) {
      lines.push(chalk.dim(`${indent}the standard skills folder, read by any agent that supports it`));
    }
  }
  if (result.moved.length > 0) {
    lines.push('');
    // Say where the backup is, not only that there is one: what moves is
    // whatever sat on a name this install writes, which can include a file the
    // user put there, and they need to be able to find it.
    const count = `${result.moved.length} file${result.moved.length === 1 ? '' : 's'}`;
    lines.push(`${options.dryRun ? 'Would move' : 'Moved'} ${count} out of the way, from:`);
    for (const line of byFolder(result.moved.map(({ from }) => from))) lines.push(chalk.dim(`  ${line}`));
    if (result.backupDir) {
      lines.push(chalk.dim(`  into ${tilde(result.backupDir)}`));
      if (!options.dryRun) lines.push(chalk.dim('  `openspec setup --revert` puts them back'));
    }
  }
  lines.push(
    '',
    `The "${SKILL_NAMESPACE}" skill explains OpenSpec and picks the right skill; ${result.workflows.length} skills start one directly: ${result.workflows.join(', ')}.`,
    ''
  );
  if (!options.dryRun) lines.push('Undo all of this with `openspec setup --revert`.');
  lines.push(
    options.dryRun
      ? 'Run `openspec setup` to install.'
      : 'Start a new agent session to load them. `openspec update` keeps them current.'
  );
  return lines.join('\n');
}
