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
import {
  closeSync,
  fstatSync,
  mkdirSync,
  openSync,
  readFileSync,
  realpathSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'fs';
import { OPENSPEC_DIR_NAME } from './config.js';
import { getGlobalDataDir } from './global-config.js';
import { projectHasOwnSkills } from './global-skills.js';

export const KNOWN_PROJECTS_FILE_NAME = 'projects.json';

/** Far more than any real list; a larger file is not one this CLI wrote. */
const MAX_LIST_BYTES = 1024 * 1024;

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

/** Whether a folder holds `openspec/`, is gone, or can't be told right now (an unmounted drive, say). */
function projectState(projectPath: string): 'project' | 'gone' | 'unknown' {
  try {
    return statSync(path.join(projectPath, OPENSPEC_DIR_NAME)).isDirectory() ? 'project' : 'gone';
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    return code === 'ENOENT' || code === 'ENOTDIR' ? 'gone' : 'unknown';
  }
}

const CONTROL_CHARACTERS = new RegExp('[\\u0000-\\u001f\\u007f-\\u009f]');

function isPlainPath(entry: string): boolean {
  return path.isAbsolute(entry) && !CONTROL_CHARACTERS.test(entry);
}

/**
 * The recorded paths, as written. Only absolute paths without control
 * characters count: they are printed to the terminal, and nothing else is a
 * path this CLI recorded.
 */
function recordedPaths(): string[] {
  try {
    // One handle for the size check and the read, so both see the same file.
    const handle = openSync(knownProjectsPath(), 'r');
    let text: string;
    try {
      if (fstatSync(handle).size > MAX_LIST_BYTES) return [];
      text = readFileSync(handle, 'utf8');
    } finally {
      closeSync(handle);
    }
    const parsed: unknown = JSON.parse(text);
    const projects = (parsed as { projects?: unknown } | null)?.projects;
    if (!Array.isArray(projects)) return [];
    return [...new Set(projects.filter((entry): entry is string => typeof entry === 'string' && isPlainPath(entry)))];
  } catch {
    return [];
  }
}

/** The recorded projects that are still there. */
export function readKnownProjects(): string[] {
  return recordedPaths().filter((project) => projectState(project) === 'project');
}

/**
 * Note that a project uses OpenSpec. Projects that are gone drop off the list
 * when it is next written. Two runs at once can each miss the other's entry;
 * the next run in that project records it again.
 */
export function rememberProject(projectPath: string): void {
  let draft: string | undefined;
  try {
    const project = canonical(projectPath);
    if (projectState(project) !== 'project') return;
    // Already there: nothing to write, and no other project is looked at.
    const recorded = recordedPaths();
    if (recorded.includes(project)) return;

    const file = knownProjectsPath();
    mkdirSync(path.dirname(file), { recursive: true });
    const kept = recorded.filter((entry) => projectState(entry) !== 'gone');
    draft = `${file}.${process.pid}.tmp`;
    writeFileSync(draft, `${JSON.stringify({ projects: [...kept, project].sort() }, null, 2)}\n`);
    renameSync(draft, file);
  } catch {
    // The list is a convenience: the command that ran is not affected.
    try {
      if (draft) rmSync(draft, { force: true });
    } catch {
      // Nothing more to do.
    }
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
    // Compared by where each path leads today, so a project recorded under two names is one project.
    others = [...new Set(readKnownProjects().map(canonical))].filter(
      (project) => project !== current && isPlainPath(project) && projectHasOwnSkills(project)
    );
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
