import { promises as fs } from 'fs';
import path from 'path';
import { getTaskProgressForChange, formatTaskStatus } from '../utils/task-progress.js';
import { readFileSync } from 'fs';
import { join } from 'path';
import { MarkdownParser } from './parsers/markdown-parser.js';
import { ChangeParser } from './parsers/change-parser.js';
import { formatSpaceline, type ChangeData, type SpacelineStats } from '../utils/spaceline-formatter.js';
import { getGitDiffStatsForPath } from '../utils/git-stats.js';

interface ChangeInfo {
  name: string;
  completedTasks: number;
  totalTasks: number;
  lastModified: Date;
}

interface ListOptions {
  sort?: 'recent' | 'name';
  json?: boolean;
  spaceline?: boolean;
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
  /**
   * Extract title from proposal.md content.
   */
  private extractTitle(content: string, changeName: string): string {
    const match = content.match(/^#\s+(?:Change:\s+)?(.+)$/im);
    return match ? match[1].trim() : changeName;
  }

  /**
   * Execute spaceline output mode.
   */
  private async executeSpaceline(targetPath: string, sort: 'recent' | 'name'): Promise<void> {
    const changesDir = path.join(targetPath, 'openspec', 'changes');

    // Check if changes directory exists
    try {
      await fs.access(changesDir);
    } catch {
      throw new Error("No OpenSpec changes directory found. Run 'openspec init' first.");
    }

    // Get all directories in changes (excluding archive)
    const entries = await fs.readdir(changesDir, { withFileTypes: true });
    const changeDirs = entries
      .filter(entry => entry.isDirectory() && entry.name !== 'archive')
      .map(entry => entry.name);

    if (changeDirs.length === 0) {
      console.log('No active changes found.');
      return;
    }

    // Collect spaceline data for each change
    const changesData: Array<{ changeData: ChangeData; stats: SpacelineStats; lastModified: Date }> = [];

    for (const changeDir of changeDirs) {
      const progress = await getTaskProgressForChange(changesDir, changeDir);
      const changePath = path.join(changesDir, changeDir);
      const proposalPath = path.join(changePath, 'proposal.md');

      let deltaCount = 0;
      let title = changeDir;

      try {
        const proposalContent = await fs.readFile(proposalPath, 'utf-8');
        title = this.extractTitle(proposalContent, changeDir);
        const parser = new ChangeParser(proposalContent, changePath);
        const change = await parser.parseChangeWithDeltas(changeDir);
        deltaCount = change.deltas.length;
      } catch {
        // Unable to read proposal or parse deltas
      }

      const changeData: ChangeData = {
        id: changeDir,
        title,
        completedTasks: progress.completed,
        totalTasks: progress.total,
        deltaCount,
      };

      const git = getGitDiffStatsForPath(changePath);
      const stats: SpacelineStats = {
        git,
        openItems: progress.total - progress.completed, // Simple approximation
      };

      const lastModified = await getLastModified(changePath);
      changesData.push({ changeData, stats, lastModified });
    }

    // Sort by preference (spaceline uses alphabetical by default for readability)
    const sorted = sort === 'name'
      ? changesData.sort((a, b) => a.changeData.id.localeCompare(b.changeData.id))
      : changesData.sort((a, b) => a.changeData.id.localeCompare(b.changeData.id));

    // Display results
    for (const { changeData, stats } of sorted) {
      const lines = formatSpaceline(changeData, stats);
      for (const line of lines) {
        console.log(line);
      }
      console.log(); // Empty line between changes
    }
  }

  async execute(targetPath: string = '.', mode: 'changes' | 'specs' = 'changes', options: ListOptions = {}): Promise<void> {
    const { sort = 'recent', json = false, spaceline = false } = options;

    // Spaceline mode (only for changes)
    if (mode === 'changes' && spaceline) {
      return this.executeSpaceline(targetPath, sort);
    }

    if (mode === 'changes') {
      const changesDir = path.join(targetPath, 'openspec', 'changes');

      // Check if changes directory exists
      try {
        await fs.access(changesDir);
      } catch {
        throw new Error("No OpenSpec changes directory found. Run 'openspec init' first.");
      }

      // Get all directories in changes (excluding archive)
      const entries = await fs.readdir(changesDir, { withFileTypes: true });
      const changeDirs = entries
        .filter(entry => entry.isDirectory() && entry.name !== 'archive')
        .map(entry => entry.name);

      if (changeDirs.length === 0) {
        if (json) {
          console.log(JSON.stringify({ changes: [] }));
        } else {
          console.log('No active changes found.');
        }
        return;
      }

      // Collect information about each change
      const changes: ChangeInfo[] = [];

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
          status: c.totalTasks === 0 ? 'no-tasks' : c.completedTasks === c.totalTasks ? 'complete' : 'in-progress'
        }));
        console.log(JSON.stringify({ changes: jsonOutput }, null, 2));
        return;
      }

      // Display results
      console.log('Changes:');
      const padding = '  ';
      const nameWidth = Math.max(...changes.map(c => c.name.length));
      for (const change of changes) {
        const paddedName = change.name.padEnd(nameWidth);
        const status = formatTaskStatus({ total: change.totalTasks, completed: change.completedTasks });
        const timeAgo = formatRelativeTime(change.lastModified);
        console.log(`${padding}${paddedName}     ${status.padEnd(12)}  ${timeAgo}`);
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
}