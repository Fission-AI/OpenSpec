/**
 * Update Plan
 *
 * The write seam `update` uses for every file it generates or removes.
 *
 * A real run forwards to the filesystem. A dry run records what the same call
 * would have done and writes nothing, so the preview and the real update come
 * from one code path instead of two descriptions of it.
 */

import path from 'path';
import * as fs from 'fs';
import os from 'os';
import { FileSystemUtils } from '../utils/file-system.js';
import type { FileView } from './file-view.js';

export type UpdatePlanAction = 'add' | 'update' | 'delete';

export interface UpdatePlanChange {
  /** Project-relative POSIX path, or an absolute path (home collapsed to `~`) for files outside the project. */
  path: string;
  action: UpdatePlanAction;
  /**
   * Tool the file belongs to, as configured (e.g. `claude`), or `openspec`
   * for OpenSpec's own files: the global config and legacy-artifact cleanup.
   */
  tool: string;
}

/**
 * What the plan cannot settle by itself: a step a terminal user is asked
 * about, which the plan lists as a non-interactive run makes it. Stable
 * identifiers, for a caller that branches on them.
 */
export type UpdatePlanNoteCode = 'legacy-tool-directories' | 'legacy-artifacts';

export interface UpdatePlanNote {
  code: UpdatePlanNoteCode;
  message: string;
}

export interface UpdatePlanFailure {
  tool: string;
  error: string;
}

export interface UpdatePlan {
  changes: UpdatePlanChange[];
  /**
   * Steps a terminal user would be asked about. `changes` lists them as a
   * non-interactive run makes them. Empty for an ordinary refresh.
   */
  notes: UpdatePlanNote[];
  /**
   * Tools the real update would fail on. Reported rather than thrown: one
   * broken tool must not cost the caller the rest of the plan.
   */
  failures: UpdatePlanFailure[];
}

/** Every filesystem mutation `update` makes while generating artifacts. */
export interface UpdateFileOps {
  writeFile(filePath: string, content: string, tool: string): Promise<void>;
  removeFile(filePath: string, tool: string): Promise<void>;
  removeDirectory(dirPath: string, tool: string): Promise<void>;
  /** Removes a directory already known to be empty. */
  removeEmptyDirectory(dirPath: string): Promise<void>;
}

export const realFileOps: UpdateFileOps = {
  async writeFile(filePath, content) {
    await FileSystemUtils.writeFile(filePath, content);
  },
  async removeFile(filePath) {
    await fs.promises.unlink(filePath);
  },
  async removeDirectory(dirPath) {
    await fs.promises.rm(dirPath, { recursive: true, force: true });
  },
  async removeEmptyDirectory(dirPath) {
    await fs.promises.rmdir(dirPath);
  },
};

export class UpdatePlanRecorder implements UpdateFileOps {
  private readonly recorded = new Map<string, UpdatePlanChange>();
  private readonly notes: UpdatePlanNote[] = [];
  private readonly failures: UpdatePlanFailure[] = [];
  /**
   * The tree as the real update would have it so far: absolute path to planned
   * content, or null once planned away. Steps that read what an earlier step
   * left behind (a migration comparing against generated files) read this.
   * The plan itself is always measured against the disk as it is now.
   */
  private readonly staged = new Map<string, string | null>();

  constructor(private readonly projectPath: string) {}

  async writeFile(filePath: string, content: string, tool: string): Promise<void> {
    this.staged.set(path.resolve(filePath), content);
    let existing: string | null = null;
    try {
      existing = fs.readFileSync(filePath, 'utf-8');
    } catch {
      existing = null;
    }
    // A rewrite with identical bytes changes nothing, so it is not in the plan.
    if (existing === content) return;
    this.record(filePath, existing === null ? 'add' : 'update', tool);
  }

  async removeFile(filePath: string, tool: string): Promise<void> {
    this.staged.set(path.resolve(filePath), null);
    this.record(filePath, 'delete', tool);
  }

  async removeEmptyDirectory(dirPath: string): Promise<void> {
    // An empty directory holds no file, so the plan has nothing to list.
    this.staged.set(path.resolve(dirPath), null);
  }

  /**
   * Stages a move without recording the destination: whether the moved file
   * ends up in the plan is decided by what the update writes or removes there
   * afterwards. The source is recorded as deleted.
   */
  async moveFile(source: string, destination: string, tool: string): Promise<void> {
    const content = this.view.read(source);
    await this.removeFile(source, tool);
    this.staged.set(path.resolve(destination), content);
  }

