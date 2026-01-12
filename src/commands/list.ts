import { formatTaskStatus } from '../utils/task-progress.js';
import { listChanges, listSpecs } from '../core/list.js';

interface ListOptions {
  sort?: 'recent' | 'name';
  json?: boolean;
}

/**
 * Format a date as relative time (e.g., "2 hours ago", "3 days ago")
 * Note: Copied from core/list.ts for presentation purposes, or should be exported?
 * It is presentation logic, so it belongs here or in a utils/format.ts. 
 * Since it was private in core/list.ts, I'll move it here as it's for console output.
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
        const changes = await listChanges(targetPath, sort);

      if (changes.length === 0) {
        if (json) {
          console.log(JSON.stringify({ changes: [] }));
        } else {
          console.log('No active changes found.');
        }
        return;
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
    const specs = await listSpecs(targetPath);
    if (specs.length === 0) {
      console.log('No specs found.');
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
