/**
 * Initiatives (stores beta).
 *
 * An initiative is the home for a big effort: a brief, the artifacts the team
 * works from, and the changes that carry it out. It is a plain folder under
 * `openspec/initiatives/<id>/` with an `initiative.yaml` manifest that names
 * the changes it groups.
 *
 * This module lists initiatives, rolls up the live status of the changes each
 * one groups (reusing the same task-progress source as `openspec list`), and
 * detects when a local initiative shadows a canonical one in a referenced
 * store. Precedence rule: the store initiative is canonical; a same-id local
 * one is a shadow that is reported but never blocked — mirroring how OpenSpec
 * reports schema shadowing.
 */

import { existsSync, promises as fs } from 'fs';
import path from 'path';
import { parse as parseYaml } from 'yaml';

import { getTaskProgressForChange } from '../utils/task-progress.js';
import { readProjectConfig } from './project-config.js';
import {
  listStoreRegistryEntries,
  readStoreRegistryState,
} from './store/foundation.js';
import { getStoreRootForBackend } from './store/registry.js';

export const INITIATIVES_DIRNAME = 'initiatives';
const INITIATIVE_MANIFEST = 'initiative.yaml';

export type InitiativeChangeState =
  | 'complete'
  | 'in-progress'
  | 'no-tasks'
  | 'not-found';

/** The live status of one change an initiative groups. */
export interface InitiativeChangeStatus {
  id: string;
  /** Registered store id where the change lives; absent = the initiative's
   * own root (the solo/local case). */
  store?: string;
  completedTasks: number;
  totalTasks: number;
  state: InitiativeChangeState;
}

export interface InitiativeInfo {
  id: string;
  title: string;
  /** Change ids this initiative groups (in manifest order). */
  changes: string[];
  /** Per-change live status, including where each change lives. */
  changeStatuses: InitiativeChangeStatus[];
  /** Rolled-up status of the grouped changes. */
  changesComplete: number;
  changesTotal: number;
  tasksComplete: number;
  tasksTotal: number;
  /** Distinct store ids this initiative's changes span (cross-repo). Empty
   * when every change lives in the initiative's own root. */
  stores: string[];
  /** Set when a same-id canonical initiative exists in a referenced store. */
  shadowsStore?: string;
}

/** A change entry: `"<id>"` (own root) or `{ id, store }` (in a store). */
type ManifestChange = string | { id?: string; store?: string };

interface InitiativeManifest {
  title?: string;
  changes?: ManifestChange[];
}

function normalizeChange(entry: ManifestChange): { id: string; store?: string } {
  if (typeof entry === 'string') {
    return { id: entry };
  }
  return { id: entry.id ?? '', ...(entry.store ? { store: entry.store } : {}) };
}

function initiativesDir(root: string): string {
  return path.join(root, 'openspec', INITIATIVES_DIRNAME);
}

/**
 * Reads an initiative's manifest. Returns null when the folder has no
 * `initiative.yaml` (a plain folder that is not yet a tracked initiative).
 */
async function readManifest(
  dir: string
): Promise<InitiativeManifest | null> {
  const manifestPath = path.join(dir, INITIATIVE_MANIFEST);
  let raw: string;
  try {
    raw = await fs.readFile(manifestPath, 'utf-8');
  } catch {
    return null;
  }
  try {
    const parsed = parseYaml(raw) as InitiativeManifest | null;
    return parsed ?? {};
  } catch {
    return {};
  }
}

/** Lists initiative folder ids under a root's `openspec/initiatives/`. */
async function listInitiativeIds(root: string): Promise<string[]> {
  let entries;
  try {
    entries = await fs.readdir(initiativesDir(root), { withFileTypes: true });
  } catch {
    return [];
  }
  return entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);
}

/**
 * Every registered store id → its on-disk root. Read once and shared by the
 * shadow lookup and per-change resolution. Unusable backends are skipped
 * (doctor reports them).
 */
async function buildStoreRootMap(
  globalDataDir?: string
): Promise<Map<string, string>> {
  const registry = await readStoreRegistryState(
    globalDataDir ? { globalDataDir } : {}
  );
  const entries = registry ? listStoreRegistryEntries(registry) : [];
  const map = new Map<string, string>();
  for (const entry of entries) {
    try {
      map.set(entry.id, getStoreRootForBackend(entry.backend));
    } catch {
      // Unusable backend — skipped.
    }
  }
  return map;
}

/**
 * Builds the shadow lookup: for each store this root *references* (and that is
 * registered), the set of initiative ids it defines. A local initiative whose
 * id appears here shadows the store's canonical one.
 */
