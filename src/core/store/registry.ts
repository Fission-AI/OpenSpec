import * as fs from 'node:fs/promises';

import { FileSystemUtils } from '../../utils/file-system.js';
import { writeFileAtomically } from '../file-state.js';
import {
  getStoreMetadataPath,
  getStoreMetadataDir,
  listStoreRegistryEntries,
  readStoreRegistryState,
  readOptionalStoreMetadataState,
  resolveGitStoreBackendConfig,
  updateStoreRegistryState,
  readProjectStoreRegistryState,
  listProjectStoreRegistryEntries,
  findProjectStoreById,
  walkProjectStoreRegistries,
  serializeProjectStoreRegistryState,
  parseProjectStoreRegistryState,
  getStoreRegistryPath,
  normalizePathForComparison,
  type ProjectStoreRegistryState,
  type ProjectStoreEntryState,
  validateStoreId,
  writeStoreMetadataState,
  type StoreBackendConfig,
  type StoreGitBackendConfig,
  type StorePathOptions,
  type StoreRegistryEntry,
  type StoreRegistryState,
} from './foundation.js';
import { StoreError } from './errors.js';
import * as path from 'node:path';

function isFileNotFoundError(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && (error as NodeJS.ErrnoException).code === 'ENOENT';
}

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
  /** Runs under the registry lock, with the registrations that will remain. */
  beforeCommit?: (
    entry: RegisteredStoreEntry,
    remaining: RegisteredStoreEntry[]
  ) => Promise<void>;
}

export type ListRegisteredStoresOptions = StorePathOptions;

export interface RegisteredStoreEntry extends StoreRegistryEntry {
  storeRoot: string;
  /** For project-scoped entries, the directory containing the owning registry file. */
  registryDir?: string;
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

