import { promises as fs } from 'fs';
import path from 'path';
import { getTaskProgressForChange, formatTaskStatus } from '../utils/task-progress.js';
import { readFileSync } from 'fs';
import { join } from 'path';
import { MarkdownParser } from './parsers/markdown-parser.js';
import type { TrackedIssue } from './schemas/index.js';

interface ChangeInfo {
  name: string;
  completedTasks: number;
  totalTasks: number;
  trackedIssue?: string;
}

export class ListCommand {
  async execute(targetPath: string = '.', mode: 'changes' | 'specs' = 'changes'): Promise<void> {
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
        console.log('No active changes found.');
        return;
      }

      // Collect information about each change
      const changes: ChangeInfo[] = [];

      for (const changeDir of changeDirs) {
        const progress = await getTaskProgressForChange(changesDir, changeDir);

        // Try to get tracked issue from proposal.md frontmatter
        let trackedIssue: string | undefined;
        try {
          const proposalPath = path.join(changesDir, changeDir, 'proposal.md');
          const proposalContent = await fs.readFile(proposalPath, 'utf-8');
          const parser = new MarkdownParser(proposalContent);
          const frontmatter = parser.getFrontmatter();
          if (frontmatter?.trackedIssues && frontmatter.trackedIssues.length > 0) {
            trackedIssue = frontmatter.trackedIssues[0].id;
          }
        } catch {
          // proposal.md might not exist or be unreadable
        }

        changes.push({
          name: changeDir,
          completedTasks: progress.completed,
          totalTasks: progress.total,
          trackedIssue,
        });
      }

      // Sort alphabetically by name
      changes.sort((a, b) => a.name.localeCompare(b.name));

      // Display results
      console.log('Changes:');
      const padding = '  ';
      const nameWidth = Math.max(...changes.map(c => c.name.length));
      for (const change of changes) {
        const paddedName = change.name.padEnd(nameWidth);
        const issueDisplay = change.trackedIssue ? ` (${change.trackedIssue})` : '';
        const status = formatTaskStatus({ total: change.totalTasks, completed: change.completedTasks });
        console.log(`${padding}${paddedName}${issueDisplay}     ${status}`);
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