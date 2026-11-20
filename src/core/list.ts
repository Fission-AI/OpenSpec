import { promises as fs } from 'fs';
import { discoverListLibraries, type ListLibrary } from './list-discovery.js';
import path from 'path';
import chalk from 'chalk';
import { getTaskProgressForChange, getTaskProgressDetailForChange, formatTaskStatus } from '../utils/task-progress.js';
import { readFileSync, type Dirent } from 'fs';
import { MarkdownParser } from './parsers/markdown-parser.js';
import type { RootOutput } from './root-selection.js';
import { discoverSpecFiles } from '../utils/spec-discovery.js';
import {
  describeNestedChange,
  findNestedChanges,
  type NestedChangeFinding,
} from '../utils/nested-change.js';

interface ChangeInfo {
  name: string;
  completedTasks: number;
  totalTasks: number;
  lastModified: Date;
  archived: boolean;
  /** Set when the entry is a namespace folder rather than a change (#1846). */
  nested?: string[];
}

interface ListOptions {
  sort?: 'recent' | 'name';
  json?: boolean;
  root?: RootOutput;
  archived?: boolean;
  all?: boolean;
  recursive?: boolean;
}

function isMissingPathError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as NodeJS.ErrnoException).code === 'ENOENT'
  );
}

/**
 * An entry that cannot be dated because it no longer resolves: it was removed
 * after `readdir` listed it, or it is a symlink whose target is missing (an
 * Emacs `.#file` lock) or that loops back on itself.
 */
