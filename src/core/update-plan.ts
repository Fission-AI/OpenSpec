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

export type UpdatePlanAction = 'add' | 'update' | 'delete';

export interface UpdatePlanChange {
  /** Project-relative POSIX path, or an absolute path (home collapsed to `~`) for files outside the project. */
  path: string;
  action: UpdatePlanAction;
  /** Tool the file belongs to, as configured (e.g. `claude`). */
  tool: string;
}

export interface UpdatePlan {
  changes: UpdatePlanChange[];
  /**
   * Parts of a real update this preview does not cover (legacy migrations,
   * Copilot cloud files). Empty for an ordinary refresh.
   */
  notes: string[];
}

/** Every filesystem mutation `update` makes while generating artifacts. */
export interface UpdateFileOps {
  writeFile(filePath: string, content: string, tool: string): Promise<void>;
  removeFile(filePath: string, tool: string): Promise<void>;
  removeDirectory(dirPath: string, tool: string): Promise<void>;
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
};

export class UpdatePlanRecorder implements UpdateFileOps {
  private readonly recorded = new Map<string, UpdatePlanChange>();
  private readonly notes: string[] = [];

  constructor(private readonly projectPath: string) {}

  async writeFile(filePath: string, content: string, tool: string): Promise<void> {
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
    this.record(filePath, 'delete', tool);
  }

  async removeDirectory(dirPath: string, tool: string): Promise<void> {
    // Report the files that disappear, not the directory: a preview is read
    // file by file.
    for (const filePath of listFilesRecursively(dirPath)) {
      this.record(filePath, 'delete', tool);
    }
  }

  addNote(note: string): void {
    if (!this.notes.includes(note)) this.notes.push(note);
  }

  getPlan(): UpdatePlan {
    const changes = [...this.recorded.values()].sort((a, b) => a.path.localeCompare(b.path));
    return { changes, notes: [...this.notes] };
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
    lines.push(`Note: ${note}`);
  }
  return lines.join('\n');
}
