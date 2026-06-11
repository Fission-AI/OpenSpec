import * as fs from 'node:fs/promises';

import {
  getStoreMetadataPath,
  getStoreMetadataDir,
  listStoreRegistryEntries,
  readStoreRegistryState,
  readOptionalStoreMetadataState,
  resolveGitStoreBackendConfig,
  updateStoreRegistryState,
  validateStoreId,
  writeStoreMetadataState,
  type StoreBackendConfig,
  type StoreGitBackendConfig,
  type StorePathOptions,
  type StoreRegistryEntry,
  type StoreRegistryState,
} from './foundation.js';
import { StoreError } from './errors.js';
import * as fsSync from 'node:fs';
import * as path from 'node:path';
import { FileSystemUtils } from '../../utils/file-system.js';
import { isKebabId, KEBAB_ID_DESCRIPTION } from '../id.js';

export interface RegisterStoreInput extends StorePathOptions {
  id: string;
  localPath: string;
  remote?: string;
  branch?: string;
  cwd?: string;
}

export interface ResolveRegisteredStoreInput extends StorePathOptions {
  id: string;
}

export interface GetRegisteredStoreInput extends ResolveRegisteredStoreInput {
  expectedBackend?: StoreGitBackendConfig;
}

export interface UnregisterStoreInput extends StorePathOptions {
  id: string;
  expectedBackend?: StoreGitBackendConfig;
  beforeCommit?: (entry: RegisteredStoreEntry) => Promise<void>;
}

export type ListRegisteredStoresOptions = StorePathOptions;

export interface RegisteredStoreEntry extends StoreRegistryEntry {
  storeRoot: string;
}

export interface ResolvedStore {
  id: string;
  storeRoot: string;
  backend: StoreGitBackendConfig;
}

export interface StoreRegistrationCommit extends ResolvedStore {
  metadataCreated: boolean;
  registryUpdated: boolean;
  alreadyRegistered: boolean;
}

export interface CommitStoreRegistrationInput extends StorePathOptions {
  id: string;
  backend: StoreGitBackendConfig;
  writeMetadataIfMissing: boolean;
}

export function getStoreRootForBackend(backend: StoreBackendConfig): string {
  switch (backend.type) {
    case 'git':
      return backend.local_path;
  }
}

function normalizePathForComparison(targetPath: string): string {
  try {
    return FileSystemUtils.canonicalizeExistingPath(targetPath);
  } catch {
    return targetPath;
  }
}

export function assertNoRegisteredStoreConflict(
  registry: StoreRegistryState | null,
  id: string,
  backend: StoreGitBackendConfig
): void {
  const nextPath = normalizePathForComparison(getStoreRootForBackend(backend));

  for (const entry of listStoreRegistryEntries(registry ?? { version: 1, stores: {} })) {
    const entryPath = normalizePathForComparison(getStoreRootForBackend(entry.backend));

    if (entry.id === id && entryPath === nextPath) {
      continue;
    }

    if (entry.id === id) {
      throw new StoreError(
        `Store '${id}' is already registered at ${getStoreRootForBackend(entry.backend)}. One checkout per store id is supported on this machine.`,
        'store_id_conflict',
        {
          target: 'store.id',
          fix: `Use the existing registration, or run openspec store unregister ${id} first to switch this id to a different checkout.`,
        }
      );
    }

    if (entryPath === nextPath) {
      throw new StoreError(
        `Store path is already registered as '${entry.id}'.`,
        'store_path_conflict',
        {
          target: 'store.root',
          fix: `Use the existing '${entry.id}' registration or choose a different path.`,
        }
      );
    }
  }

  // Cross-section uniqueness (slice 3.5): one checkout has one role,
  // and store/repo ids share one namespace.
  for (const [repoId, repo] of Object.entries(registry?.repos ?? {})) {
    if (repoId === id) {
      throw new StoreError(
        `Id '${id}' is already registered as a target repo (${repo.local_path}). Store and repo ids share one namespace.`,
        'store_id_claimed_by_repo',
        {
          target: 'store.id',
          fix: `Choose a different store id, or run openspec repo unregister ${id} first.`,
        }
      );
    }
    if (normalizePathForComparison(repo.local_path) === nextPath) {
      throw new StoreError(
        `Path is already registered as target repo '${repoId}'. One checkout has one role.`,
        'store_path_claimed_by_repo',
        {
          target: 'store.root',
          fix: `Run openspec repo unregister ${repoId} first, or choose a different path.`,
        }
      );
    }
  }
}

