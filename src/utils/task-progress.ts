import { promises as fs } from 'fs';
import path from 'path';
import { TASK_PROGRESS_MESSAGES } from '../messages/index.js';

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
  const tasksPath = path.join(changesDir, changeName, 'tasks.md');
  try {
    const content = await fs.readFile(tasksPath, 'utf-8');
    return countTasksFromContent(content);
  } catch {
    return { total: 0, completed: 0 };
  }
}

export function formatTaskStatus(progress: TaskProgress): string {
  if (progress.total === 0) return TASK_PROGRESS_MESSAGES.noTasks;
  if (progress.completed === progress.total) return TASK_PROGRESS_MESSAGES.complete;
  return TASK_PROGRESS_MESSAGES.tasksCount(progress.completed, progress.total);
}


