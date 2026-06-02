/**
 * Mark-Task-Done Command
 *
 * Flips a single checkbox in a change's tracking file (typically `tasks.md`)
 * from `- [ ]` to `- [x]`. The target line is matched by the leading numeric
 * task id (`1`, `1.1`, `2.3.4`) emitted by `parseTasksFile` — agents and
 * scripts thus identify tasks by the same handle the CLI shows them, without
 * having to know where the tracking file lives.
 *
 * Behavior:
 *   - Idempotent: if the matching line is already `- [x]`, exit 0.
 *   - Preserves CRLF vs LF line endings.
 *   - Uses an anchored regex so `1.1` does not match `1.10`.
 *
 * Exit codes:
 *   0 success (flipped or already-done)
 *   1 change could not be resolved — missing or unknown `--change`. This is
 *     thrown by `validateChangeExists` and surfaced as exit 1 by the CLI
 *     wrapper, matching `agent next-artifact`.
 *   2 bad input — missing task id, schema lacks `apply.tracks`, tracking file
 *     missing, or no matching unchecked task line.
 */

import * as fs from 'fs';
import path from 'path';
import { resolveSchema } from '../../core/artifact-graph/index.js';
import { getChangeDir, resolveCurrentPlanningHomeSync } from '../../core/planning-home.js';
import { validateChangeExists } from './shared.js';

export interface MarkTaskDoneOptions {
  change?: string;
  schema?: string;
  json?: boolean;
}

interface MarkResult {
  change: string;
  taskId: string;
  tracksPath: string;
  status: 'flipped' | 'already-done';
}

function fail(message: string, code: number): never {
  console.error(message);
  process.exit(code);
}

export async function markTaskDoneCommand(
  taskId: string | undefined,
  options: MarkTaskDoneOptions
): Promise<void> {
  if (!taskId) {
    fail('Missing required argument <task-id>.', 2);
  }

  const planningHome = resolveCurrentPlanningHomeSync();
  const projectRoot = planningHome.root;

  const changeName = await validateChangeExists(
    options.change,
    projectRoot,
    planningHome.changesDir
  );

  const changeDir = getChangeDir(planningHome, changeName);

  // Resolve schema (auto-detected from change metadata when not explicit) and
  // pull the `apply.tracks` setting. Without a tracks file there's nothing to
  // mark.
  // Schema metadata lookup mirrors loadChangeContext; reuse if it becomes
  // public.
  const schemaName = options.schema ?? readSchemaFromMetadata(changeDir) ?? 'spec-driven';
  const schema = resolveSchema(schemaName, projectRoot);
  const tracksRelative = schema.apply?.tracks ?? null;
  if (!tracksRelative) {
    fail(
      `Schema '${schemaName}' does not configure 'apply.tracks'; nothing to mark.`,
      2
    );
  }

  const tracksPath = path.join(changeDir, tracksRelative);
  if (!fs.existsSync(tracksPath)) {
    fail(`Tracking file not found at '${tracksPath}' for change '${changeName}'.`, 2);
  }

  let body: string;
  try {
    body = fs.readFileSync(tracksPath, 'utf8');
  } catch (err) {
    fail(
      `Failed to read tracking file '${tracksPath}': ${(err as Error).message}`,
      2
    );
  }

  const result = applyTaskFlip(body, taskId);

  if (result.kind === 'no-match') {
    fail(
      `No unchecked task line with id '${taskId}' found in '${tracksPath}'.`,
      2
    );
  }

  if (result.kind === 'flipped') {
    fs.writeFileSync(tracksPath, result.next);
  }

  const payload: MarkResult = {
    change: changeName,
    taskId,
    tracksPath,
    status: result.kind === 'already-done' ? 'already-done' : 'flipped',
  };

  if (options.json) {
    console.log(JSON.stringify(payload, null, 2));
  } else {
    console.log(
      result.kind === 'already-done'
        ? `Task '${taskId}' in '${tracksPath}' was already complete; no change.`
        : `Marked '${taskId}' done in '${tracksPath}'.`
    );
  }
}

// -----------------------------------------------------------------------------
// Internals
// -----------------------------------------------------------------------------

/**
 * Reads `.openspec.yaml` schemaName if present. Lightweight stand-in for the
 * private helper in `instruction-loader.ts`; mark-task-done only needs the
 * name, not the full metadata blob.
 */
function readSchemaFromMetadata(changeDir: string): string | null {
  const metaPath = path.join(changeDir, '.openspec.yaml');
  if (!fs.existsSync(metaPath)) return null;
  const raw = fs.readFileSync(metaPath, 'utf8');
  const match = raw.match(/^\s*schema\s*:\s*(['"]?)([^\s'"]+)\1/m);
  return match ? match[2] : null;
}

type FlipResult =
  | { kind: 'flipped'; next: string }
  | { kind: 'already-done' }
  | { kind: 'no-match' };

/**
 * Performs the actual line-flip. Exported indirectly via the command surface;
 * factored out so tests can pin behavior without touching the filesystem.
 */
export function applyTaskFlip(body: string, taskId: string): FlipResult {
  const usesCrlf = /\r\n/.test(body);
  const eol = usesCrlf ? '\r\n' : '\n';
  const lines = body.split(/\r?\n/);

  const escapedId = taskId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  // Anchored: optional indent, "- [ ]" (or "* [ ]"), required whitespace,
  // task-id, then a word boundary so 1.1 does not match 1.10.
  const uncheckedRe = new RegExp(
    String.raw`^(\s*)[-*]\s*\[\s\]\s+${escapedId}(?!\d|\.\d)\b`
  );
  const checkedRe = new RegExp(
    String.raw`^(\s*)[-*]\s*\[[xX]\]\s+${escapedId}(?!\d|\.\d)\b`
  );

  let foundIdx = -1;
  let alreadyDoneIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    if (uncheckedRe.test(lines[i])) {
      foundIdx = i;
      break;
    }
    if (alreadyDoneIdx === -1 && checkedRe.test(lines[i])) {
      alreadyDoneIdx = i;
    }
  }

  if (foundIdx === -1) {
    if (alreadyDoneIdx !== -1) {
      return { kind: 'already-done' };
    }
    return { kind: 'no-match' };
  }

  // Replace the checkbox in the matched line. Replace only the first
  // occurrence of "[ ]" to avoid touching nested content on the same line.
  lines[foundIdx] = lines[foundIdx].replace(/\[\s\]/, '[x]');
  return { kind: 'flipped', next: lines.join(eol) };
}