/** Cross-section + in-section conflict checks for repo writes (3.5). */
function assertNoRegisteredRepoConflict(
  registry: StoreRegistryState | null,
  id: string,
  canonicalPath: string
): void {
  const nextPath = normalizePathForComparison(canonicalPath);

  for (const entry of listStoreRegistryEntries(registry ?? { version: 1, stores: {} })) {
    if (entry.id === id) {
      throw new StoreError(
        `Id '${id}' is already registered as a store (${getStoreRootForBackend(entry.backend)}). Store and repo ids share one namespace.`,
        'repo_id_claimed_by_store',
        {
          target: 'repo.id',
          fix: `Choose a different repo id, or run openspec store unregister ${id} first.`,
        }
      );
    }
    if (normalizePathForComparison(getStoreRootForBackend(entry.backend)) === nextPath) {
      throw new StoreError(
        `Path is already registered as store '${entry.id}'. One checkout has one role.`,
        'repo_path_claimed_by_store',
        {
          target: 'repo.root',
          fix: `Run openspec store unregister ${entry.id} first, or choose a different path.`,
        }
      );
    }
  }

  for (const [repoId, repo] of Object.entries(registry?.repos ?? {})) {
    const repoPath = normalizePathForComparison(repo.local_path);
    if (repoId === id && repoPath === nextPath) {
      continue; // Same id + same path: the caller treats it as a rerun.
    }
    if (repoId === id) {
      throw new StoreError(
        `Repo '${id}' is already registered at ${repo.local_path}. One checkout per repo id is supported on this machine.`,
        'repo_id_conflict',
        {
          target: 'repo.id',
          fix: `Use the existing registration, or run openspec repo unregister ${id} first to switch this id to a different checkout.`,
        }
      );
    }
    if (repoPath === nextPath) {
      throw new StoreError(
        `Repo path is already registered as '${repoId}'.`,
        'repo_path_conflict',
        {
          target: 'repo.root',
          fix: `Use the existing '${repoId}' registration or choose a different path.`,
        }
      );
    }
  }
}

function withRegisteredStore(
  registry: StoreRegistryState | null,
  id: string,
  backend: StoreGitBackendConfig
): StoreRegistryState {
  assertNoRegisteredStoreConflict(registry, id, backend);

  const stores = {
    ...(registry?.stores ?? {}),
    [id]: {
      backend,
    },
  };

  return {
    version: 1,
    stores: Object.fromEntries(
      Object.entries(stores).sort(([leftId], [rightId]) => leftId.localeCompare(rightId))
    ),
    ...(registry?.repos !== undefined ? { repos: registry.repos } : {}),
  };
}

function getRegisteredStoreOrThrow(
  registry: StoreRegistryState | null,
  id: string
): StoreRegistryEntry {
  const entry = registry?.stores[id];
  if (!entry) {
    throw new StoreError(`Unknown store '${id}'`, 'store_not_found', {
      target: 'store.id',
      fix: 'Run openspec store list to see registered stores.',
    });
  }

  return {
    id,
    backend: entry.backend,
  };
}

/** Same checkout: type, canonical path, and branch — remote excluded. */
function sameCheckout(
  actual: StoreGitBackendConfig,
  expected: StoreGitBackendConfig
): boolean {
  return (
    actual.type === expected.type &&
    normalizePathForComparison(actual.local_path) ===
      normalizePathForComparison(expected.local_path) &&
    actual.branch === expected.branch
  );
}

function storeBackendsMatch(
  actual: StoreGitBackendConfig,
  expected: StoreGitBackendConfig
): boolean {
  return sameCheckout(actual, expected) && actual.remote === expected.remote;
}

function assertExpectedRegisteredBackend(
  id: string,
  actual: StoreGitBackendConfig,
  expected: StoreGitBackendConfig | undefined
): void {
  if (!expected || storeBackendsMatch(actual, expected)) return;

  throw new StoreError(
    `Store '${id}' changed before cleanup completed.`,
    'store_registry_changed',
    {
      target: 'store.registry',
      fix: 'Retry the cleanup command after reviewing the current store registration.',
    }
  );
}