async function buildShadowLookup(
  root: string,
  storeRoots: Map<string, string>
): Promise<Map<string, string>> {
  const lookup = new Map<string, string>();
  const config = readProjectConfig(root);
  const references = config?.references ?? [];
  for (const reference of references) {
    const storeRoot = storeRoots.get(reference.id);
    if (!storeRoot) continue;
    for (const id of await listInitiativeIds(storeRoot)) {
      // First referenced store to define an id is named as canonical.
      if (!lookup.has(id)) {
        lookup.set(id, reference.id);
      }
    }
  }
  return lookup;
}

/**
 * Resolves one change's live status against the changes dir it lives in.
 * A missing change dir is reported as `not-found` (distinct from a change
 * that exists but has no tasks yet).
 */
async function resolveChangeStatus(
  changeId: string,
  store: string | undefined,
  localChangesDir: string,
  storeRoots: Map<string, string>
): Promise<InitiativeChangeStatus> {
  let changesDir: string | null;
  if (store) {
    const storeRoot = storeRoots.get(store);
    changesDir = storeRoot
      ? path.join(storeRoot, 'openspec', 'changes')
      : null; // named store not registered on this machine
  } else {
    changesDir = localChangesDir;
  }

  const base: InitiativeChangeStatus = {
    id: changeId,
    ...(store ? { store } : {}),
    completedTasks: 0,
    totalTasks: 0,
    state: 'not-found',
  };

  if (changesDir === null || !existsSync(path.join(changesDir, changeId))) {
    return base;
  }

  const progress = await getTaskProgressForChange(changesDir, changeId);
  const state: InitiativeChangeState =
    progress.total === 0
      ? 'no-tasks'
      : progress.completed === progress.total
        ? 'complete'
        : 'in-progress';
  return {
    ...base,
    completedTasks: progress.completed,
    totalTasks: progress.total,
    state,
  };
}

/**
 * Lightweight id + title for each initiative at a root — no change rollup and
 * no shadow detection. Used to index a referenced store's initiatives without
 * the cost of resolving that store's own references.
 */
export async function listInitiativeSummaries(
  root: string
): Promise<Array<{ id: string; title: string }>> {
  const ids = await listInitiativeIds(root);
  const summaries: Array<{ id: string; title: string }> = [];
  for (const id of ids) {
    const manifest = await readManifest(path.join(initiativesDir(root), id));
    if (manifest === null) continue;
    summaries.push({ id, title: manifest.title ?? id });
  }
  summaries.sort((a, b) => a.id.localeCompare(b.id));
  return summaries;
}

/**
 * Lists the initiatives at a root, with rolled-up change status and shadow
 * detection against referenced stores.
 */
export async function listInitiatives(
  root: string,
  options: { globalDataDir?: string } = {}
): Promise<InitiativeInfo[]> {
  const ids = await listInitiativeIds(root);
  if (ids.length === 0) {
    return [];
  }

  const localChangesDir = path.join(root, 'openspec', 'changes');
  const storeRoots = await buildStoreRootMap(options.globalDataDir);
  const shadows = await buildShadowLookup(root, storeRoots);
  const initiatives: InitiativeInfo[] = [];

  for (const id of ids) {
    const manifest = await readManifest(path.join(initiativesDir(root), id));
    if (manifest === null) {
      // A plain folder without a manifest is not a tracked initiative.
      continue;
    }

    const entries = (manifest.changes ?? [])
      .map(normalizeChange)
      .filter((entry) => entry.id.length > 0);

    const changeStatuses: InitiativeChangeStatus[] = [];
    let changesComplete = 0;
    let tasksComplete = 0;
    let tasksTotal = 0;
    const stores = new Set<string>();

    for (const entry of entries) {
      const status = await resolveChangeStatus(
        entry.id,
        entry.store,
        localChangesDir,
        storeRoots
      );
      changeStatuses.push(status);
      tasksComplete += status.completedTasks;
      tasksTotal += status.totalTasks;
      if (status.state === 'complete') {
        changesComplete += 1;
      }
      if (entry.store) {
        stores.add(entry.store);
      }
    }

    initiatives.push({
      id,
      title: manifest.title ?? id,
      changes: entries.map((entry) => entry.id),
      changeStatuses,
      changesComplete,
      changesTotal: entries.length,
      tasksComplete,
      tasksTotal,
      stores: [...stores].sort(),
      ...(shadows.has(id) ? { shadowsStore: shadows.get(id) } : {}),
    });
  }

  initiatives.sort((a, b) => a.id.localeCompare(b.id));
  return initiatives;
}
