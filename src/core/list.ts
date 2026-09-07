import { promises as fs } from 'fs';
import path from 'path';
import { getTaskProgressForChange, formatTaskStatus } from '../utils/task-progress.js';
import { readFileSync, type Dirent } from 'fs';
import { MarkdownParser } from './parsers/markdown-parser.js';
import type { RootOutput } from './root-selection.js';
import { discoverSpecFiles } from '../utils/spec-discovery.js';
import { readChangeStatus, type ChangeStatus } from '../utils/change-metadata.js';

interface ChangeInfo {
  name: string;
  completedTasks: number;
  totalTasks: number;
  lastModified: Date;
  /**
   * Only set when the change's `.openspec.yaml` declares `status` itself. Left
   * undefined otherwise so a project that never opts in sees no new column and
   * no new JSON key.
   */
  status?: ChangeStatus;
}

interface ListOptions {
  sort?: 'recent' | 'name';
  json?: boolean;
  root?: RootOutput;
  /** Filter to changes in this lifecycle state. Undeclared counts as `proposed`. */
  status?: ChangeStatus;
}

function isMissingPathError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as NodeJS.ErrnoException).code === 'ENOENT'
  );
}

async function readChangeDirectoryEntries(changesDir: string): Promise<Dirent[]> {
  try {
    return await fs.readdir(changesDir, { withFileTypes: true });
  } catch (error) {
    if (isMissingPathError(error)) return [];
    throw error;
  }
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
    const { sort = 'recent', json = false, root, status: statusFilter } = options;

    if (mode === 'changes') {
      const changesDir = path.join(targetPath, 'openspec', 'changes');

      // Get all directories in changes (excluding archive)
      const entries = await readChangeDirectoryEntries(changesDir);
      const changeDirs = entries
        .filter(entry => entry.isDirectory() && entry.name !== 'archive')
        .map(entry => entry.name);

      if (changeDirs.length === 0) {
        if (json) {
          console.log(JSON.stringify({ changes: [], ...(root ? { root } : {}) }, null, 2));
        } else {
          console.log('No active changes found.');
        }
        return;
      }

      // Collect information about each change
      const changes: ChangeInfo[] = [];

      for (const changeDir of changeDirs) {
        const changePath = path.join(changesDir, changeDir);
        // Undeclared reads as `proposed`, which is what a change under
        // `changes/` has always meant. Metadata that cannot be read is left
        // unfiltered rather than guessed at - `openspec sync --check` and
        // `openspec status` are where a broken file gets reported.
        const marker = readChangeStatus(changePath);
        if (statusFilter && !marker.invalidReason && marker.status !== statusFilter) {
          continue;
        }
        const progress = await getTaskProgressForChange(changesDir, changeDir, targetPath);
        const lastModified = await getLastModified(changePath);
        changes.push({
          name: changeDir,
          completedTasks: progress.completed,
          totalTasks: progress.total,
          lastModified,
          ...(marker.declared ? { status: marker.status } : {})
        });
      }

      if (changes.length === 0) {
        if (json) {
          console.log(JSON.stringify({ changes: [], ...(root ? { root } : {}) }, null, 2));
        } else {
          console.log(`No changes with status '${statusFilter}' found.`);
        }
        return;
      }

      // Sort by preference (default: recent first)
      if (sort === 'recent') {
        changes.sort((a, b) => b.lastModified.getTime() - a.lastModified.getTime());
      } else {
        changes.sort((a, b) => a.name.localeCompare(b.name));
      }

      // JSON output for programmatic use
      if (json) {
        const jsonOutput = changes.map(c => ({
          name: c.name,
          completedTasks: c.completedTasks,
          totalTasks: c.totalTasks,
          lastModified: c.lastModified.toISOString(),
          // `status` here has always meant task progress. The lifecycle state is
          // a different axis and gets its own key, emitted only when the change
          // declares one, so existing consumers see byte-identical output.
          status: c.totalTasks === 0 ? 'no-tasks' : c.completedTasks === c.totalTasks ? 'complete' : 'in-progress',
          ...(c.status ? { lifecycle: c.status } : {})
        }));
        console.log(JSON.stringify({ changes: jsonOutput, ...(root ? { root } : {}) }, null, 2));
        return;
      }

      // Display results
      console.log('Changes:');
      const padding = '  ';
      const nameWidth = Math.max(...changes.map(c => c.name.length));
      const anyLifecycleDeclared = changes.some(c => c.status !== undefined);
      for (const change of changes) {
        const paddedName = change.name.padEnd(nameWidth);
        const status = formatTaskStatus({ total: change.totalTasks, completed: change.completedTasks });
        const timeAgo = formatRelativeTime(change.lastModified);
        // Only rendered when some change in this root declares a lifecycle
        // state, so the default listing is unchanged for everyone else.
        const lifecycle = anyLifecycleDeclared
          ? `  ${(change.status ?? 'proposed').padEnd(8)}`
          : '';
        console.log(`${padding}${paddedName}${lifecycle}     ${status.padEnd(12)}  ${timeAgo}`);
      }
      return;
    }

    // specs mode
    const specsDir = path.join(targetPath, 'openspec', 'specs');
    try {
      await fs.access(specsDir);
    } catch {
      if (json) {
        console.log(JSON.stringify({ specs: [], ...(root ? { root } : {}) }, null, 2));
      } else {
        console.log('No specs found.');
      }
      return;
    }

    const discovered = await discoverSpecFiles(specsDir);
    if (discovered.length === 0) {
      if (json) {
        console.log(JSON.stringify({ specs: [], ...(root ? { root } : {}) }, null, 2));
      } else {
        console.log('No specs found.');
      }
      return;
    }

    type SpecInfo = { id: string; requirementCount: number };
    const specs: SpecInfo[] = [];
    for (const { id, specFile } of discovered) {
      try {
        const content = readFileSync(specFile, 'utf-8');
        const parser = new MarkdownParser(content);
        const spec = parser.parseSpec(id);
        specs.push({ id, requirementCount: spec.requirements.length });
      } catch {
        // If spec cannot be read or parsed, include with 0 count
        specs.push({ id, requirementCount: 0 });
      }
    }

    specs.sort((a, b) => a.id.localeCompare(b.id));

    if (json) {
      console.log(JSON.stringify({ specs, ...(root ? { root } : {}) }, null, 2));
      return;
    }

    console.log('Specs:');
    const padding = '  ';
    const nameWidth = Math.max(...specs.map(s => s.id.length));
    for (const spec of specs) {
      const padded = spec.id.padEnd(nameWidth);
      console.log(`${padding}${padded}     requirements ${spec.requirementCount}`);
    }
  }
}
