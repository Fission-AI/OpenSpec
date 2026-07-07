import { promises as fs } from 'fs';
import path from 'path';
import type { Artifact, SchemaYaml } from '../core/artifact-graph/index.js';
import { resolveArtifactOutputs, resolveSchema } from '../core/artifact-graph/index.js';
import { resolveSchemaForChange } from './change-metadata.js';

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

/**
 * Identifies the change's tracked-tasks artifact: the artifact whose `generates`
 * equals the schema's `apply.tracks` value, falling back to the artifact with id
 * `tasks` when no `apply` block declares what it tracks. (`apply.tracks` is a
 * filename that *selects* the artifact; the glob is that artifact's `generates`.)
 */
function findTrackedTasksArtifact(schema: SchemaYaml): Artifact | undefined {
  const tracks = schema.apply?.tracks;
  if (tracks != null) {
    return schema.artifacts.find((a) => a.generates === tracks);
  }
  return schema.artifacts.find((a) => a.id === 'tasks');
}

/**
 * Resolves the tracked-tasks artifact's output glob for a change, or undefined
 * when the schema cannot be resolved or no tracked-tasks artifact exists.
 * `resolveSchema` throws on an unresolvable/misnamed schema; we swallow that so
 * the caller falls back to a single top-level `tasks.md` and never crashes.
 */
function resolveTrackedTasksGlob(changeDir: string, projectRoot: string): string | undefined {
  try {
    const schemaName = resolveSchemaForChange(changeDir, undefined, projectRoot);
    const schema = resolveSchema(schemaName, projectRoot);
    return findTrackedTasksArtifact(schema)?.generates;
  } catch {
    return undefined;
  }
}

async function countSingleTopLevelTasksFile(changeDir: string): Promise<TaskProgress> {
  const tasksPath = path.join(changeDir, 'tasks.md');
  try {
    const content = await fs.readFile(tasksPath, 'utf-8');
    return countTasksFromContent(content);
  } catch {
    return { total: 0, completed: 0 };
  }
}

/**
 * Computes a change's task progress by resolving its tracked-tasks artifact and
 * counting checkboxes across every file matched by that artifact's `generates`
 * glob — the same file-resolution `openspec status` uses to detect the tasks
 * artifact (`resolveArtifactOutputs`) — so progress is no longer blind to nested
 * `tasks.md` files (#1202). Falls back to a single top-level `tasks.md` (exactly
 * as before) when the schema is unresolvable, no tracked-tasks artifact is found,
 * or the glob matches no file. Never throws.
 */
export async function getTaskProgressForChange(
  changesDir: string,
  changeName: string,
  projectRoot: string
): Promise<TaskProgress> {
  const changeDir = path.join(changesDir, changeName);

  const generates = resolveTrackedTasksGlob(changeDir, projectRoot);
  if (generates) {
    const files = resolveArtifactOutputs(changeDir, generates);
    if (files.length > 0) {
      let total = 0;
      let completed = 0;
      for (const file of files) {
        try {
          const content = await fs.readFile(file, 'utf-8');
          const progress = countTasksFromContent(content);
          total += progress.total;
          completed += progress.completed;
        } catch {
          // Swallow files that vanish between glob and read, as before.
        }
      }
      return { total, completed };
    }
  }

  return countSingleTopLevelTasksFile(changeDir);
}

export function formatTaskStatus(progress: TaskProgress): string {
  if (progress.total === 0) return 'No tasks';
  if (progress.completed === progress.total) return '✓ Complete';
  return `${progress.completed}/${progress.total} tasks`;
}


