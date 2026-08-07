import { promises as fs } from 'fs';
import path from 'path';
import type { Artifact, SchemaYaml } from '../core/artifact-graph/index.js';
import { resolveArtifactOutputs, resolveSchema } from '../core/artifact-graph/index.js';
import { resolveSchemaForChange } from './change-metadata.js';

/**
 * A Markdown task line: a `-`/`*` bullet carrying a `[ ]` or `[x]` checkbox.
 *
 * Leading whitespace is allowed so nested sub-tasks count like their parents.
 * Anchoring at column 0 made `  - [ ] 1.1.1 ...` invisible to progress, to the
 * apply task list, and to archive's incomplete-task check, so a change with
 * unfinished sub-tasks reported "✓ Complete" and archived without a warning.
 *
 * Permissive on purpose, and safe to keep that way: any character class
 * tightened here - the `\s` inside the brackets, which lets a tab or
 * non-breaking space stand for an empty box - drops lines that used to count,
 * and a task this parser drops is a task `openspec archive` stops warning about.
 *
 * Deliberately unanchored at the end: `.` does not match `\r`, so writing the
 * description group as `(.*)$` would reject every line of a CRLF tasks.md.
 */
const TASK_LINE_PATTERN = /^\s*[-*]\s*\[([\sxX])\]\s*(.*)/;

export interface ParsedTask {
  /** Checkbox state: `[x]`/`[X]` is done, anything else is not. */
  done: boolean;
  /** Task text after the checkbox, trimmed (may be empty). */
  description: string;
}

/**
 * Parses every task line in a tasks file, in document order.
 *
 * Every line matching the pattern counts, wherever it sits - inside a code
 * fence, an HTML comment or an indented block, as before. Skipping fenced
 * checkboxes was tried and dropped: every rule for deciding which fence is
 * "real" has an input where a stray or unbalanced ``` swallows genuine tasks.
 * Counting a documented example as work is a loud, bypassable false positive;
 * losing a real task is a silent one.
 */
export function parseTaskLines(content: string): ParsedTask[] {
  const tasks: ParsedTask[] = [];

  for (const line of content.split('\n')) {
    const match = line.match(TASK_LINE_PATTERN);
    if (match) {
      tasks.push({ done: match[1].toLowerCase() === 'x', description: match[2].trim() });
    }
  }

  return tasks;
}

export interface TaskProgress {
  total: number;
  completed: number;
}

export function countTasksFromContent(content: string): TaskProgress {
  const tasks = parseTaskLines(content);
  return {
    total: tasks.length,
    completed: tasks.filter((task) => task.done).length,
  };
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
 * Run-scoped memo mapping a schema name to its tracked-tasks `generates` glob.
 * When one command resolves progress for many changes under a constant
 * `projectRoot` — e.g. `validate --archived` over an append-only archive — this
 * avoids re-reading and re-parsing (YAML + Zod) the same `schema.yaml` once per
 * change. Keyed by schema name alone, which is safe *only* because a single run
 * holds `projectRoot` constant; never reuse one cache across differing roots.
 */
export type SchemaGlobCache = Map<string, string | undefined>;

/**
 * Resolves the tracked-tasks artifact's output glob for a change, or undefined
 * when the schema cannot be resolved or no tracked-tasks artifact exists.
 * `resolveSchema` throws on an unresolvable/misnamed schema; we swallow that so
 * the caller falls back to a single top-level `tasks.md` and never crashes.
 * A `schemaGlobCache`, when supplied, memoizes the schema-name → glob lookup for
 * the duration of one run.
 */
function resolveTrackedTasksGlob(
  changeDir: string,
  projectRoot: string,
  schemaGlobCache?: SchemaGlobCache
): string | undefined {
  try {
    const schemaName = resolveSchemaForChange(changeDir, undefined, projectRoot);
    if (schemaGlobCache?.has(schemaName)) return schemaGlobCache.get(schemaName);
    const schema = resolveSchema(schemaName, projectRoot);
    const generates = findTrackedTasksArtifact(schema)?.generates;
    schemaGlobCache?.set(schemaName, generates);
    return generates;
  } catch {
    return undefined;
  }
}

/** Resolves the task files selected by the schema's apply tracking rule. */
export function resolveTaskFilesForChange(
  changeDir: string,
  projectRoot: string,
  schemaGlobCache?: SchemaGlobCache
): string[] {
  const generates = resolveTrackedTasksGlob(changeDir, projectRoot, schemaGlobCache);
  return generates ? resolveArtifactOutputs(changeDir, generates) : [];
}

export interface TaskProgressDetail extends TaskProgress {
  /**
   * Task files that exist but could not be read (any error other than ENOENT).
   * `getTaskProgressForChange` discards this list to preserve its behavior;
   * callers that must fail loudly on an unreadable tasks file — e.g.
   * `openspec validate --archived` — read it so an unreadable file is never
   * silently counted as "no tasks" (#205).
   */
  unreadable: string[];
}

/**
 * Reads one task file and counts its checkboxes. ENOENT (a glob file that
 * vanished between resolve and read, or the absent single top-level `tasks.md`)
 * means zero tasks, exactly as before. Any other error (permissions, I/O,
 * ENOTDIR) is recorded in `unreadable` so a caller can surface it; the count
 * still contributes zero, so existing callers see no change.
 */
async function countTaskFile(file: string, unreadable: string[]): Promise<TaskProgress> {
  try {
    const content = await fs.readFile(file, 'utf-8');
    return countTasksFromContent(content);
  } catch (error: any) {
    if (error?.code !== 'ENOENT') unreadable.push(file);
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
 * or the glob matches no file. Also reports task files that exist but could not
 * be read. Per-file read errors are captured (never thrown); the only throw path
 * is a malformed/unsafe schema whose glob resolution rejects (path traversal or
 * a linked-directory cycle in `resolveArtifactOutputs`). Pass `schemaGlobCache`
 * to memoize schema→glob resolution across many changes in one run.
 */
export async function getTaskProgressDetailForChange(
  changesDir: string,
  changeName: string,
  projectRoot: string,
  schemaGlobCache?: SchemaGlobCache
): Promise<TaskProgressDetail> {
  const changeDir = path.join(changesDir, changeName);
  const files = resolveTaskFilesForChange(changeDir, projectRoot, schemaGlobCache);
  const targets = files.length > 0 ? files : [path.join(changeDir, 'tasks.md')];
  const unreadable: string[] = [];
  let total = 0;
  let completed = 0;
  for (const file of targets) {
    const progress = await countTaskFile(file, unreadable);
    total += progress.total;
    completed += progress.completed;
  }
  return { total, completed, unreadable };
}

/**
 * The task-completion counter `status`, `list`, and `archive` share. Delegates
 * to `getTaskProgressDetailForChange` and drops the `unreadable` detail, so its
 * returned totals are unchanged. Throws only on the same malformed/unsafe-schema
 * glob-resolution path as that function (existing behavior; callers guard it as
 * they did before).
 */
export async function getTaskProgressForChange(
  changesDir: string,
  changeName: string,
  projectRoot: string
): Promise<TaskProgress> {
  const { total, completed } = await getTaskProgressDetailForChange(
    changesDir,
    changeName,
    projectRoot
  );
  return { total, completed };
}

export function formatTaskStatus(progress: TaskProgress): string {
  if (progress.total === 0) return 'No tasks';
  if (progress.completed === progress.total) return '✓ Complete';
  return `${progress.completed}/${progress.total} tasks`;
}


