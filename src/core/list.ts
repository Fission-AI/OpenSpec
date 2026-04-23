import { promises as fs } from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';
import { getTaskProgressForChange, formatTaskStatus } from '../utils/task-progress.js';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { MarkdownParser } from './parsers/markdown-parser.js';
import { readProjectConfig } from './project-config.js';

interface ChangeInfo {
  name: string;
  completedTasks: number;
  totalTasks: number;
  lastModified: Date;
  worktree?: string;
}

interface ListOptions {
  sort?: 'recent' | 'name';
  json?: boolean;
}

/**
 * Get the most recent modification time of any file in a directory (recursive).
 * Falls back to the directory's own mtime if no files are found.
 */
async function getLastModified(dirPath: string): Promise<Date> {
  let latest: Date | null = null;

  async function walk(dir: string): Promise<void> {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await walk(fullPath);
      } else {
        const stat = await fs.stat(fullPath);
        if (latest === null || stat.mtime > latest) {
          latest = stat.mtime;
        }
      }
    }
  }

  await walk(dirPath);

  // If no files found, use the directory's own modification time
  if (latest === null) {
    const dirStat = await fs.stat(dirPath);
    return dirStat.mtime;
  }

  return latest;
}

/**
 * Format a date as relative time (e.g., "2 hours ago", "3 days ago")
 */
function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays > 30) {
    return date.toLocaleDateString();
  } else if (diffDays > 0) {
    return `${diffDays}d ago`;
  } else if (diffHours > 0) {
    return `${diffHours}h ago`;
  } else if (diffMins > 0) {
    return `${diffMins}m ago`;
  } else {
    return 'just now';
  }
}

export class ListCommand {
  async execute(targetPath: string = '.', mode: 'changes' | 'specs' = 'changes', options: ListOptions = {}): Promise<void> {
    const { sort = 'recent', json = false } = options;

    if (mode === 'changes') {
      const changesDir = path.join(targetPath, 'openspec', 'changes');

      try {
        await fs.access(changesDir);
      } catch {
        throw new Error("No OpenSpec changes directory found. Run 'openspec init' first.");
      }

      const entries = await fs.readdir(changesDir, { withFileTypes: true });
      const changeDirs = entries
        .filter(entry => entry.isDirectory() && entry.name !== 'archive')
        .map(entry => entry.name);

      const changes: ChangeInfo[] = [];

      // Collect local changes
      for (const changeDir of changeDirs) {
        const progress = await getTaskProgressForChange(changesDir, changeDir);
        const changePath = path.join(changesDir, changeDir);
        const lastModified = await getLastModified(changePath);
        changes.push({
          name: changeDir,
          completedTasks: progress.completed,
          totalTasks: progress.total,
          lastModified
        });
      }

      // Worktree fallback: if no local changes found, scan worktree directories
      if (changes.length === 0) {
        const worktreeChanges = await this.discoverWorktreeChanges(targetPath);
        changes.push(...worktreeChanges);
      }

      if (changes.length === 0) {
        if (json) {
          console.log(JSON.stringify({ changes: [] }));
        } else {
          console.log('No active changes found.');
        }
        return;
      }

      if (sort === 'recent') {
        changes.sort((a, b) => b.lastModified.getTime() - a.lastModified.getTime());
      } else {
        changes.sort((a, b) => a.name.localeCompare(b.name));
      }

      if (json) {
        const jsonOutput = changes.map(c => {
          const entry: Record<string, unknown> = {
            name: c.name,
            completedTasks: c.completedTasks,
            totalTasks: c.totalTasks,
            lastModified: c.lastModified.toISOString(),
            status: c.totalTasks === 0 ? 'no-tasks' : c.completedTasks === c.totalTasks ? 'complete' : 'in-progress'
          };
          if (c.worktree) {
            entry.worktree = c.worktree;
          }
          return entry;
        });
        console.log(JSON.stringify({ changes: jsonOutput }, null, 2));
        return;
      }

      console.log('Changes:');
      const padding = '  ';
      const nameWidth = Math.max(...changes.map(c => c.name.length));
      for (const change of changes) {
        const paddedName = change.name.padEnd(nameWidth);
        const status = formatTaskStatus({ total: change.totalTasks, completed: change.completedTasks });
        const timeAgo = formatRelativeTime(change.lastModified);
        const worktreeLabel = change.worktree ? ` [worktree: ${change.worktree}]` : '';
        console.log(`${padding}${paddedName}     ${status.padEnd(12)}  ${timeAgo}${worktreeLabel}`);
      }
      return;
    }

    // specs mode
    const specsDir = path.join(targetPath, 'openspec', 'specs');
    try {
      await fs.access(specsDir);
    } catch {
      console.log('No specs found.');
      return;
    }

    const entries = await fs.readdir(specsDir, { withFileTypes: true });
    const specDirs = entries.filter(e => e.isDirectory()).map(e => e.name);
    if (specDirs.length === 0) {
      console.log('No specs found.');
      return;
    }

    type SpecInfo = { id: string; requirementCount: number };
    const specs: SpecInfo[] = [];
    for (const id of specDirs) {
      const specPath = join(specsDir, id, 'spec.md');
      try {
        const content = readFileSync(specPath, 'utf-8');
        const parser = new MarkdownParser(content);
        const spec = parser.parseSpec(id);
        specs.push({ id, requirementCount: spec.requirements.length });
      } catch {
        // If spec cannot be read or parsed, include with 0 count
        specs.push({ id, requirementCount: 0 });
      }
    }

    specs.sort((a, b) => a.id.localeCompare(b.id));
    console.log('Specs:');
    const padding = '  ';
    const nameWidth = Math.max(...specs.map(s => s.id.length));
    for (const spec of specs) {
      const padded = spec.id.padEnd(nameWidth);
      console.log(`${padding}${padded}     requirements ${spec.requirementCount}`);
    }
  }

