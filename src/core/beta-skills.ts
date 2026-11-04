/**
 * The `openspec-beta` skills replace OpenSpec's per-project skills.
 *
 * The beta is installed per user (`npx skills add Fission-AI/OpenSpec`), while
 * `openspec init` and `openspec update` write today's skills into each project.
 * An agent that can see both loads two OpenSpec skill sets. So for any tool
 * that can see the beta, `init` writes no OpenSpec skills or commands and
 * `update` removes the ones it wrote; once the beta is gone, `update` writes
 * them back. These are the same files `openspec update` rewrites on every run,
 * so removing them loses nothing an update would not already replace.
 *
 * Which tools were switched is remembered in the user's own config, never in
 * the project: per-project skills are often committed, and one person
 * installing the beta must not decide what a teammate's next `openspec update`
 * writes. A tool whose OpenSpec skills live in the user's home rather than the
 * project (MiniMax Code) is switched for the whole machine, the same scope
 * those skills already have.
 */

import * as fs from 'fs';
import * as os from 'os';
import path from 'path';
import { AI_TOOLS, type AIToolOption } from './config.js';
import { getGlobalConfig, saveGlobalConfig } from './global-config.js';
import { SKILL_NAMES } from './shared/tool-detection.js';

/** The beta's router skill: the one folder every beta install has. */
export const BETA_SKILL_NAME = 'openspec-beta';

/** Record key for tools whose OpenSpec skills live in the user's home. */
const MACHINE_KEY = '~';

/** The router's layout marker, which only the generated beta router carries. */
const ROUTER_MARKER = /^\s+layout: "router"\s*$/m;
const ROUTER_NAME = new RegExp(`^name: ["']?${BETA_SKILL_NAME}["']?\\s*$`, 'm');
/** OpenSpec's own skills carry this; copies `npx skills add` made of them do not. */
const GENERATED_BY = /^\s+generatedBy:/m;

function homeDir(): string {
  return process.env.USERPROFILE ?? process.env.HOME ?? os.homedir();
}

function readText(file: string): string | undefined {
  try {
    return fs.readFileSync(file, 'utf8');
  } catch {
    return undefined;
  }
}

/** Whether `tool`'s OpenSpec skills live in the user's home, for every project at once. */
export function isMachineWideTool(tool: AIToolOption): boolean {
  return Boolean(tool.globalSkillsDir);
}

/**
 * The folders `tool` reads skills from that the beta can be installed into:
 * the project's own skills folder, where `npx skills add` without `-g` puts it,
 * and the tool's folder in the user's home, where `-g` puts it. For the
 * `.agents` tools (Codex, Amp, Zed, ...) that is `~/.agents/skills`, the skills
 * CLI's canonical copy; for Claude Code, `~/.claude/skills` or
 * `$CLAUDE_CONFIG_DIR/skills`; for MiniMax Code, `~/.minimax/skills`.
 */
function betaFolders(projectPath: string, tool: AIToolOption): string[] {
  if (tool.globalSkillsDir) return [path.join(homeDir(), tool.globalSkillsDir, 'skills')];
  if (!tool.skillsDir) return [];
  const folders = [
    path.join(projectPath, tool.skillsDir, 'skills'),
    path.join(homeDir(), tool.skillsDir, 'skills'),
  ];
  if (tool.value === 'claude' && process.env.CLAUDE_CONFIG_DIR) {
    folders.push(path.join(process.env.CLAUDE_CONFIG_DIR, 'skills'));
  }
  return folders;
}

function isBetaRouter(skillFile: string): boolean {
  const text = readText(skillFile);
  return text !== undefined && ROUTER_NAME.test(text) && ROUTER_MARKER.test(text);
}

/** Whether `tool` can see the installed beta skills, so its OpenSpec skills would be a second set. */
export function betaReplacesTool(projectPath: string, tool: AIToolOption): boolean {
  return betaFolders(projectPath, tool).some((folder) =>
    isBetaRouter(path.join(folder, BETA_SKILL_NAME, 'SKILL.md'))
  );
}

