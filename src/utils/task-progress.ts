import { promises as fs } from 'fs';
import path from 'path';

const TASK_PATTERN = /^[-*]\s+\[[\sx]\]/i;
const COMPLETED_TASK_PATTERN = /^[-*]\s+\[x\]/i;

export interface TaskProgress {
  total: number;
  completed: number;
}

export function countTasksFromContent(content: string): TaskProgress {
  const lines = content.split('\n');
  let total = 0;
  let completed = 0;
  for (const line of lines) {
    if (line.match(TASK_PATTERN)) {
      total++;
      if (line.match(COMPLETED_TASK_PATTERN)) {
        completed++;
      }
    }
  }
  return { total, completed };
}

export async function getTaskProgressForChange(changesDir: string, changeName: string): Promise<TaskProgress> {
  const changeDir = path.join(changesDir, changeName);
  try {
    const taskFiles = await findTaskFiles(changeDir);
    const progress = { total: 0, completed: 0 };
    for (const taskFile of taskFiles) {
      const content = await fs.readFile(taskFile, 'utf-8');
      const fileProgress = countTasksFromContent(content);
      progress.total += fileProgress.total;
      progress.completed += fileProgress.completed;
    }
    return progress;
  } catch {
    return { total: 0, completed: 0 };
  }
}

async function findTaskFiles(dir: string): Promise<string[]> {
  const taskFiles: string[] = [];
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const entryPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      taskFiles.push(...await findTaskFiles(entryPath));
    }
    else if (entry.isFile() && entry.name === 'tasks.md') {
      taskFiles.push(entryPath);
    }
  }
  return taskFiles.sort();
}

export function formatTaskStatus(progress: TaskProgress): string {
  if (progress.total === 0) return 'No tasks';
  if (progress.completed === progress.total) return '✓ Complete';
  return `${progress.completed}/${progress.total} tasks`;
}

