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
  private readonly notes: UpdatePlanNote[] = [];
  private readonly failures: UpdatePlanFailure[] = [];
  /**
   * The tree as the real update would have it so far: absolute path to planned
   * content, a moved directory, or null once planned away (a removed directory
   * takes everything under it). Steps that read what an earlier step left
   * behind read this through `view`.
   */
  private readonly staged = new Map<string, string | null | typeof STAGED_DIRECTORY>();
  /** Every file path the plan has touched, with the tool that touched it last. */
  private readonly touched = new Map<string, string>();

  constructor(private readonly projectPath: string) {}

  async writeFile(filePath: string, content: string, tool: string): Promise<void> {
    const target = path.resolve(filePath);
    this.probeWrite(target);
    this.stage(target, content, tool);
  }

  async removeFile(filePath: string, tool: string): Promise<void> {
    const target = path.resolve(filePath);
    this.probeRemove(target);
    this.stage(target, null, tool);
  }

  async removeEmptyDirectory(dirPath: string): Promise<void> {
    // An empty directory holds no file, so there is nothing to list.
    this.staged.set(path.resolve(dirPath), null);
  }

  async removeDirectory(dirPath: string, tool: string): Promise<void> {
    const target = path.resolve(dirPath);
    // A symlinked skills directory - what a dotfile manager leaves behind - is
    // removed as the link itself: `fs.rm` with `recursive` unlinks it and never
    // touches the tree it points at, so the link is the one entry that goes.
    let stats: fs.Stats | null = null;
    try {
      stats = fs.lstatSync(target);
    } catch {
      stats = null;
    }
    if (stats?.isSymbolicLink()) {
      this.stage(target, null, tool);
      return;
    }
    // Otherwise every file under it goes - on disk, and any the plan put there.
    // Each is cleared on its own: a file's own entry outranks its directory's.
    for (const filePath of this.filesUnder(target)) this.stage(filePath, null, tool);
    this.staged.set(target, null);
  }

  /**
   * A rename, as the legacy-root migration makes it: whatever the entry is
   * moves, a directory with everything in it.
   */
  async moveFile(source: string, destination: string, tool: string): Promise<void> {
    const from = path.resolve(source);
    const to = path.resolve(destination);
    this.probeCreatableIn(path.dirname(to));
    if (this.entryKind(from).kind === 'directory') {
      if (this.entryKind(to).kind !== 'missing') {
        throw errnoError('ENOTEMPTY', 'directory not empty', 'rename', to);
      }
      const files = this.filesUnder(from);
      const contents = files.map((filePath) => [filePath, this.view.read(filePath)] as const);
      for (const filePath of files) this.stage(filePath, null, tool);
      this.staged.set(from, null);
      this.staged.set(to, STAGED_DIRECTORY);
      for (const [filePath, content] of contents) {
        this.stage(path.join(to, path.relative(from, filePath)), content, tool);
      }
      return;
    }
    const content = this.view.read(from);
    this.probeWrite(to);
    this.probeRemove(from);
    this.stage(from, null, tool);
    this.stage(to, content, tool);
  }

  /**
   * The tree with every planned write, move and removal applied. A path the
   * plan has not touched answers exactly as the disk does.
   */
  readonly view: FileView = {
    exists: (filePath: string): boolean => this.entryKind(path.resolve(filePath)).kind !== 'missing',
    isDirectory: (filePath: string): boolean =>
      this.entryKind(path.resolve(filePath)).kind === 'directory',
    read: (filePath: string): string => {
      const target = path.resolve(filePath);
      const staged = this.stagedEntry(target);
      if (staged === undefined) return fs.readFileSync(target, 'utf-8');
      if (staged === null) throw errnoError('ENOENT', 'no such file or directory', 'open', target);
      if (staged === STAGED_DIRECTORY) {
        throw errnoError('EISDIR', 'illegal operation on a directory', 'read', target);
      }
      return staged;
    },
  };

  addNote(code: UpdatePlanNoteCode, message: string): void {
    if (this.notes.some((note) => note.code === code)) return;
    this.notes.push({ code, message });
  }

  addFailure(tool: string, error: string): void {
    this.failures.push({ tool, error });
  }

  /**
   * Each touched path, compared as it is on disk now with how the plan leaves
   * it. A file written and then removed, or rewritten with the bytes it
   * already had, is no change at all.
   */
  getPlan(): UpdatePlan {
    const byPath = new Map<string, UpdatePlanChange>();
    for (const [filePath, tool] of this.touched) {
      const before = originalEntry(filePath);
      const after = this.stagedEntry(filePath);
      if (after === undefined || after === STAGED_DIRECTORY) continue;
      let action: UpdatePlanAction | undefined;
      if (after === null) {
        if (before !== undefined) action = 'delete';
      } else if (before === undefined) {
        action = 'add';
      } else if (before !== after) {
        action = 'update';
      }
      if (!action) continue;
      const displayPath = this.toDisplayPath(filePath);
      byPath.set(displayPath, { path: displayPath, action, tool });
    }
    const changes = [...byPath.values()].sort((a, b) => a.path.localeCompare(b.path));
    return { changes, notes: [...this.notes], failures: [...this.failures] };
  }

  private stage(target: string, entry: string | null, tool: string): void {
    this.staged.set(target, entry);
    this.touched.set(target, tool);
  }

  /**
   * What the plan has put at a path: content, a moved directory, null once
   * planned away, or undefined when the plan has not touched it.
   */
  private stagedEntry(target: string): string | null | typeof STAGED_DIRECTORY | undefined {
    for (let current = target; ; current = path.dirname(current)) {
      const staged = this.staged.get(current);
      if (staged === null) return null;
      if (staged !== undefined && current === target) return staged;
      if (path.dirname(current) === current) return undefined;
    }
  }

  /** Whether the plan has put any file or directory below `directory`. */
  private hasStagedDescendant(directory: string): boolean {
    const prefix = directory.endsWith(path.sep) ? directory : directory + path.sep;
    for (const key of this.staged.keys()) {
      if (!key.startsWith(prefix)) continue;
      const entry = this.stagedEntry(key);
      if (entry !== null && entry !== undefined) return true;
    }
    return false;
  }

  /** Files under a directory in the tree as planned: those on disk, and those the plan added. */
  private filesUnder(directory: string): string[] {
    const files = new Set<string>();
    for (const filePath of listFilesRecursively(directory)) {
      if (this.stagedEntry(filePath) !== null) files.add(filePath);
    }
    const prefix = directory + path.sep;
    for (const key of this.staged.keys()) {
      if (key.startsWith(prefix) && typeof this.stagedEntry(key) === 'string') files.add(key);
    }
    return [...files];
  }

  /**
   * What is at a path in the tree as planned, and whether that is what is on
   * disk (so its permissions are real).
   */
  private entryKind(target: string): { kind: 'missing' | 'file' | 'directory'; onDisk: boolean } {
    const staged = this.stagedEntry(target);
    if (staged === null) {
      // Removed, but the plan may have written into it again since.
      return this.hasStagedDescendant(target)
        ? { kind: 'directory', onDisk: false }
        : { kind: 'missing', onDisk: false };
    }
    if (staged === STAGED_DIRECTORY) return { kind: 'directory', onDisk: false };
    if (typeof staged === 'string') {
      return { kind: 'file', onDisk: fs.existsSync(target) };
    }
    try {
      return { kind: fs.statSync(target).isDirectory() ? 'directory' : 'file', onDisk: true };
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code !== 'ENOENT' && code !== 'ENOTDIR') throw error;
    }
    return this.hasStagedDescendant(target)
      ? { kind: 'directory', onDisk: false }
      : { kind: 'missing', onDisk: false };
  }

  /**
   * Fails the way the real write would, without writing: a directory where the
   * file belongs, a file where one of its directories belongs, or no
   * permission. Recording the write instead would plan past the point where
   * the real update stops for this tool, listing files it never writes.
   */
  private probeWrite(target: string): void {
    const entry = this.entryKind(target);
    if (entry.kind === 'directory') {
      throw errnoError('EISDIR', 'illegal operation on a directory', 'open', target);
    }
    if (entry.kind === 'file') {
      if (entry.onDisk) fs.accessSync(target, fs.constants.W_OK);
      return;
    }
    this.probeCreatableIn(path.dirname(target));
  }

  /** Fails the way unlinking the file would. */
  private probeRemove(target: string): void {
    const entry = this.entryKind(target);
    if (entry.kind === 'directory') {
      throw errnoError('EISDIR', 'illegal operation on a directory', 'unlink', target);
    }
    if (entry.kind === 'file' && entry.onDisk) {
      fs.accessSync(path.dirname(target), fs.constants.W_OK);
    }
  }

  /**
   * The nearest existing ancestor has to be a directory the update can create
   * entries in; anything it would create below that starts out empty.
   */
  private probeCreatableIn(directory: string): void {
    for (let current = directory; ; current = path.dirname(current)) {
      const entry = this.entryKind(current);
      if (entry.kind === 'file') {
        throw errnoError('ENOTDIR', 'not a directory', 'mkdir', current);
      }
      if (entry.kind === 'directory') {
        if (entry.onDisk) fs.accessSync(current, fs.constants.W_OK);
        return;
      }
      if (path.dirname(current) === current) return;
    }
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

/** Marks a path the plan has moved a whole directory to. */
const STAGED_DIRECTORY = Symbol('staged directory');

/**
 * A path as it is on disk now: a file's content, a symlink as an entry of its
 * own (read through when it points at a file), or undefined when absent or a
 * directory.
 */
function originalEntry(target: string): string | undefined {
  let stats: fs.Stats;
  try {
    stats = fs.lstatSync(target);
  } catch {
    return undefined;
  }
  if (stats.isSymbolicLink()) {
    try {
      return fs.readFileSync(target, 'utf-8');
    } catch {
      return `symlink:${fs.readlinkSync(target)}`;
    }
  }
  if (!stats.isFile()) return undefined;
  return fs.readFileSync(target, 'utf-8');
}

/** An error shaped like the one Node's own fs call would throw. */
function errnoError(code: string, description: string, syscall: string, target: string): Error {
  return Object.assign(new Error(`${code}: ${description}, ${syscall} '${target}'`), {
    code,
    syscall,
    path: target,
  });
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