  /**
   * Discover changes inside git worktrees when isolation.mode is 'worktree'.
   * Scans the worktree root directory, verifies each is a registered git worktree,
   * and checks for openspec/changes/<name>/ inside.
   * Returns empty array if isolation is not configured or scanning fails.
   */
  private async discoverWorktreeChanges(targetPath: string): Promise<ChangeInfo[]> {
    let config;
    try {
      config = readProjectConfig(targetPath);
    } catch {
      return [];
    }

    if (!config?.isolation?.mode || config.isolation.mode !== 'worktree') {
      return [];
    }

    const worktreeRoot = config.isolation.root || '.worktrees';
    const absoluteWorktreeRoot = path.resolve(targetPath, worktreeRoot);

    if (!existsSync(absoluteWorktreeRoot)) {
      return [];
    }

    let registeredWorktrees: Set<string>;
    try {
      const output = execFileSync('git', ['worktree', 'list', '--porcelain'], {
        encoding: 'utf-8',
        stdio: 'pipe',
        cwd: targetPath,
      });
      registeredWorktrees = new Set(
        output
          .split('\n')
          .filter(line => line.startsWith('worktree '))
          .map(line => path.resolve(line.slice('worktree '.length).trim()))
      );
    } catch {
      return [];
    }

    let worktreeDirs: string[];
    try {
      const entries = await fs.readdir(absoluteWorktreeRoot, { withFileTypes: true });
      worktreeDirs = entries.filter(e => e.isDirectory()).map(e => e.name);
    } catch {
      return [];
    }

    const changes: ChangeInfo[] = [];

    for (const dir of worktreeDirs) {
      const worktreePath = path.resolve(absoluteWorktreeRoot, dir);

      if (!registeredWorktrees.has(worktreePath)) {
        continue;
      }

      const changesDir = path.join(worktreePath, 'openspec', 'changes');
      if (!existsSync(changesDir)) {
        continue;
      }

      let changeDirEntries;
      try {
        changeDirEntries = await fs.readdir(changesDir, { withFileTypes: true });
      } catch {
        continue;
      }

      const changeNames = changeDirEntries
        .filter(e => e.isDirectory() && e.name !== 'archive')
        .map(e => e.name);

      for (const changeName of changeNames) {
        const changePath = path.join(changesDir, changeName);
        const progress = await getTaskProgressForChange(changesDir, changeName);
        const lastModified = await getLastModified(changePath);
        changes.push({
          name: changeName,
          completedTasks: progress.completed,
          totalTasks: progress.total,
          lastModified,
          worktree: worktreePath,
        });
      }
    }

    return changes;
  }
}