function isUnresolvableEntryError(error: unknown): boolean {
  if (typeof error !== 'object' || error === null || !('code' in error)) return false;
  const code = (error as NodeJS.ErrnoException).code;
  return code === 'ENOENT' || code === 'ELOOP';
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
 * Archived links use their own mtime: moving a change can break relative targets.
 */
async function getLastModified(dirPath: string, archived: boolean = false): Promise<Date> {
  let latest: Date | null = null;

  async function walk(dir: string): Promise<void> {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      try {
        if (entry.isDirectory()) {
          await walk(fullPath);
        } else {
          const stat = archived && entry.isSymbolicLink()
            ? await fs.lstat(fullPath)
            : await fs.stat(fullPath);
          if (latest === null || stat.mtime > latest) {
            latest = stat.mtime;
          }
        }
      } catch (error) {
        // Skip the one entry rather than fail the listing of every change.
        if (!isUnresolvableEntryError(error)) throw error;
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
    if (options.recursive) {
      const libraries = await discoverListLibraries(targetPath);
      if (options.json && libraries.length === 1 && libraries[0].diagnostic) {
        throw new Error(libraries[0].diagnostic);
      }
      if (libraries.length > 1 || libraries.some(library => library.diagnostic) || (!options.json && libraries.length > 0)) {
        await this.executeLibraries(libraries, mode, options);
        return;
      }
      if (libraries.length === 1) {
        targetPath = libraries[0].path;
        if (options.root) options = { ...options, root: { ...options.root, path: targetPath } };
      }
    }
    await this.executeSingle(targetPath, mode, options);
  }

  private async executeLibraries(libraries: ListLibrary[], mode: 'changes' | 'specs', options: ListOptions): Promise<void> {
    const groups = [];
    for (const library of libraries) {
      let payload: Record<string, any> = { [mode]: [] };
      let diagnostic = library.diagnostic;
      if (!diagnostic) {
        try {
          await this.executeSingle(library.path, mode, { ...options, json: true, root: undefined }, text => {
            payload = JSON.parse(text);
          });
        } catch (error) {
          diagnostic = `${(error as Error).message}. Check this library's layout and read permissions.`;
        }
      }
      groups.push({ ...library, payload, diagnostic });
    }
    const entries = groups.flatMap(group => group.payload[mode].map((entry: object) => ({ ...entry, library: group.library })));
    const diagnostics = groups.filter(group => group.diagnostic).map(group => ({
      library: group.library, code: 'library_read_error', message: group.diagnostic,
    }));
    const warnings = groups.flatMap(group => (group.payload.warnings ?? []).map((warning: object) => ({ ...warning, library: group.library })));
    if (options.json) {
      console.log(JSON.stringify({
        [mode]: entries,
        ...(options.root ? { root: options.root } : {}),
        roots: groups.map(group => ({ path: group.path, library: group.library })),
        ...(diagnostics.length ? { diagnostics } : {}),
        ...(warnings.length ? { warnings } : {}),
      }, null, 2));
    } else {
      const heading = mode === 'specs' ? 'Specs' : options.archived ? 'Archived changes' : 'Changes';
      console.log(`${chalk.bold(heading)} ${chalk.dim(`— ${groups.length} libraries, ${entries.length} ${mode}`)}`);
      for (const group of groups) {
        console.log(`\n${chalk.bold.cyan(group.library)}${group.library === 'openspec/' ? chalk.dim(' (root)') : ''}`);
        if (group.diagnostic) {
          console.log(chalk.red(`  Error: ${group.diagnostic}`));
          continue;
        }
        const items = group.payload[mode];
        if (!items.length) console.log(chalk.dim(mode === 'specs' ? '  No specs found.' : options.archived ? '  No archived changes found.' : options.all ? '  No changes found.' : '  No active changes found.'));
        const width = Math.max(0, ...items.map((item: any) => (item.name ?? item.id).length));
        for (const item of items) {
          const name = item.name ?? item.id;
          const status = mode === 'specs' ? `requirements ${item.requirementCount}` : item.nested ? 'not a change' : formatTaskStatus({ total: item.totalTasks, completed: item.completedTasks });
          const recency = mode === 'changes' ? formatRelativeTime(new Date(item.lastModified)) : '';
          const archiveLabel = item.archived ? '  archived' : '';
          const plainSuffix = mode === 'specs' ? status : `${status.padEnd(12)}  ${recency}${archiveLabel}`;
          const statusColor = mode === 'specs' ? chalk.blue : item.nested ? chalk.yellow
            : item.totalTasks === 0 ? chalk.dim : item.completedTasks === item.totalTasks ? chalk.green : chalk.yellow;
          const suffix = mode === 'specs' ? statusColor(status)
            : `${statusColor(status.padEnd(12))}  ${chalk.dim(recency + archiveLabel)}`;
          if (width + plainSuffix.length + 7 > (process.stdout.columns ?? 100)) {
            console.log(`  ${name}\n    ${suffix}`);
          } else {
            console.log(`  ${name.padEnd(width)}     ${suffix}`);
          }
        }
        for (const warning of group.payload.warnings ?? []) console.log(chalk.yellow(`  Warning: ${warning.message}`));
      }
    }
    if (diagnostics.length) process.exitCode = 1;
  }

  private async executeSingle(targetPath: string, mode: 'changes' | 'specs', options: ListOptions, output: (text: string) => void = console.log): Promise<void> {
    const { sort = 'recent', json = false, root, archived = false, all = false } = options;

    if (mode === 'specs' && (archived || all)) {
      throw new Error('--archived and --all can only be used when listing changes.');
    }

    if (mode === 'changes') {
      const changesDir = path.join(targetPath, 'openspec', 'changes');
      const archiveDir = path.join(changesDir, 'archive');
      const includeArchived = archived || all;

      // Read the parent even for --archived: Windows can report ENOENT for
      // changes/archive when changes is a file, hiding a malformed root.
      const entries = await readChangeDirectoryEntries(changesDir);
      const activeDirs = !archived || all ? entries
        .filter(entry => entry.isDirectory() && entry.name !== 'archive')
        .map(entry => ({ name: entry.name, parent: changesDir, archived: false })) : [];
      const archiveEntries = includeArchived ? await readChangeDirectoryEntries(archiveDir) : [];
      const archivedDirs = archiveEntries
        .filter(entry => entry.isDirectory() && !entry.name.startsWith('.'))
        .map(entry => ({ name: entry.name, parent: archiveDir, archived: true }));
      const changeDirs = [...activeDirs, ...archivedDirs];

      if (changeDirs.length === 0) {
        if (json) {
          output(JSON.stringify({ changes: [], ...(root ? { root } : {}) }, null, 2));
        } else {
          output(all ? 'No changes found.' : archived ? 'No archived changes found.' : 'No active changes found.');
        }
        return;
      }

      // Collect information about each change
      const changes: ChangeInfo[] = [];

      // A directory that only wraps nested change directories is still listed -
      // hiding it would hide a real change whenever the probe is wrong - but it
      // is listed as what it is, so the nesting stops failing silently (#1846).
      const nestedFindings = await findNestedChanges(
        changesDir,
        activeDirs.map((changeDir) => changeDir.name)
      );
      const nestedByName = new Map<string, NestedChangeFinding>(
        nestedFindings.map((finding) => [finding.name, finding])
      );

      for (const changeDir of changeDirs) {
        const detail = options.recursive
          ? await getTaskProgressDetailForChange(changeDir.parent, changeDir.name, targetPath)
          : undefined;
        const progress = detail ?? await getTaskProgressForChange(changeDir.parent, changeDir.name, targetPath);
        if (detail?.unreadable.length) {
          throw new Error(`Cannot read task files for ${changeDir.name}`);
        }
        const changePath = path.join(changeDir.parent, changeDir.name);
        const lastModified = await getLastModified(changePath, changeDir.archived);
        changes.push({
          name: changeDir.name,
          completedTasks: progress.completed,
          totalTasks: progress.total,
          lastModified,
          archived: changeDir.archived,
          ...(!changeDir.archived && nestedByName.has(changeDir.name)
            ? { nested: nestedByName.get(changeDir.name)!.nested }
            : {})
        });
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
          status: c.totalTasks === 0 ? 'no-tasks' : c.completedTasks === c.totalTasks ? 'complete' : 'in-progress',
          ...(includeArchived ? { archived: c.archived } : {}),
          ...(c.nested ? { nested: c.nested } : {})
        }));
        // Additive: the entries keep their shape so existing consumers are
        // unaffected, and the nesting is reported alongside them.
        const warnings = nestedFindings.map((finding) => ({
          code: 'nested_change_directory',
          name: finding.name,
          nested: finding.nested,
          message: describeNestedChange(finding)
        }));
        output(JSON.stringify({
          changes: jsonOutput,
          ...(warnings.length > 0 ? { warnings } : {}),
          ...(root ? { root } : {})
        }, null, 2));
        return;
      }

      // Display results
      const groups = [
        { heading: 'Changes:', changes: changes.filter(change => !change.archived) },
        { heading: 'Archived Changes:', changes: changes.filter(change => change.archived) }
      ].filter(group => group.changes.length > 0);
      for (const [index, group] of groups.entries()) {
        if (index > 0) output('');
        output(group.heading);
        const padding = '  ';
        const nameWidth = Math.max(...group.changes.map(c => c.name.length));
        for (const change of group.changes) {
          const paddedName = change.name.padEnd(nameWidth);
          const status = change.nested
            ? 'not a change'
            : formatTaskStatus({ total: change.totalTasks, completed: change.completedTasks });
          const timeAgo = formatRelativeTime(change.lastModified);
          output(`${padding}${paddedName}     ${status.padEnd(12)}  ${timeAgo}`);
        }
      }
      for (const finding of nestedFindings) {
        output('');
        output(`Warning: ${describeNestedChange(finding)}`);
      }
      return;
    }

    // specs mode
    const specsDir = path.join(targetPath, 'openspec', 'specs');
    try {
      await fs.access(specsDir);
    } catch (error) {
      if (!isMissingPathError(error)) throw error;
      if (json) {
        output(JSON.stringify({ specs: [], ...(root ? { root } : {}) }, null, 2));
      } else {
        output('No specs found.');
      }
      return;
    }

    const discovered = await discoverSpecFiles(specsDir);
    if (discovered.length === 0) {
      if (json) {
        output(JSON.stringify({ specs: [], ...(root ? { root } : {}) }, null, 2));
      } else {
        output('No specs found.');
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
      } catch (error) {
        if (options.recursive) throw error;
        // If spec cannot be read or parsed, include with 0 count
        specs.push({ id, requirementCount: 0 });
      }
    }

    specs.sort((a, b) => a.id.localeCompare(b.id));

    if (json) {
      output(JSON.stringify({ specs, ...(root ? { root } : {}) }, null, 2));
      return;
    }

    output('Specs:');
    const padding = '  ';
    const nameWidth = Math.max(...specs.map(s => s.id.length));
    for (const spec of specs) {
      const padded = spec.id.padEnd(nameWidth);
      output(`${padding}${padded}     requirements ${spec.requirementCount}`);
    }
  }
}