function withoutRegisteredStore(
  registry: StoreRegistryState | null,
  id: string,
  expectedBackend?: StoreGitBackendConfig
): { next: StoreRegistryState; removed: StoreRegistryEntry } {
  const removed = getRegisteredStoreOrThrow(registry, id);
  assertExpectedRegisteredBackend(id, removed.backend, expectedBackend);
  const stores = { ...(registry?.stores ?? {}) };
  delete stores[id];

  return {
    removed,
    next: {
      version: 1,
      stores: Object.fromEntries(
        Object.entries(stores).sort(([leftId], [rightId]) => leftId.localeCompare(rightId))
      ),
      ...(registry?.repos !== undefined ? { repos: registry.repos } : {}),
    },
  };
}

async function ensureStoreMetadata(
  storeRoot: string,
  id: string,
  options: { writeIfMissing: boolean }
): Promise<boolean> {
  const metadata = await readOptionalStoreMetadataState(storeRoot);

  if (!metadata) {
    if (!options.writeIfMissing) {
      throw new StoreError(
        `Registered store '${id}' is missing metadata at ${getStoreMetadataPath(storeRoot)}`,
        'store_metadata_missing',
        {
          target: 'store.metadata',
          fix: `Create ${getStoreMetadataPath(storeRoot)} or rerun "openspec store register <path>".`,
        }
      );
    }

    await writeStoreMetadataState(storeRoot, {
      version: 1,
      id,
    });
    return true;
  }

  if (metadata.id !== id) {
    throw new StoreError(
      `Store metadata id '${metadata.id}' does not match registered id '${id}'`,
      'store_metadata_id_mismatch',
      {
        target: 'store.metadata',
        fix: 'Repair the local registry or store metadata so the ids match.',
      }
    );
  }

  return false;
}

export async function commitStoreRegistration(
  input: CommitStoreRegistrationInput
): Promise<StoreRegistrationCommit> {
  const id = validateStoreId(input.id);
  const backend = input.backend;
  const storeRoot = getStoreRootForBackend(backend);

  let metadataCreated = false;
  let isRerun = false;
  let registryUpdated = false;

  try {
    metadataCreated = await ensureStoreMetadata(storeRoot, id, {
      writeIfMissing: input.writeMetadataIfMissing,
    });
    const registry = await readStoreRegistryState({
      globalDataDir: input.globalDataDir,
    });
    const existing = registry?.stores[id];
    const existingBackend = existing?.backend as StoreGitBackendConfig | undefined;
    // Same checkout = a rerun for an already-registered store (the 1.3
    // reporting contract), whether or not the observed remote changed;
    // only a remote change needs the registry write (the refresh).
    isRerun = existingBackend !== undefined && sameCheckout(existingBackend, backend);
    const upToDate =
      isRerun && existingBackend !== undefined && storeBackendsMatch(existingBackend, backend);

    if (!upToDate) {
      await updateStoreRegistryState(
        (registry) => withRegisteredStore(registry, id, backend),
        { globalDataDir: input.globalDataDir }
      );
      registryUpdated = true;
    }
  } catch (error) {
    if (metadataCreated) {
      // A concurrent registration may have read our metadata as
      // pre-existing and committed against it - never delete metadata a
      // committed registry entry depends on.
      const current = await readStoreRegistryState({
        globalDataDir: input.globalDataDir,
      }).catch(() => null);
      if (!current?.stores[id]) {
        await fs.rm(getStoreMetadataPath(storeRoot), { force: true });
        await fs.rmdir(getStoreMetadataDir(storeRoot)).catch(() => undefined);
      }
    }

    throw error;
  }

  return {
    id,
    storeRoot,
    backend,
    metadataCreated,
    registryUpdated,
    alreadyRegistered: isRerun,
  };
}

export async function registerStore(
  input: RegisterStoreInput
): Promise<ResolvedStore> {
  const id = validateStoreId(input.id);
  const backend = await resolveGitStoreBackendConfig(
    {
      localPath: input.localPath,
      ...(input.remote !== undefined ? { remote: input.remote } : {}),
      ...(input.branch !== undefined ? { branch: input.branch } : {}),
    },
    input.cwd
  );
  const storeRoot = getStoreRootForBackend(backend);

  const committed = await commitStoreRegistration({
    id,
    backend,
    writeMetadataIfMissing: true,
    ...(input.globalDataDir ? { globalDataDir: input.globalDataDir } : {}),
  });
  return {
    id: committed.id,
    storeRoot: committed.storeRoot,
    backend: committed.backend,
  };
}


