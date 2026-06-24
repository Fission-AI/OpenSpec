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

async function collectTaskFiles(dir: string): Promise<string[]> {
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return [];
  }

  const taskFiles: string[] = [];
  for (const entry of entries) {
    const entryPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      taskFiles.push(...await collectTaskFiles(entryPath));
    } else if (entry.isFile() && entry.name === 'tasks.md') {
      taskFiles.push(entryPath);
    }
  }
  return taskFiles;
}

export async function getTaskProgressForChange(changesDir: string, changeName: string): Promise<TaskProgress> {
  const changeDir = path.join(changesDir, changeName);
  const taskFiles = await collectTaskFiles(changeDir);

  let total = 0;
  let completed = 0;
  for (const tasksPath of taskFiles.sort()) {
    let content;
    try {
      content = await fs.readFile(tasksPath, 'utf-8');
    } catch {
      continue;
    }
    const progress = countTasksFromContent(content);
    total += progress.total;
    completed += progress.completed;
  }

  return { total, completed };
}

export function formatTaskStatus(progress: TaskProgress): string {
  if (progress.total === 0) return 'No tasks';
  if (progress.completed === progress.total) return '✓ Complete';
  return `${progress.completed}/${progress.total} tasks`;
}


