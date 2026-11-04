/**
 * The `openspec-beta` skills replace a project's per-project OpenSpec skills.
 *
 * The beta is installed per user (`npx skills add Fission-AI/OpenSpec`), while
 * `openspec init` and `openspec update` write today's skills into each project.
 * An agent that can see both loads two OpenSpec skill sets. So for any tool
 * that can see the beta, `init` writes no per-project skills or commands and
 * `update` removes the ones it wrote; once the beta is gone, `update` writes
 * them back.
 *
 * Which tools were switched is remembered in the user's own config, keyed by
 * project, never in the project: per-project skills are often committed, and
 * one person installing the beta must not decide what a teammate's next
 * `openspec update` writes.
 */

import * as fs from 'fs';
import * as os from 'os';
import path from 'path';
import type { AIToolOption } from './config.js';
import { getGlobalConfig, saveGlobalConfig } from './global-config.js';

/** The beta's router skill: the one folder every beta install has. */
export const BETA_SKILL_NAME = 'openspec-beta';

/** The router's layout marker, which only the generated beta router carries. */
const ROUTER_MARKER = /^\s+layout: "router"\s*$/m;
const ROUTER_NAME = new RegExp(`^name: ${BETA_SKILL_NAME}\\s*$`, 'm');

function homeDir(): string {
  return process.env.USERPROFILE ?? process.env.HOME ?? os.homedir();
}

/**
 * The folders `tool` reads skills from besides the ones OpenSpec writes: the
 * project's own skills folder, where `npx skills add` without `-g` puts them,
 * and the tool's folder in the user's home, where `-g` puts them (for Claude
 * Code, `~/.claude/skills`, or `$CLAUDE_CONFIG_DIR/skills`).
 */
function betaFolders(projectPath: string, tool: AIToolOption): string[] {
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
  let text: string;
  try {
    text = fs.readFileSync(skillFile, 'utf8');
  } catch {
    return false;
  }
  return ROUTER_NAME.test(text) && ROUTER_MARKER.test(text);
}

/**
 * Whether `tool` can see the installed beta skills, so its per-project skills
 * would be a second set. A tool whose OpenSpec skills live in the user's home
 * rather than the project (`globalSkillsDir`) is left alone: switching it would
 * change every project at once.
 */
export function betaReplacesTool(projectPath: string, tool: AIToolOption): boolean {
  if (tool.globalSkillsDir) return false;
  return betaFolders(projectPath, tool).some((folder) =>
    isBetaRouter(path.join(folder, BETA_SKILL_NAME, 'SKILL.md'))
  );
}

function projectKey(projectPath: string): string {
  try {
    return fs.realpathSync(projectPath);
  } catch {
    return path.resolve(projectPath);
  }
}

/** Tools whose per-project skills the beta replaced in this project. */
export function getBetaReplacedTools(projectPath: string): string[] {
  return getGlobalConfig().betaReplacedTools?.[projectKey(projectPath)] ?? [];
}

/** Other projects where the beta still replaces per-project skills, by root path. */
export function getOtherBetaProjects(projectPath: string): string[] {
  const key = projectKey(projectPath);
  return Object.keys(getGlobalConfig().betaReplacedTools ?? {})
    .filter((other) => other !== key)
    .sort();
}

/** Records the tools the beta currently replaces in this project; none clears the entry. */
export function setBetaReplacedTools(projectPath: string, toolIds: readonly string[]): void {
  const config = getGlobalConfig();
  const key = projectKey(projectPath);
  const current = config.betaReplacedTools ?? {};
  const next = [...new Set(toolIds)].sort();
  const previous = current[key] ?? [];
  if (next.length === previous.length && next.every((id, i) => id === previous[i])) return;
  const updated = { ...current };
  if (next.length > 0) updated[key] = next;
  else delete updated[key];
  saveGlobalConfig({
    ...config,
    betaReplacedTools: Object.keys(updated).length > 0 ? updated : undefined,
  });
}

/** The line `init` and `update` print for the tools the beta replaced. */
export function betaReplacedMessage(toolNames: readonly string[]): string {
  return (
    `Using the OpenSpec beta skills for ${toolNames.join(', ')}, so this project gets no per-project OpenSpec skills or commands there. ` +
    'Remove the beta and run `openspec update` to bring them back.'
  );
}
