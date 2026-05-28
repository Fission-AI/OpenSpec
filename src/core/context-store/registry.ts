import * as fs from 'node:fs/promises';

import {
  getContextStoreMetadataPath,
  getContextStoreMetadataDir,
  listContextStoreRegistryEntries,
  readContextStoreRegistryState,
  readOptionalContextStoreMetadataState,
  resolveGitContextStoreBackendConfig,
  updateContextStoreRegistryState,
  validateContextStoreId,
  writeContextStoreMetadataState,
  type ContextStoreBackendConfig,
  type ContextStoreGitBackendConfig,
  type ContextStorePathOptions,
  type ContextStoreRegistryEntry,
  type ContextStoreRegistryState,
} from './foundation.js';
import { ContextStoreError } from './errors.js';
import { FileSystemUtils } from '../../utils/file-system.js';

export interface RegisterContextStoreInput extends ContextStorePathOptions {
  id: string;
  localPath: string;
  remote?: string;
  branch?: string;
  cwd?: string;
}

export interface ResolveRegisteredContextStoreInput extends ContextStorePathOptions {
  id: string;
}

export interface GetRegisteredContextStoreInput extends ResolveRegisteredContextStoreInput {
  expectedBackend?: ContextStoreGitBackendConfig;
}

export interface UnregisterContextStoreInput extends ContextStorePathOptions {
  id: string;
  expectedBackend?: ContextStoreGitBackendConfig;
  beforeCommit?: (entry: RegisteredContextStoreEntry) => Promise<void>;
}

export type ListRegisteredContextStoresOptions = ContextStorePathOptions;

export interface RegisteredContextStoreEntry extends ContextStoreRegistryEntry {
  storeRoot: string;
}

export interface ResolvedContextStore {
  id: string;
  storeRoot: string;
  backend: ContextStoreGitBackendConfig;
}

export interface ContextStoreRegistrationCommit extends ResolvedContextStore {
  metadataCreated: boolean;
}

export interface CommitContextStoreRegistrationInput extends ContextStorePathOptions {
  id: string;
  backend: ContextStoreGitBackendConfig;
  writeMetadataIfMissing: boolean;
}

export function getStoreRootForBackend(backend: ContextStoreBackendConfig): string {
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
  registry: ContextStoreRegistryState | null,
  id: string,
  backend: ContextStoreGitBackendConfig
): void {
  const nextPath = normalizePathForComparison(getStoreRootForBackend(backend));

  for (const entry of listContextStoreRegistryEntries(registry ?? { version: 1, stores: {} })) {
    const entryPath = normalizePathForComparison(getStoreRootForBackend(entry.backend));

    if (entry.id === id && entryPath === nextPath) {
      continue;
    }

    if (entry.id === id) {
      throw new ContextStoreError(
        `Context store '${id}' is already registered at ${getStoreRootForBackend(entry.backend)}.`,
        'context_store_id_conflict',
        {
          target: 'context_store.id',
          fix: 'Use the existing registration or choose a different context store id.',
        }
      );
    }

    if (entryPath === nextPath) {
      throw new ContextStoreError(
        `Context store path is already registered as '${entry.id}'.`,
        'context_store_path_conflict',
        {
          target: 'context_store.root',
          fix: `Use the existing '${entry.id}' registration or choose a different path.`,
        }
      );
    }
  }
}

function withRegisteredStore(
  registry: ContextStoreRegistryState | null,
  id: string,
  backend: ContextStoreGitBackendConfig
): ContextStoreRegistryState {
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
  registry: ContextStoreRegistryState | null,
  id: string
): ContextStoreRegistryEntry {
  const entry = registry?.stores[id];
  if (!entry) {
    throw new ContextStoreError(`Unknown context store '${id}'`, 'context_store_not_found', {
      target: 'context_store.id',
      fix: 'Run openspec context-store list to see registered stores.',
    });
  }

  return {
    id,
    backend: entry.backend,
  };
}

function contextStoreBackendsMatch(
  actual: ContextStoreGitBackendConfig,
  expected: ContextStoreGitBackendConfig
): boolean {
  return (
    actual.type === expected.type &&
    normalizePathForComparison(actual.local_path) ===
      normalizePathForComparison(expected.local_path) &&
    actual.remote === expected.remote &&
    actual.branch === expected.branch
  );
}

function assertExpectedRegisteredBackend(
  id: string,
  actual: ContextStoreGitBackendConfig,
  expected: ContextStoreGitBackendConfig | undefined
): void {
  if (!expected || contextStoreBackendsMatch(actual, expected)) return;

  throw new ContextStoreError(
    `Context store '${id}' changed before cleanup completed.`,
    'context_store_registry_changed',
    {
      target: 'context_store.registry',
      fix: 'Retry the cleanup command after reviewing the current context-store registration.',
    }
  );
}

