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
import { getSkillTemplates, type GeneratedSkillFile } from './shared/skill-generation.js';

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
 * Quotes one argument for a Windows command line (CommandLineToArgvW rules):
 * backslashes are literal except before a quote, so those, and any trailing
 * run before the closing quote, are doubled.
 */
function quote(arg: string): string {
  if (!/[\s"]/.test(arg)) return arg;
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
  const description = 'OpenSpec workflows: propose, apply, verify, and archive spec-driven changes';
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
function findOlderFiles(home: string, env: NodeJS.ProcessEnv, projectPath?: string): string[] {
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
  // Anything else under the namespace's names in the machine folders that this
  // setup did not write (a copy from `npx skills add`, or its symlink) is in
  // the way of the install, so it goes into the backup too, never deleted.
  for (const root of machineRoots) {
    if (!fs.existsSync(root)) continue;
    for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
      if (entry.name !== SKILL_NAMESPACE && !entry.name.startsWith(`${SKILL_NAMESPACE}-`)) continue;
      const dir = path.join(root, entry.name);
      if (!isCurrentLayout(dir)) found.push(dir);
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
    await fs.promises.writeFile(path.join(backupDir, MANIFEST), `${JSON.stringify(moved, null, 2)}\n`);
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
  // needs sync) brings it along.
  const workflows = getSkillTemplates(getProfileWorkflows(config.profile ?? 'core', config.workflows))
    .map((entry) => entry.workflowId)
    .sort((a, b) => WORKFLOW_ORDER.indexOf(a) - WORKFLOW_ORDER.indexOf(b));
  const agents = detectMachineAgents({ homedir: home, env });
  const result: MachineSetupResult = { agents, workflows, moved: [] };

  // Move the skills an older OpenSpec wrote out of the way, so agents do not
  // load both; `openspec setup --revert` moves them back.
  const older = options.migrate ? findOlderFiles(home, env, options.projectPath) : [];
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

  const sharedDir = sharedSkillsDir(home);
  if (agents.some((agent) => agent.route === 'shared-skills') || fs.existsSync(sharedDir)) {
    result.sharedSkills = { dir: sharedDir, installed: [], removed: [] };
    if (!options.dryRun) {
      result.sharedSkills = {
        dir: sharedDir,
        ...(await writeSharedSkills(sharedDir, workflows, agents.some((agent) => agent.id === 'codex'))),
      };
    }
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
  const result: MachineRevertResult = { pluginRemoved: false, removed: [], restored: [], skipped: [] };

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
    const moved = JSON.parse(fs.readFileSync(manifest, 'utf8')) as MovedSkill[];
    let complete = true;
    for (const { from, to } of moved) {
      if (!pathExists(to)) continue;
      if (pathExists(from)) {
        result.skipped.push(from);
        complete = false;
        continue;
      }
      await fs.promises.mkdir(path.dirname(from), { recursive: true });
      await move(to, from);
      result.restored.push(from);
    }
    if (complete) await fs.promises.rm(backupDir, { recursive: true, force: true });
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
  if (result.agents.length === 0) {
    return [
      'No coding agents found on this machine.',
      'Install one (Claude Code, Codex, Cursor, ...) and run `openspec setup` again,',
      'or install into a single project with `openspec init --tools <tool>`.',
    ].join('\n');
  }

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
    const label = agents.length > 0 ? agents.map((agent) => agent.name).join(', ') : 'Other agents';
    row(label, `${tilde(shared.dir)}: ${invoke}`);
  }
  if (result.moved.length > 0) {
    lines.push('');
    lines.push(`${options.dryRun ? 'Would move' : 'Moved'} ${result.moved.length} older OpenSpec files to a backup:`);
    for (const line of byFolder(result.moved.map(({ from }) => from))) lines.push(chalk.dim(`  ${line}`));
  }
  lines.push(
    '',
    `The "${SKILL_NAMESPACE}" skill picks the workflow; ${result.workflows.length} workflow skills start one directly: ${result.workflows.join(', ')}.`,
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
