import {
  getContextStoreMetadataPath,
  listContextStoreRegistryEntries,
  readContextStoreRegistryState,
  readOptionalContextStoreMetadataState,
  resolveGitContextStoreBackendConfig,
  validateContextStoreId,
  writeContextStoreMetadataState,
  writeContextStoreRegistryState,
  type ContextStoreBackendConfig,
  type ContextStoreGitBackendConfig,
  type ContextStorePathOptions,
  type ContextStoreRegistryEntry,
  type ContextStoreRegistryState,
} from './foundation.js';

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

export type ListRegisteredContextStoresOptions = ContextStorePathOptions;

export interface RegisteredContextStoreEntry extends ContextStoreRegistryEntry {
  storeRoot: string;
}

export interface ResolvedContextStore {
  id: string;
  storeRoot: string;
  backend: ContextStoreGitBackendConfig;
}

function getStoreRootForBackend(backend: ContextStoreBackendConfig): string {
  switch (backend.type) {
    case 'git':
      return backend.local_path;
  }
}

function withRegisteredStore(
  registry: ContextStoreRegistryState | null,
  id: string,
  backend: ContextStoreGitBackendConfig
): ContextStoreRegistryState {
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

async function ensureStoreMetadata(
  storeRoot: string,
  id: string,
  options: { writeIfMissing: boolean }
): Promise<void> {
  const metadata = await readOptionalContextStoreMetadataState(storeRoot);

  if (!metadata) {
    if (!options.writeIfMissing) {
      throw new Error(
        `Registered context store '${id}' is missing metadata at ${getContextStoreMetadataPath(storeRoot)}`
      );
    }

    await writeContextStoreMetadataState(storeRoot, {
      version: 1,
      id,
    });
    return;
  }

  if (metadata.id !== id) {
    throw new Error(
      `Context store metadata id '${metadata.id}' does not match registered id '${id}'`
    );
  }
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

  await ensureStoreMetadata(storeRoot, id, { writeIfMissing: true });

  const registry = await readContextStoreRegistryState({
    globalDataDir: input.globalDataDir,
  });
  await writeContextStoreRegistryState(withRegisteredStore(registry, id, backend), {
    globalDataDir: input.globalDataDir,
  });

  return {
    id,
    storeRoot,
    backend,
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

export async function resolveRegisteredContextStore(
  input: ResolveRegisteredContextStoreInput
): Promise<ResolvedContextStore> {
  const id = validateContextStoreId(input.id);
  const registry = await readContextStoreRegistryState({
    globalDataDir: input.globalDataDir,
  });

  if (!registry) {
    throw new Error('No context store registry found');
  }

  const entry = registry.stores[id];
  if (!entry) {
    throw new Error(`Unknown context store '${id}'`);
  }

  const backend = entry.backend;
  const storeRoot = getStoreRootForBackend(backend);
  await ensureStoreMetadata(storeRoot, id, { writeIfMissing: false });

  return {
    id,
    storeRoot,
    backend,
  };
}
