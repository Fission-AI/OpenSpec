import { promises as fs } from 'fs';
import path from 'path';
import { getTaskProgressForChange, formatTaskStatus } from '../utils/task-progress.js';
import { readFileSync } from 'fs';
import { join } from 'path';
import { MarkdownParser } from './parsers/markdown-parser.js';

interface ChangeInfo {
  name: string;
  completedTasks: number;
  totalTasks: number;
  archived?: boolean;
}

export interface ListOptions {
  archived?: boolean;
  all?: boolean;
}

export class ListCommand {
  async execute(targetPath: string = '.', mode: 'changes' | 'specs' = 'changes', options: ListOptions = {}): Promise<void> {
    if (mode === 'changes') {
      const changesDir = path.join(targetPath, 'openspec', 'changes');

      // Check if changes directory exists
      try {
        await fs.access(changesDir);
      } catch {
        throw new Error("No OpenSpec changes directory found. Run 'openspec init' first.");
      }

      const showArchived = options.archived || options.all;
      const showActive = !options.archived || options.all;

      // Get all directories in changes (excluding archive)
      const entries = await fs.readdir(changesDir, { withFileTypes: true });
      const changeDirs = showActive
        ? entries
            .filter(entry => entry.isDirectory() && entry.name !== 'archive')
            .map(entry => entry.name)
        : [];

      // Get archived changes if requested
      let archivedDirs: string[] = [];
      if (showArchived) {
        const archiveDir = path.join(changesDir, 'archive');
        try {
          await fs.access(archiveDir);
          const archiveEntries = await fs.readdir(archiveDir, { withFileTypes: true });
          archivedDirs = archiveEntries
            .filter(entry => entry.isDirectory())
            .map(entry => entry.name);
        } catch {
          // Archive directory doesn't exist, that's fine
        }
      }

      if (changeDirs.length === 0 && archivedDirs.length === 0) {
        if (options.archived) {
          console.log('No archived changes found.');
        } else if (options.all) {
          console.log('No changes found.');
        } else {
          console.log('No active changes found.');
        }
        return;
      }

      // Collect information about each active change
      const changes: ChangeInfo[] = [];

      for (const changeDir of changeDirs) {
        const progress = await getTaskProgressForChange(changesDir, changeDir);
        changes.push({
          name: changeDir,
          completedTasks: progress.completed,
          totalTasks: progress.total
        });
      }

      // Collect information about each archived change
      const archivedChanges: ChangeInfo[] = [];
      const archiveDir = path.join(changesDir, 'archive');

      for (const changeDir of archivedDirs) {
        const progress = await getTaskProgressForChange(archiveDir, changeDir);
        archivedChanges.push({
          name: changeDir,
          completedTasks: progress.completed,
          totalTasks: progress.total,
          archived: true
        });
      }

      // Sort alphabetically by name
      changes.sort((a, b) => a.name.localeCompare(b.name));
      archivedChanges.sort((a, b) => a.name.localeCompare(b.name));

      // Display active changes
      if (changes.length > 0) {
        console.log('Changes:');
        const padding = '  ';
        const nameWidth = Math.max(...changes.map(c => c.name.length));
        for (const change of changes) {
          const paddedName = change.name.padEnd(nameWidth);
          const status = formatTaskStatus({ total: change.totalTasks, completed: change.completedTasks });
          console.log(`${padding}${paddedName}     ${status}`);
        }
      }

      // Display archived changes
      if (archivedChanges.length > 0) {
        if (changes.length > 0) {
          console.log('');  // Add spacing between sections
        }
        console.log('Archived Changes:');
        const padding = '  ';
        const nameWidth = Math.max(...archivedChanges.map(c => c.name.length));
        for (const change of archivedChanges) {
          const paddedName = change.name.padEnd(nameWidth);
          const status = formatTaskStatus({ total: change.totalTasks, completed: change.completedTasks });
          console.log(`${padding}${paddedName}     ${status}`);
        }
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