// -----------------------------------------------------------------------------
// Target repo map (slice 3.5)
// -----------------------------------------------------------------------------

export interface RepoMapEntry {
  id: string;
  path: string;
}

export interface RegisterRepoInput {
  id: string;
  path: string;
  globalDataDir?: string;
}

export interface RegisterRepoResult extends RepoMapEntry {
  registered: boolean;
  alreadyRegistered: boolean;
}

/** Pure state → entries, sorted by id. */
export function listRepoEntries(registry: StoreRegistryState | null): RepoMapEntry[] {
  return Object.entries(registry?.repos ?? {})
    .map(([id, entry]) => ({ id, path: entry.local_path }))
    .sort((left, right) => left.id.localeCompare(right.id));
}

/**
 * The stored canonical path for a repo id: one registry read, then a
 * dumb id-keyed lookup. Null on miss or unreadable registry.
 */
export interface RegistrySnapshot {
  /** null = the registry is unreadable; [] = empty or absent. */
  entries: StoreRegistryEntry[] | null;
  /** Repo-id → canonical path map; undefined when unreadable. */
  repoPaths: Map<string, string> | undefined;
  unreadable: boolean;
}

/**
 * One registry read serving every consumer in a command (the 3.6
 * torn-snapshot invariant: reference entries and repo paths in one
 * output must come from one read).
 */
export async function readRegistrySnapshot(
  options: { globalDataDir?: string } = {}
): Promise<RegistrySnapshot> {
  try {
    const registry = await readStoreRegistryState(options);
    return {
      entries: registry ? listStoreRegistryEntries(registry) : [],
      repoPaths: new Map(listRepoEntries(registry).map((entry) => [entry.id, entry.path])),
      unreadable: false,
    };
  } catch {
    return { entries: null, repoPaths: undefined, unreadable: true };
  }
}

function validateRepoIdOrThrow(id: string): string {
  if (!isKebabId(id)) {
    throw new StoreError(
      `Repo id '${id}' ${KEBAB_ID_DESCRIPTION}.`,
      'invalid_repo_id',
      {
        target: 'repo.id',
        fix: 'Use kebab-case with lowercase letters, numbers, and single hyphen separators.',
      }
    );
  }
  return id;
}

function assertRepoPathIsDirectory(candidate: string): void {
  let stat;
  try {
    stat = fsSync.statSync(candidate);
  } catch {
    throw new StoreError(`Repo path does not exist: ${candidate}`, 'repo_path_missing', {
      target: 'repo.root',
      fix: 'Pass the path of an existing checkout.',
    });
  }
  if (!stat.isDirectory()) {
    throw new StoreError(`Repo path is not a directory: ${candidate}`, 'repo_path_not_directory', {
      target: 'repo.root',
      fix: 'Pass an existing checkout directory.',
    });
  }
}

export async function registerRepo(input: RegisterRepoInput): Promise<RegisterRepoResult> {
  // The library API enforces its own invariants: a 4.1 caller must get
  // typed input errors, not serialize-time registry-corruption noise.
  // Path first: pointing at a missing path or a file is the more
  // fundamental mistake than an (often folder-derived) id.
  assertRepoPathIsDirectory(path.resolve(input.path));
  validateRepoIdOrThrow(input.id);
  const canonicalPath = FileSystemUtils.canonicalizeExistingPath(input.path);
  const targetPath = normalizePathForComparison(canonicalPath);
  const isSameMapping = (entry: { local_path: string } | undefined): boolean =>
    entry !== undefined && normalizePathForComparison(entry.local_path) === targetPath;
  const options = input.globalDataDir ? { globalDataDir: input.globalDataDir } : {};

  // No-op reruns never take the write lock (the store-side
  // commitStoreRegistration contract); the updater re-checks under the
  // lock for the race.
  const current = await readStoreRegistryState(options).catch(() => null);
  const existing = current?.repos?.[input.id];
  if (isSameMapping(existing)) {
    return { id: input.id, path: existing!.local_path, registered: false, alreadyRegistered: true };
  }

  let alreadyRegistered = false;
  await updateStoreRegistryState((registry) => {
    if (isSameMapping(registry?.repos?.[input.id])) {
      alreadyRegistered = true;
      return registry ?? { version: 1, stores: {} };
    }

    assertNoRegisteredRepoConflict(registry, input.id, canonicalPath);

    const repos = {
      ...(registry?.repos ?? {}),
      [input.id]: { local_path: canonicalPath },
    };
    return {
      version: 1,
      stores: registry?.stores ?? {},
      repos: Object.fromEntries(
        Object.entries(repos).sort(([leftId], [rightId]) => leftId.localeCompare(rightId))
      ),
    };
  }, options);

  return {
    id: input.id,
    path: canonicalPath,
    registered: !alreadyRegistered,
    alreadyRegistered,
  };
}

