/**
 * Initiatives (stores beta).
 *
 * `openspec/initiatives/` is the planning layer of a root — this repo, or a
 * store the team shares. It holds two kinds of things:
 *
 * - Each subfolder is one **initiative**: a finite piece of work above a
 *   single change. Contents are freeform; numbered folders inside an
 *   initiative (`00_goal/`, `01_requirements/`, ...) are ordered stages.
 * - Unnumbered top-level files are **evergreen artifacts** — the standing
 *   truths every initiative serves (product, roadmap, architecture).
 *
 * Changes point UP at an initiative with one metadata line in
 * `.openspec.yaml`: `initiative: <name>` (an initiative in the change's own
 * root) or `initiative: <store-id>/<name>` (one in that registered store).
 * There is no manifest — rollup discovers changes by scanning for that line,
 * so teams tag their own work and nothing central needs maintaining.
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

export const INITIATIVES_DIRNAME = 'initiatives';

/** Numbered entries are stages: 00_goal, 01-requirements, 2_design ... */
const STAGE_PATTERN = /^\d+[-_]/;

export interface InitiativeStage {
  name: string;
  files: number;
}

export interface InitiativeChangeStatus {
  id: string;
  /** Registered store the change lives in; absent = the portfolio's own root. */
  store?: string;
  completedTasks: number;
  totalTasks: number;
  state: 'complete' | 'in-progress' | 'no-tasks';
}

export interface InitiativeInfo {
  name: string;
  /** False when changes reference this name but no folder exists on disk. */
  exists: boolean;
  stages: InitiativeStage[];
  /** Unnumbered entries inside the initiative: freeform artifacts. */
  artifacts: string[];
  changes: InitiativeChangeStatus[];
  changesComplete: number;
  changesTotal: number;
  tasksComplete: number;
  tasksTotal: number;
}

export interface PortfolioInfo {
  path: string;
  /** Unnumbered top-level files: standing truths every initiative serves. */
  evergreen: string[];
  initiatives: InitiativeInfo[];
}

function initiativesDir(root: string): string {
  return path.join(root, 'openspec', INITIATIVES_DIRNAME);
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
 * Normalizes an `initiative:` metadata value to its reference form:
 * `<name>` or `<store-id>/<name>`. The legacy object shape
 * `{ store, id }` carries the same data and maps to `<store>/<id>`.
 */
export function normalizeInitiativeRef(value: unknown): string | null {
  if (typeof value === 'string') {
    return value.length > 0 ? value : null;
  }
  if (value !== null && typeof value === 'object') {
    const { store, id } = value as { store?: unknown; id?: unknown };
    if (typeof store === 'string' && store.length > 0 && typeof id === 'string' && id.length > 0) {
      return `${store}/${id}`;
    }
  }
  return null;
}

interface InitiativeShape {
  name: string;
  stages: InitiativeStage[];
  artifacts: string[];
}

/**
 * Reads a root's initiatives folder: subfolders are initiatives (with their
 * stages and freeform artifacts), unnumbered top-level files are evergreen
 * artifacts. Returns null when there is no initiatives folder.
 */
export async function readInitiativesShape(
  root: string
): Promise<{ evergreen: string[]; initiatives: InitiativeShape[] } | null> {
  const dir = initiativesDir(root);
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return null;
  }

  const evergreen: string[] = [];
  const initiatives: InitiativeShape[] = [];
  for (const entry of entries) {
    if (entry.name.startsWith('.')) continue;
    if (!entry.isDirectory()) {
      evergreen.push(entry.name);
      continue;
    }
    const inner = await fs.readdir(path.join(dir, entry.name), {
      withFileTypes: true,
    });
    const stages: InitiativeStage[] = [];
    const artifacts: string[] = [];
    for (const item of inner) {
      if (item.name.startsWith('.')) continue;
      if (item.isDirectory() && STAGE_PATTERN.test(item.name)) {
        stages.push({
          name: item.name,
          files: await countFiles(path.join(dir, entry.name, item.name)),
        });
      } else {
        artifacts.push(item.name);
      }
    }
    stages.sort((a, b) => a.name.localeCompare(b.name));
    artifacts.sort();
    initiatives.push({ name: entry.name, stages, artifacts });
  }
  evergreen.sort();
  initiatives.sort((a, b) => a.name.localeCompare(b.name));
  return { evergreen, initiatives };
}

/**
 * Reads the `initiative:` line from a change's `.openspec.yaml`, normalized
 * to reference form. Tolerant: any unreadable or unlinked metadata simply
 * means "not part of an initiative".
 */
async function readInitiativeRef(changeDir: string): Promise<string | null> {
  try {
    const raw = await fs.readFile(path.join(changeDir, '.openspec.yaml'), 'utf-8');
    const parsed = parseYaml(raw) as { initiative?: unknown } | null;
    return normalizeInitiativeRef(parsed?.initiative);
  } catch {
    return null;
  }
}

/**
 * Scans one root's changes and returns, per matching initiative name, the
 * changes that point at it. `toName` maps a normalized ref to the initiative
 * name it addresses in the portfolio being rolled up — or null when the ref
 * points elsewhere.
 */
