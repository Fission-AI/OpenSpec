export interface TaskProgress {
    total: number;
    completed: number;
}
export declare function countTasksFromContent(content: string): TaskProgress;
export declare function getTaskProgressForChange(changesDir: string, changeName: string): Promise<TaskProgress>;
export declare function formatTaskStatus(progress: TaskProgress): string;
//# sourceMappingURL=task-progress.d.ts.map