export async function unregisterRepo(
  id: string,
  options: { globalDataDir?: string } = {}
): Promise<RepoMapEntry> {
  validateRepoIdOrThrow(id);
  let removed: RepoMapEntry | null = null;
  await updateStoreRegistryState((registry) => {
    const entry = registry?.repos?.[id];
    if (!entry) {
      throw new StoreError(`No repo registered with id '${id}'.`, 'repo_not_found', {
        target: 'repo.id',
        fix: 'Run openspec repo list to see registered repos.',
      });
    }
    removed = { id, path: entry.local_path };

    const repos = { ...(registry?.repos ?? {}) };
    delete repos[id];
    return {
      version: 1,
      stores: registry?.stores ?? {},
      ...(Object.keys(repos).length > 0 ? { repos } : {}),
    };
  }, options);

  return removed!;
}

export async function listRegisteredStores(
  options: ListRegisteredStoresOptions = {}
): Promise<RegisteredStoreEntry[]> {
  const registry = await readStoreRegistryState(options);

  if (!registry) {
    return [];
  }

  return listStoreRegistryEntries(registry).map((entry) => ({
    ...entry,
    storeRoot: getStoreRootForBackend(entry.backend),
  }));
}

export async function getRegisteredStore(
  input: GetRegisteredStoreInput
): Promise<RegisteredStoreEntry> {
  const id = validateStoreId(input.id);
  const registry = await readStoreRegistryState({
    globalDataDir: input.globalDataDir,
  });
  const entry = getRegisteredStoreOrThrow(registry, id);
  assertExpectedRegisteredBackend(id, entry.backend, input.expectedBackend);

  return {
    ...entry,
    storeRoot: getStoreRootForBackend(entry.backend),
  };
}

export async function unregisterStoreRegistration(
  input: UnregisterStoreInput
): Promise<RegisteredStoreEntry> {
  const id = validateStoreId(input.id);
  let removed: StoreRegistryEntry | undefined;

  await updateStoreRegistryState(
    async (registry) => {
      const result = withoutRegisteredStore(registry, id, input.expectedBackend);
      const removedEntry = {
        ...result.removed,
        storeRoot: getStoreRootForBackend(result.removed.backend),
      };
      await input.beforeCommit?.(removedEntry);
      removed = result.removed;
      return result.next;
    },
    { globalDataDir: input.globalDataDir }
  );

  if (!removed) {
    throw new StoreError(`Unknown store '${id}'`, 'store_not_found', {
      target: 'store.id',
      fix: 'Run openspec store list to see registered stores.',
    });
  }

  return {
    ...removed,
    storeRoot: getStoreRootForBackend(removed.backend),
  };
}

export async function resolveRegisteredStore(
  input: ResolveRegisteredStoreInput
): Promise<ResolvedStore> {
  const id = validateStoreId(input.id);
  const registry = await readStoreRegistryState({
    globalDataDir: input.globalDataDir,
  });

  if (!registry) {
    throw new StoreError('No store registry found', 'no_store_registry', {
      target: 'store.id',
      fix: 'Register a store before using --store, or pass --store-path <path>.',
    });
  }

  const entry = getRegisteredStoreOrThrow(registry, id);
  const backend = entry.backend;
  const storeRoot = getStoreRootForBackend(backend);
  await ensureStoreMetadata(storeRoot, id, { writeIfMissing: false });

  return {
    id,
    storeRoot,
    backend,
  };
}