function withoutRegisteredStore(
  registry: ContextStoreRegistryState | null,
  id: string,
  expectedBackend?: ContextStoreGitBackendConfig
): { next: ContextStoreRegistryState; removed: ContextStoreRegistryEntry } {
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
  const metadata = await readOptionalContextStoreMetadataState(storeRoot);

  if (!metadata) {
    if (!options.writeIfMissing) {
      throw new ContextStoreError(
        `Registered context store '${id}' is missing metadata at ${getContextStoreMetadataPath(storeRoot)}`,
        'context_store_metadata_missing',
        {
          target: 'context_store.metadata',
          fix: `Create ${getContextStoreMetadataPath(storeRoot)} or rerun context-store register.`,
        }
      );
    }

    await writeContextStoreMetadataState(storeRoot, {
      version: 1,
      id,
    });
    return true;
  }

  if (metadata.id !== id) {
    throw new ContextStoreError(
      `Context store metadata id '${metadata.id}' does not match registered id '${id}'`,
      'context_store_metadata_id_mismatch',
      {
        target: 'context_store.metadata',
        fix: 'Repair the local registry or store metadata so the ids match.',
      }
    );
  }

  return false;
}

export async function commitContextStoreRegistration(
  input: CommitContextStoreRegistrationInput
): Promise<ContextStoreRegistrationCommit> {
  const id = validateContextStoreId(input.id);
  const backend = input.backend;
  const storeRoot = getStoreRootForBackend(backend);

  let metadataCreated = false;

  try {
    metadataCreated = await ensureStoreMetadata(storeRoot, id, {
      writeIfMissing: input.writeMetadataIfMissing,
    });
    await updateContextStoreRegistryState(
      (registry) => withRegisteredStore(registry, id, backend),
      { globalDataDir: input.globalDataDir }
    );
  } catch (error) {
    if (metadataCreated) {
      await fs.rm(getContextStoreMetadataPath(storeRoot), { force: true });
      await fs.rmdir(getContextStoreMetadataDir(storeRoot)).catch(() => undefined);
    }

    throw error;
  }

  return {
    id,
    storeRoot,
    backend,
    metadataCreated,
  };
}

export async function registerContextStore(
  input: RegisterContextStoreInput
): Promise<ResolvedContextStore> {
  const id = validateContextStoreId(input.id);
  const backend = await resolveGitContextStoreBackendConfig(
    {
      localPath: input.localPath,
      ...(input.remote !== undefined ? { remote: input.remote } : {}),
      ...(input.branch !== undefined ? { branch: input.branch } : {}),
    },
    input.cwd
  );
  const storeRoot = getStoreRootForBackend(backend);

  const committed = await commitContextStoreRegistration({
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

export async function listRegisteredContextStores(
  options: ListRegisteredContextStoresOptions = {}
): Promise<RegisteredContextStoreEntry[]> {
  const registry = await readContextStoreRegistryState(options);

  if (!registry) {
    return [];
  }

  return listContextStoreRegistryEntries(registry).map((entry) => ({
    ...entry,
    storeRoot: getStoreRootForBackend(entry.backend),
  }));
}

export async function getRegisteredContextStore(
  input: GetRegisteredContextStoreInput
): Promise<RegisteredContextStoreEntry> {
  const id = validateContextStoreId(input.id);
  const registry = await readContextStoreRegistryState({
    globalDataDir: input.globalDataDir,
  });
  const entry = getRegisteredStoreOrThrow(registry, id);
  assertExpectedRegisteredBackend(id, entry.backend, input.expectedBackend);

  return {
    ...entry,
    storeRoot: getStoreRootForBackend(entry.backend),
  };
}

export async function unregisterContextStoreRegistration(
  input: UnregisterContextStoreInput
): Promise<RegisteredContextStoreEntry> {
  const id = validateContextStoreId(input.id);
  let removed: ContextStoreRegistryEntry | undefined;

  await updateContextStoreRegistryState(
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
    throw new ContextStoreError(`Unknown context store '${id}'`, 'context_store_not_found', {
      target: 'context_store.id',
      fix: 'Run openspec context-store list to see registered stores.',
    });
  }

  return {
    ...removed,
    storeRoot: getStoreRootForBackend(removed.backend),
  };
}

export async function resolveRegisteredContextStore(
  input: ResolveRegisteredContextStoreInput
): Promise<ResolvedContextStore> {
  const id = validateContextStoreId(input.id);
  const registry = await readContextStoreRegistryState({
    globalDataDir: input.globalDataDir,
  });

  if (!registry) {
    throw new ContextStoreError('No context store registry found', 'no_context_store_registry', {
      target: 'context_store.id',
      fix: 'Register a context store before using --store, or pass --store-path <path>.',
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
