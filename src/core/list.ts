import { promises as fs } from 'fs';
import path from 'path';
import { getTaskProgressForChange } from '../utils/task-progress.js';
import { readFileSync } from 'fs';
import { join } from 'path';
import { MarkdownParser } from './parsers/markdown-parser.js';
import { resolveOpenSpecDir } from './path-resolver.js';
import { FileSystemUtils } from '../utils/file-system.js';

export interface ChangeInfo {
  name: string;
  completedTasks: number;
  totalTasks: number;
  lastModified: Date;
}

export interface SpecInfo { 
    id: string; 
    requirementCount: number; 
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

export async function listChanges(targetPath: string, sort: 'recent' | 'name' = 'recent'): Promise<ChangeInfo[]> {
    const openspecPath = await resolveOpenSpecDir(targetPath);
    const changesDir = path.join(openspecPath, 'changes');

    // Check if changes directory exists
    if (!await FileSystemUtils.directoryExists(changesDir)) {
         // Return empty if directory doesn't exist, or throw? The original code threw error.
         throw new Error("No OpenSpec changes directory found. Run 'openspec init' first.");
    }

    // Get all directories in changes (excluding archive)
    const entries = await fs.readdir(changesDir, { withFileTypes: true });
    const changeDirs = entries
    .filter(entry => entry.isDirectory() && entry.name !== 'archive')
    .map(entry => entry.name);

    if (changeDirs.length === 0) {
        return [];
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
    
    return changes;
}

export async function listSpecs(targetPath: string): Promise<SpecInfo[]> {
    const openspecPath = await resolveOpenSpecDir(targetPath);
    const specsDir = path.join(openspecPath, 'specs');
    
    if (!await FileSystemUtils.directoryExists(specsDir)) {
        return [];
    }

    const entries = await fs.readdir(specsDir, { withFileTypes: true });
    const specDirs = entries.filter(e => e.isDirectory()).map(e => e.name);
    
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
    return specs;
}