/**
 * Today's OpenSpec skills that an earlier `npx skills add` left in the user's
 * home folders, which an agent loads beside the beta. The skills CLI installed
 * them, so it is the one to remove them; these are only named.
 */
export function findOldNpxSkills(): string[] {
  const folders = new Set<string>([path.join(homeDir(), '.agents', 'skills')]);
  for (const tool of AI_TOOLS) {
    if (tool.skillsDir) folders.add(path.join(homeDir(), tool.skillsDir, 'skills'));
  }
  if (process.env.CLAUDE_CONFIG_DIR) folders.add(path.join(process.env.CLAUDE_CONFIG_DIR, 'skills'));
  const found = new Set<string>();
  for (const folder of folders) {
    for (const name of SKILL_NAMES) {
      const text = readText(path.join(folder, name, 'SKILL.md'));
      if (text !== undefined && !GENERATED_BY.test(text)) found.add(name);
    }
  }
  return [...found].sort();
}

function projectKey(projectPath: string): string {
  try {
    return fs.realpathSync(projectPath);
  } catch {
    return path.resolve(projectPath);
  }
}

function recordKey(projectPath: string, toolId: string): string {
  const tool = AI_TOOLS.find((candidate) => candidate.value === toolId);
  return tool && isMachineWideTool(tool) ? MACHINE_KEY : projectKey(projectPath);
}

/** Tools the beta replaced, for this project and for the whole machine. */
export function getBetaReplacedTools(projectPath: string): string[] {
  const records = getGlobalConfig().betaReplacedTools ?? {};
  return [...new Set([...(records[projectKey(projectPath)] ?? []), ...(records[MACHINE_KEY] ?? [])])];
}

/** Other projects where the beta still replaces OpenSpec's skills, by root path. */
export function getOtherBetaProjects(projectPath: string): string[] {
  const key = projectKey(projectPath);
  return Object.keys(getGlobalConfig().betaReplacedTools ?? {})
    .filter((other) => other !== key && other !== MACHINE_KEY)
    .sort();
}

/**
 * Records which tools the beta currently replaces, each under its own scope:
 * this project, or the whole machine for a tool whose skills live in the home
 * folder. Callers pass every tool the run decided about, and every run decides
 * about a machine-wide tool (it is always detected or recorded), so the list
 * sets both entries. Entries for projects that no longer exist are dropped.
 */
export function setBetaReplacedTools(projectPath: string, toolIds: readonly string[]): void {
  const config = getGlobalConfig();
  const current = config.betaReplacedTools ?? {};
  const project = projectKey(projectPath);
  const updated: Record<string, string[]> = {};
  for (const [key, ids] of Object.entries(current)) {
    if (key !== project && key !== MACHINE_KEY && fs.existsSync(key)) updated[key] = ids;
  }
  for (const id of new Set(toolIds)) {
    const key = recordKey(projectPath, id);
    updated[key] = [...(updated[key] ?? []), id].sort();
  }
  if (JSON.stringify(sortRecord(updated)) === JSON.stringify(sortRecord(current))) return;
  saveGlobalConfig({
    ...config,
    betaReplacedTools: Object.keys(updated).length > 0 ? updated : undefined,
  });
}

function sortRecord(record: Record<string, string[]>): Array<[string, string[]]> {
  return Object.entries(record)
    .map(([key, ids]): [string, string[]] => [key, [...ids].sort()])
    .sort(([a], [b]) => a.localeCompare(b));
}

/** The line `init` and `update` print for the tools the beta replaced. */
export function betaReplacedMessage(toolNames: readonly string[]): string {
  return (
    `Using the OpenSpec beta skills for ${toolNames.join(', ')}, instead of OpenSpec's per-project skills and commands. ` +
    'Remove the beta and run `openspec update` to bring them back.'
  );
}

/** The line `init` and `update` print for old skills an earlier `npx skills add` left. */
export function oldNpxSkillsMessage(names: readonly string[]): string {
  return (
    "An earlier `npx skills add` left today's OpenSpec skills in your home folder, so your agent still loads them beside the beta. " +
    `Remove them with: npx skills remove -g -y ${names.join(' ')}`
  );
}
