/**
 * The plan folder (stores beta).
 *
 * A plan is the home for work above a single change: `openspec/plan/`.
 * Numbered folders inside it are stages, in order (`00_goal/`,
 * `01_requirements/`, ...) — the numbering is the order; the names and
 * contents are the user's own. Unnumbered entries are ambient context
 * (vision, notes, meetings).
 *
 * Changes point UP at a plan with one metadata line in `.openspec.yaml`:
 * `plan: local` (the plan in the change's own repo) or `plan: <store-id>`
 * (the plan in that registered store). There is no manifest — rollup
 * discovers changes by scanning for that line, so teams tag their own work
 * and nothing central needs maintaining.
 */

import { promises as fs } from 'fs';
import path from 'path';
import { parse as parseYaml } from 'yaml';

import { getTaskProgressForChange } from '../utils/task-progress.js';
import {
  listStoreRegistryEntries,
  readStoreRegistryState,
} from './store/foundation.js';
import { getStoreRootForBackend } from './store/registry.js';

export const PLAN_DIRNAME = 'plan';

/** Numbered entries are stages: 00_goal, 01-requirements, 2_design ... */
const STAGE_PATTERN = /^\d+[-_]/;

export interface PlanStage {
  name: string;
  files: number;
}

export interface PlanChangeStatus {
  id: string;
  /** Registered store the change lives in; absent = the plan's own root. */
  store?: string;
  completedTasks: number;
  totalTasks: number;
  state: 'complete' | 'in-progress' | 'no-tasks';
}

export interface PlanInfo {
  path: string;
  stages: PlanStage[];
  /** Unnumbered entries: ambient context, always worth reading. */
  context: string[];
  changes: PlanChangeStatus[];
  changesComplete: number;
  changesTotal: number;
  tasksComplete: number;
  tasksTotal: number;
}

function planDir(root: string): string {
  return path.join(root, 'openspec', PLAN_DIRNAME);
}

async function countFiles(dir: string): Promise<number> {
  let count = 0;
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return 0;
  }
  for (const entry of entries) {
    if (entry.isDirectory()) {
      count += await countFiles(path.join(dir, entry.name));
    } else {
      count += 1;
    }
  }
  return count;
}

/**
 * Reads a root's plan folder: numbered stages (sorted) and unnumbered
 * context entries. Returns null when there is no plan folder.
 */
export async function readPlanStages(
  root: string
): Promise<{ stages: PlanStage[]; context: string[] } | null> {
  let entries;
  try {
    entries = await fs.readdir(planDir(root), { withFileTypes: true });
  } catch {
    return null;
  }

  const stages: PlanStage[] = [];
  const context: string[] = [];
  for (const entry of entries) {
    if (entry.isDirectory() && STAGE_PATTERN.test(entry.name)) {
      stages.push({
        name: entry.name,
        files: await countFiles(path.join(planDir(root), entry.name)),
      });
    } else if (!entry.name.startsWith('.')) {
      context.push(entry.name);
    }
  }
  stages.sort((a, b) => a.name.localeCompare(b.name));
  context.sort();
  return { stages, context };
}

/**
 * Reads the `plan:` line from a change's `.openspec.yaml`. Tolerant: any
 * unreadable or planless metadata simply means "not part of a plan".
 */
async function readPlanRef(changeDir: string): Promise<string | null> {
  try {
    const raw = await fs.readFile(path.join(changeDir, '.openspec.yaml'), 'utf-8');
    const parsed = parseYaml(raw) as { plan?: unknown } | null;
    return typeof parsed?.plan === 'string' && parsed.plan.length > 0
      ? parsed.plan
      : null;
  } catch {
    return null;
  }
}

/** Scans one root's changes for those whose `plan:` matches. */
async function collectMatchingChanges(
  root: string,
  matches: (ref: string) => boolean,
  store: string | undefined
): Promise<PlanChangeStatus[]> {
  const changesDir = path.join(root, 'openspec', 'changes');
  let entries;
  try {
    entries = await fs.readdir(changesDir, { withFileTypes: true });
  } catch {
    return [];
  }

  const found: PlanChangeStatus[] = [];
  for (const entry of entries) {
    if (!entry.isDirectory() || entry.name === 'archive') continue;
    const ref = await readPlanRef(path.join(changesDir, entry.name));
    if (ref === null || !matches(ref)) continue;

    const progress = await getTaskProgressForChange(changesDir, entry.name);
    found.push({
      id: entry.name,
      ...(store ? { store } : {}),
      completedTasks: progress.completed,
      totalTasks: progress.total,
      state:
        progress.total === 0
          ? 'no-tasks'
          : progress.completed === progress.total
            ? 'complete'
            : 'in-progress',
    });
  }
  found.sort((a, b) => a.id.localeCompare(b.id));
  return found;
}

/**
 * Rolls up a root's plan: its stages plus every change on this machine that
 * points at it. Local changes match `plan: local` (or the root's own store
 * id); when the root is a registered store, other registered roots are
 * scanned for `plan: <that id>`. Returns null when the root has no plan.
 */
export async function rollupPlan(
  root: string,
  options: { globalDataDir?: string } = {}
): Promise<PlanInfo | null> {
  const shape = await readPlanStages(root);
  if (shape === null) {
    return null;
  }

  const registry = await readStoreRegistryState(
    options.globalDataDir ? { globalDataDir: options.globalDataDir } : {}
  ).catch(() => null);
  const registered = registry ? listStoreRegistryEntries(registry) : [];

  // Which registered store, if any, is this root?
  const resolvedRoot = path.resolve(root);
  let ownStoreId: string | undefined;
  const storeRoots: Array<{ id: string; root: string }> = [];
  for (const entry of registered) {
    try {
      const entryRoot = path.resolve(getStoreRootForBackend(entry.backend));
      storeRoots.push({ id: entry.id, root: entryRoot });
      if (entryRoot === resolvedRoot) {
        ownStoreId = entry.id;
      }
    } catch {
      // Unusable backend — skipped; doctor reports it.
    }
  }

  const changes = await collectMatchingChanges(
    root,
    (ref) => ref === 'local' || (ownStoreId !== undefined && ref === ownStoreId),
    undefined
  );

  if (ownStoreId !== undefined) {
    for (const store of storeRoots) {
      if (store.root === resolvedRoot) continue;
      changes.push(
        ...(await collectMatchingChanges(
          store.root,
          (ref) => ref === ownStoreId,
          store.id
        ))
      );
    }
  }

  let changesComplete = 0;
  let tasksComplete = 0;
  let tasksTotal = 0;
  for (const change of changes) {
    tasksComplete += change.completedTasks;
    tasksTotal += change.totalTasks;
    if (change.state === 'complete') changesComplete += 1;
  }

  return {
    path: planDir(root),
    stages: shape.stages,
    context: shape.context,
    changes,
    changesComplete,
    changesTotal: changes.length,
    tasksComplete,
    tasksTotal,
  };
}