  // Project-scoped registry uses a simpler { path: ... } format.
  if (input.projectRoot !== undefined) {
    // Canonicalize both sides so symlinked prefixes (e.g. /var -> /private/var
    // on macOS) can't produce a false "outside the project" rejection.
    const projectRoot = FileSystemUtils.canonicalizeExistingPath(input.projectRoot);
    const resolvedStoreRoot = FileSystemUtils.canonicalizeExistingPath(storeRoot);
    const relativePath = path.relative(projectRoot, resolvedStoreRoot);
    // Store the original absolute path when the store lives outside the
    // project (relativePath starts with .. or is absolute) so it
    // resolves identically regardless of where the registry file lives.
    // For stores inside the project, store the relative path (portable
    // across machines). Normalize backslashes to forward slashes in both cases.
    const isOutsideProject = relativePath.startsWith('..') || path.isAbsolute(relativePath);
    const portableRelativePath = isOutsideProject
      ? resolvedStoreRoot.replace(/\\/g, '/')
      : relativePath.replace(/\\/g, '/');

    try {
      metadataCreated = await ensureStoreMetadata(storeRoot, id, {
        writeIfMissing: input.writeMetadataIfMissing,
      });

      const registryPath = getStoreRegistryPath({ projectRoot });
      let existingRegistry: ProjectStoreRegistryState | null = null;
      try {
        const content = await fs.readFile(registryPath, 'utf-8');
        existingRegistry = parseProjectStoreRegistryState(content);
      } catch (error: unknown) {
        if (!isFileNotFoundError(error)) {
          throw error;
        }
      }

      const existing = existingRegistry?.stores[id];
      const existingPath = existing ? path.resolve(projectRoot, existing.path) : undefined;
      isRerun = existingPath !== undefined && normalizePathForComparison(existingPath) === normalizePathForComparison(resolvedStoreRoot);

      if (!isRerun) {
        const nextState: ProjectStoreRegistryState = {
          version: 1,
          stores: {
            ...(existingRegistry?.stores ?? {}),
            [id]: { path: portableRelativePath } satisfies ProjectStoreEntryState,
          },
        };
        await writeFileAtomically(registryPath, serializeProjectStoreRegistryState(nextState));
        registryUpdated = true;
      }
    } catch (error) {
      if (metadataCreated) {
        const currentRegistry = await readProjectStoreRegistryState(input.projectRoot).catch(() => null);
        if (!currentRegistry?.stores[id]) {
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

  try {
    metadataCreated = await ensureStoreMetadata(storeRoot, id, {
      writeIfMissing: input.writeMetadataIfMissing,
    });
    const registry = await readStoreRegistryState({
      globalDataDir: input.globalDataDir,
    });
    const existing = registry?.stores[id];
    const existingBackend = existing?.backend as StoreGitBackendConfig | undefined;
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

export interface RegistrySnapshot {
  /** null = the registry is unreadable; [] = empty or absent. */
  entries: StoreRegistryEntry[] | null;
  unreadable: boolean;
}

/**
 * One registry read serving every consumer in a command.
 */
export async function readRegistrySnapshot(
  options: { globalDataDir?: string } = {}
): Promise<RegistrySnapshot> {
  try {
    const registry = await readStoreRegistryState(options);
    return {
      entries: registry ? listStoreRegistryEntries(registry) : [],
      unreadable: false,
    };
  } catch {
    return { entries: null, unreadable: true };
  }
}

export async function listRegisteredStores(
  options: ListRegisteredStoresOptions = {}
): Promise<RegisteredStoreEntry[]> {
  if (options.projectRoot !== undefined) {
    const levels = await walkProjectStoreRegistries(options.projectRoot);
    return levels.flatMap((level) =>
      listProjectStoreRegistryEntries(level.state, level.registryDir).map((entry) => ({
        id: entry.id,
        backend: { type: 'git' as const, local_path: entry.storeRoot },
        storeRoot: entry.storeRoot,
        registryDir: level.registryDir,
      }))
    );
  }

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

  if (input.projectRoot !== undefined) {
    const lookup = await findProjectStoreById(input.id, input.projectRoot);
    if (!lookup.found) {
      throw new StoreError(`Unknown store '${id}'.`, 'store_not_found', {
        target: 'store.id',
        fix: 'Run openspec store list --scope project to see registered stores.',
      });
    }
    const storeRoot = lookup.found.storeRoot;
    return {
      id,
      backend: { type: 'git' as const, local_path: storeRoot },
      storeRoot,
      registryDir: lookup.found.registryDir,
    };
  }

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

  if (input.projectRoot !== undefined) {
    const levels = await walkProjectStoreRegistries(input.projectRoot);
    const level = levels.find((l) => l.state.stores[id] !== undefined);
    if (!level) {
      throw new StoreError(`Unknown store '${id}'.`, 'store_not_found', {
        target: 'store.id',
        fix: 'Run openspec store list --scope project to see registered stores.',
      });
    }

    const removedStateEntry = level.state.stores[id];
    const removedStoreRoot = path.resolve(level.registryDir, removedStateEntry.path);
    if (input.expectedBackend !== undefined) {
      const actualBackend: StoreGitBackendConfig = {
        type: 'git' as const,
        local_path: removedStoreRoot,
      };
      assertExpectedRegisteredBackend(id, actualBackend, input.expectedBackend);
    }
    const stores = { ...level.state.stores };
    delete stores[id];

    const nextState: ProjectStoreRegistryState = {
      version: 1,
      stores,
    };

    const removedRegistration: RegisteredStoreEntry = {
      id,
      backend: { type: 'git' as const, local_path: removedStoreRoot },
      storeRoot: removedStoreRoot,
      registryDir: level.registryDir,
    };
    const remaining = listProjectStoreRegistryEntries(nextState, level.registryDir).map((entry) => ({
      id: entry.id,
      backend: { type: 'git' as const, local_path: entry.storeRoot },
      storeRoot: entry.storeRoot,
      registryDir: level.registryDir,
    }));
    await input.beforeCommit?.(removedRegistration, remaining);

    const registryPath = getStoreRegistryPath({ projectRoot: level.registryDir });
    await writeFileAtomically(registryPath, serializeProjectStoreRegistryState(nextState));

    return removedRegistration;
  }

  await updateStoreRegistryState(
    async (registry) => {
      const result = withoutRegisteredStore(registry, id, input.expectedBackend);
      const removedEntry = {
        ...result.removed,
        storeRoot: getStoreRootForBackend(result.removed.backend),
      };
      const remaining = listStoreRegistryEntries(result.next).map((entry) => ({
        ...entry,
        storeRoot: getStoreRootForBackend(entry.backend),
      }));
      await input.beforeCommit?.(removedEntry, remaining);
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
      fix: 'Register a store with openspec store register <path>, then select it with --store <id>.',
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