  /** The tree with every planned write, move and removal applied. */
  readonly view: FileView = {
    exists: (filePath: string): boolean => this.stagedContent(filePath) !== null,
    read: (filePath: string): string => {
      const content = this.stagedContent(filePath);
      if (content === null) {
        throw Object.assign(new Error(`ENOENT: ${filePath}`), { code: 'ENOENT' });
      }
      return content;
    },
  };

  private stagedContent(filePath: string): string | null {
    const absolute = path.resolve(filePath);
    // A removed directory (or link) takes everything under it with it.
    for (let current = absolute; ; current = path.dirname(current)) {
      const staged = this.staged.get(current);
      if (staged === null) return null;
      if (staged !== undefined && current === absolute) return staged;
      if (path.dirname(current) === current) break;
    }
    try {
      return fs.readFileSync(absolute, 'utf-8');
    } catch {
      return null;
    }
  }

  async removeDirectory(dirPath: string, tool: string): Promise<void> {
    // A symlinked skills directory — what a dotfile manager leaves behind — is
    // removed as the link itself: `fs.rm` with `recursive` unlinks it and never
    // touches the tree it points at. Enumerating through it would promise the
    // caller deletions that do not happen.
    let stats: fs.Stats | null = null;
    try {
      stats = fs.lstatSync(dirPath);
    } catch {
      return;
    }
    this.staged.set(path.resolve(dirPath), null);
    if (stats.isSymbolicLink()) {
      this.record(dirPath, 'delete', tool);
      return;
    }
    // Report the files that disappear, not the directory: a preview is read
    // file by file.
    for (const filePath of listFilesRecursively(dirPath)) {
      this.record(filePath, 'delete', tool);
    }
  }

  addNote(code: UpdatePlanNoteCode, message: string): void {
    if (this.notes.some((note) => note.code === code)) return;
    this.notes.push({ code, message });
  }

  addFailure(tool: string, error: string): void {
    this.failures.push({ tool, error });
  }

  getPlan(): UpdatePlan {
    const changes = [...this.recorded.values()].sort((a, b) => a.path.localeCompare(b.path));
    return { changes, notes: [...this.notes], failures: [...this.failures] };
  }

  private record(filePath: string, action: UpdatePlanAction, tool: string): void {
    const displayPath = this.toDisplayPath(filePath);
    this.recorded.set(displayPath, { path: displayPath, action, tool });
  }

  private toDisplayPath(filePath: string): string {
    const absolute = path.resolve(filePath);
    const relative = path.relative(this.projectPath, absolute);
    if (relative && !relative.startsWith('..') && !path.isAbsolute(relative)) {
      return FileSystemUtils.toPosixPath(relative);
    }
    // Same home resolution the skill paths use, so a global skill is named
    // against the home the generator wrote it to.
    const home = process.env.USERPROFILE ?? process.env.HOME ?? os.homedir();
    const fromHome = path.relative(home, absolute);
    if (fromHome && !fromHome.startsWith('..') && !path.isAbsolute(fromHome)) {
      return `~/${FileSystemUtils.toPosixPath(fromHome)}`;
    }
    return FileSystemUtils.toPosixPath(absolute);
  }
}

function listFilesRecursively(dirPath: string): string[] {
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dirPath, { withFileTypes: true });
  } catch {
    return [];
  }
  const files: string[] = [];
  for (const entry of entries) {
    const full = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      files.push(...listFilesRecursively(full));
    } else {
      files.push(full);
    }
  }
  return files;
}

/** Human-readable rendering of a dry-run plan. */
export function formatUpdatePlan(plan: UpdatePlan): string {
  const lines: string[] = [];
  if (plan.changes.length === 0) {
    lines.push('No changes: skills and commands are up to date.');
  } else {
    lines.push(`${plan.changes.length} file(s) would change:`);
    const width = Math.max(...plan.changes.map((change) => change.action.length));
    for (const change of plan.changes) {
      lines.push(`  ${change.action.padEnd(width)}  ${change.path}  (${change.tool})`);
    }
  }
  for (const note of plan.notes) {
    lines.push('');
    lines.push(`Note: ${note.message}`);
  }
  for (const failure of plan.failures) {
    lines.push('');
    lines.push(`Would fail: ${failure.tool} (${failure.error})`);
  }
  return lines.join('\n');
}
