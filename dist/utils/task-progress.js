import { promises as fs } from 'fs';
import path from 'path';
const TASK_PATTERN = /^[-*]\s+\[[\sx]\]/i;
const COMPLETED_TASK_PATTERN = /^[-*]\s+\[x\]/i;
export function countTasksFromContent(content) {
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
export async function getTaskProgressForChange(changesDir, changeName) {
    const tasksPath = path.join(changesDir, changeName, 'tasks.md');
    try {
        const content = await fs.readFile(tasksPath, 'utf-8');
        return countTasksFromContent(content);
    }
    catch {
        return { total: 0, completed: 0 };
    }
}
export function formatTaskStatus(progress) {
    if (progress.total === 0)
        return 'No tasks';
    if (progress.completed === progress.total)
        return '✓ Complete';
    return `${progress.completed}/${progress.total} tasks`;
}
//# sourceMappingURL=task-progress.js.map