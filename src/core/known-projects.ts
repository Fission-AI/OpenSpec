/**
 * The projects on this machine that use OpenSpec.
 *
 * `openspec init` and `openspec update` note the project they ran in, so a
 * machine with the global skills can name the projects that still carry their
 * own. The list is a plain file in the global data folder. It never leaves
 * the machine, and nothing depends on it: a list that can't be read or
 * written is treated as empty and never fails a command.
 */

import path from 'path';
import { existsSync, mkdirSync, readFileSync, realpathSync, renameSync, writeFileSync } from 'fs';
import { OPENSPEC_DIR_NAME } from './config.js';
import { getGlobalDataDir } from './global-config.js';
import { projectHasOwnSkills } from './global-skills.js';

export const KNOWN_PROJECTS_FILE_NAME = 'projects.json';

export function knownProjectsPath(): string {
  return path.join(getGlobalDataDir(), KNOWN_PROJECTS_FILE_NAME);
}

function canonical(projectPath: string): string {
  try {
    return realpathSync.native(projectPath);
  } catch {
    return path.resolve(projectPath);
  }
}

function isProject(projectPath: string): boolean {
  return existsSync(path.join(projectPath, OPENSPEC_DIR_NAME));
}

/** The recorded projects that are still there. */
export function readKnownProjects(): string[] {
  try {
    const parsed: unknown = JSON.parse(readFileSync(knownProjectsPath(), 'utf8'));
    const projects = (parsed as { projects?: unknown } | null)?.projects;
    if (!Array.isArray(projects)) return [];
    return projects.filter((entry): entry is string => typeof entry === 'string' && isProject(entry));
  } catch {
    return [];
  }
}

/** Note that a project uses OpenSpec. Projects that are gone drop off the list. */
export function rememberProject(projectPath: string): void {
  try {
    const project = canonical(projectPath);
    if (!isProject(project)) return;
    const known = readKnownProjects();
    if (known.includes(project)) return;

    const file = knownProjectsPath();
    mkdirSync(path.dirname(file), { recursive: true });
    const draft = `${file}.${process.pid}.tmp`;
    writeFileSync(draft, `${JSON.stringify({ projects: [...known, project].sort() }, null, 2)}\n`);
    renameSync(draft, file);
  } catch {
    // The list is a convenience: the command that ran is not affected.
  }
}

const NAMED_AT_MOST = 5;

/**
 * A note naming the other projects on this machine that still have their own
 * OpenSpec skills, for a machine that has the global ones.
 */
export function otherProjectsNote(currentProjectPath: string): string | undefined {
  let others: string[];
  try {
    const current = canonical(currentProjectPath);
    others = readKnownProjects().filter((project) => project !== current && projectHasOwnSkills(project));
  } catch {
    return undefined;
  }
  if (others.length === 0) return undefined;

  const named = others.slice(0, NAMED_AT_MOST).map((project) => `  ${project}`);
  if (others.length > NAMED_AT_MOST) named.push(`  and ${others.length - NAMED_AT_MOST} more`);
  const subject =
    others.length === 1
      ? '1 other project on this machine still has its own OpenSpec skills:'
      : `${others.length} other projects on this machine still have their own OpenSpec skills:`;
  return [subject, ...named, 'To move one to the global skills, run this in it: openspec init --scope global'].join('\n');
}