async function collectMatchingChanges(
  root: string,
  toName: (ref: string) => string | null,
  store: string | undefined
): Promise<Map<string, InitiativeChangeStatus[]>> {
  const changesDir = path.join(root, 'openspec', 'changes');
  const found = new Map<string, InitiativeChangeStatus[]>();
  let entries;
  try {
    entries = await fs.readdir(changesDir, { withFileTypes: true });
  } catch {
    return found;
  }

  for (const entry of entries) {
    if (!entry.isDirectory() || entry.name === 'archive') continue;
    const ref = await readInitiativeRef(path.join(changesDir, entry.name));
    if (ref === null) continue;
    const name = toName(ref);
    if (name === null) continue;

    const progress = await getTaskProgressForChange(changesDir, entry.name);
    const status: InitiativeChangeStatus = {
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
    };
    const bucket = found.get(name);
    if (bucket) {
      bucket.push(status);
    } else {
      found.set(name, [status]);
    }
  }
  return found;
}

function mergeChanges(
  target: Map<string, InitiativeChangeStatus[]>,
  source: Map<string, InitiativeChangeStatus[]>
): void {
  for (const [name, changes] of source) {
    const bucket = target.get(name);
    if (bucket) {
      bucket.push(...changes);
    } else {
      target.set(name, changes);
    }
  }
}

/**
 * Rolls up a root's portfolio: its evergreen artifacts and initiatives, plus
 * every change on this machine that points at them. Local changes match
 * `initiative: <name>` (or `<own-store-id>/<name>`); when the root is a
 * registered store, other registered roots are scanned for
 * `<that id>/<name>`. Names referenced by changes but missing on disk are
 * included with `exists: false` — a bad reference should be visible, not
 * silently dropped. Returns null when the root has no initiatives folder.
 */
export async function rollupInitiatives(
  root: string,
  options: { globalDataDir?: string } = {}
): Promise<PortfolioInfo | null> {
  const shape = await readInitiativesShape(root);
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

  // A ref addresses this portfolio as `<name>` from its own root, or as
  // `<own-store-id>/<name>` from anywhere.
  const ownPrefix = ownStoreId !== undefined ? `${ownStoreId}/` : null;
  const byName = await collectMatchingChanges(
    root,
    (ref) => {
      if (!ref.includes('/')) return ref;
      if (ownPrefix !== null && ref.startsWith(ownPrefix)) {
        return ref.slice(ownPrefix.length);
      }
      return null;
    },
    undefined
  );

  if (ownStoreId !== undefined && ownPrefix !== null) {
    for (const store of storeRoots) {
      if (store.root === resolvedRoot) continue;
      mergeChanges(
        byName,
        await collectMatchingChanges(
          store.root,
          (ref) => (ref.startsWith(ownPrefix) ? ref.slice(ownPrefix.length) : null),
          store.id
        )
      );
    }
  }

  const initiatives: InitiativeInfo[] = [];
  const addInitiative = (
    name: string,
    exists: boolean,
    stages: InitiativeStage[],
    artifacts: string[]
  ) => {
    const changes = (byName.get(name) ?? []).sort((a, b) =>
      a.id.localeCompare(b.id)
    );
    let changesComplete = 0;
    let tasksComplete = 0;
    let tasksTotal = 0;
    for (const change of changes) {
      tasksComplete += change.completedTasks;
      tasksTotal += change.totalTasks;
      if (change.state === 'complete') changesComplete += 1;
    }
    initiatives.push({
      name,
      exists,
      stages,
      artifacts,
      changes,
      changesComplete,
      changesTotal: changes.length,
      tasksComplete,
      tasksTotal,
    });
  };

  for (const initiative of shape.initiatives) {
    addInitiative(initiative.name, true, initiative.stages, initiative.artifacts);
  }
  const known = new Set(shape.initiatives.map((initiative) => initiative.name));
  for (const name of [...byName.keys()].sort()) {
    if (!known.has(name)) {
      addInitiative(name, false, [], []);
    }
  }

  return {
    path: initiativesDir(root),
    evergreen: shape.evergreen,
    initiatives,
  };
}

/**
 * The portfolios of every registered store that has one. This is the
 * outside-a-root answer to "where does everything stand": the planning layer
 * sits above repos, so asking it should not require standing in one.
 */
export async function rollupRegisteredStorePortfolios(
  options: { globalDataDir?: string } = {}
): Promise<Array<{ store: string; portfolio: PortfolioInfo }>> {
  const registry = await readStoreRegistryState(
    options.globalDataDir ? { globalDataDir: options.globalDataDir } : {}
  ).catch(() => null);
  const registered = registry ? listStoreRegistryEntries(registry) : [];

  const portfolios: Array<{ store: string; portfolio: PortfolioInfo }> = [];
  for (const entry of registered) {
    let root;
    try {
      root = getStoreRootForBackend(entry.backend);
    } catch {
      continue; // Unusable backend — skipped; doctor reports it.
    }
    const portfolio = await rollupInitiatives(root, options);
    if (
      portfolio !== null &&
      (portfolio.initiatives.length > 0 || portfolio.evergreen.length > 0)
    ) {
      portfolios.push({ store: entry.id, portfolio });
    }
  }
  return portfolios;
}

/**
 * The names an agent surface shows for a root's planning layer: initiative
 * names in order — or, when there are no initiatives yet, the evergreen
 * artifact names. Either way the agent sees that the layer exists.
 */
export async function listInitiativeNames(root: string): Promise<string[]> {
  const shape = await readInitiativesShape(root);
  if (shape === null) return [];
  return shape.initiatives.length > 0
    ? shape.initiatives.map((initiative) => initiative.name)
    : shape.evergreen;
}
