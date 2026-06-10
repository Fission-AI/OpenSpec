import {
  getStoreMetadataPath,
  readOptionalStoreMetadataState,
  resolveGitStoreBackendConfig,
  validateStoreId,
  type StorePathOptions,
} from './foundation.js';
import { StoreError } from './errors.js';
import {
  resolveRegisteredStore,
  type ResolvedStore,
} from './registry.js';

export type StoreSelector =
  | {
      kind: 'registry';
      id: string;
    }
  | {
      kind: 'path';
      path: string;
      observed_id?: string;
    };

export type StoreSelectorSource = 'registry' | 'path';

export interface StoreSelectorOptions {
  store?: string;
  storePath?: string;
}

export interface SelectedStore {
  id: string;
  root: string;
  source: StoreSelectorSource;
}

export interface StoreBinding {
  id: string;
  selector: StoreSelector;
}

export interface StoreBindingWarning {
  code: string;
  message: string;
  target?: string;
  fix?: string;
}

export interface ResolvedStoreBinding {
  binding: StoreBinding;
  id: string;
  root: string;
  source: 'registry' | 'path';
  registered?: ResolvedStore;
  warnings: StoreBindingWarning[];
}

export function createRegisteredStoreBinding(id: string): StoreBinding {
  const validatedId = validateStoreId(id);

  return {
    id: validatedId,
    selector: {
      kind: 'registry',
      id: validatedId,
    },
  };
}

export function createPathStoreBinding(input: {
  id: string;
  path: string;
}): StoreBinding {
  const id = validateStoreId(input.id);

  if (input.path.length === 0) {
    throw new Error('Store binding path must not be empty.');
  }

  return {
    id,
    selector: {
      kind: 'path',
      path: input.path,
      observed_id: id,
    },
  };
}

export function normalizeStoreBinding(binding: StoreBinding): StoreBinding {
  const id = validateStoreId(binding.id);

  if (binding.selector.kind === 'registry') {
    return createRegisteredStoreBinding(binding.selector.id);
  }

  if (binding.selector.path.length === 0) {
    throw new Error('Store binding path must not be empty.');
  }

  return {
    id,
    selector: {
      kind: 'path',
      path: binding.selector.path,
      ...(binding.selector.observed_id
        ? { observed_id: validateStoreId(binding.selector.observed_id) }
        : {}),
    },
  };
}

export function sameStoreBinding(
  left: StoreBinding,
  right: StoreBinding
): boolean {
  const normalizedLeft = normalizeStoreBinding(left);
  const normalizedRight = normalizeStoreBinding(right);

  if (normalizedLeft.selector.kind !== normalizedRight.selector.kind) {
    return false;
  }

  if (
    normalizedLeft.selector.kind === 'registry' &&
    normalizedRight.selector.kind === 'registry'
  ) {
    return normalizedLeft.selector.id === normalizedRight.selector.id;
  }

  if (
    normalizedLeft.selector.kind === 'path' &&
    normalizedRight.selector.kind === 'path'
  ) {
    return normalizedLeft.selector.path === normalizedRight.selector.path;
  }

  return false;
}

export function formatStoreBinding(binding: StoreBinding): string {
  const normalized = normalizeStoreBinding(binding);

  if (normalized.selector.kind === 'registry') {
    return normalized.selector.id;
  }

  return `${normalized.id} via ${normalized.selector.path}`;
}

export function formatStoreBindingSelector(binding: StoreBinding): string {
  const normalized = normalizeStoreBinding(binding);

  return normalized.selector.kind === 'registry'
    ? `--store ${normalized.selector.id}`
    : `--store-path ${normalized.selector.path}`;
}

export function formatStoreSelector(selected: SelectedStore): string {
  return selected.source === 'registry'
    ? `--store ${selected.id}`
    : `--store-path ${selected.root}`;
}

export function createStoreBindingFromSelected(
  selected: SelectedStore
): StoreBinding {
  return selected.source === 'registry'
    ? createRegisteredStoreBinding(selected.id)
    : createPathStoreBinding({
        id: selected.id,
        path: selected.root,
      });
}

function validateSelectorConflict(
  options: StoreSelectorOptions,
  commandName: string
): void {
  if (options.store !== undefined && options.storePath !== undefined) {
    throw new StoreError(
      'Pass either --store <id> or --store-path <path>, not both.',
      'store_selector_conflict',
      {
        target: 'store',
        fix: `openspec ${commandName} --store <id>`,
      }
    );
  }
}

export function requireStoreSelector(
  options: StoreSelectorOptions,
  commandName: string
): void {
  validateSelectorConflict(options, commandName);

  if (options.store === undefined && options.storePath === undefined) {
    throw new StoreError(
      'Pass --store <id> or --store-path <path>.',
      'store_required',
      {
        target: 'store',
        fix: `openspec ${commandName} --store <id>`,
      }
    );
  }
}

export async function resolveSelectedStore(
  options: StoreSelectorOptions,
  commandName: string,
  pathOptions: StorePathOptions = {}
): Promise<SelectedStore> {
  requireStoreSelector(options, commandName);

  if (options.store !== undefined) {
    const resolved = await resolveRegisteredStore({
      id: options.store,
      globalDataDir: pathOptions.globalDataDir,
    });

    return {
      id: resolved.id,
      root: resolved.storeRoot,
      source: 'registry',
    };
  }

  const storePath = options.storePath ?? '';
  let root: string;

  try {
    const backend = await resolveGitStoreBackendConfig({
      localPath: storePath,
    });
    root = backend.local_path;
  } catch (error) {
    throw new StoreError(
      error instanceof Error ? error.message : String(error),
      'invalid_store_path',
      {
        target: 'store.path',
        fix: 'Pass an existing store root.',
      }
    );
  }

  let metadata: Awaited<ReturnType<typeof readOptionalStoreMetadataState>>;

  try {
    metadata = await readOptionalStoreMetadataState(root);
  } catch (error) {
    throw new StoreError(
      error instanceof Error ? error.message : String(error),
      'invalid_store_metadata',
      {
        target: 'store.metadata',
        fix: `Fix ${getStoreMetadataPath(root)} before using this store.`,
      }
    );
  }

  if (!metadata) {
    throw new StoreError(
      `Store metadata not found at ${getStoreMetadataPath(root)}`,
      'store_metadata_not_found',
      {
        target: 'store.metadata',
        fix: 'Pass a store root that contains .openspec-store/store.yaml.',
      }
    );
  }

  return {
    id: metadata.id,
    root,
    source: 'path',
  };
}

export async function resolveStoreBinding(
  binding: StoreBinding,
  options: StorePathOptions = {}
): Promise<ResolvedStoreBinding> {
  const normalized = normalizeStoreBinding(binding);

  if (normalized.selector.kind === 'registry') {
    const registered = await resolveRegisteredStore({
      id: normalized.selector.id,
      globalDataDir: options.globalDataDir,
    });

    return {
      binding: normalized,
      id: registered.id,
      root: registered.storeRoot,
      source: 'registry',
      registered,
      warnings: [],
    };
  }

  const backend = await resolveGitStoreBackendConfig({
    localPath: normalized.selector.path,
  });
  const root = backend.local_path;
  const metadata = await readOptionalStoreMetadataState(root);

  if (!metadata) {
    throw new Error(`Store metadata not found at ${getStoreMetadataPath(root)}`);
  }

  const warnings: StoreBindingWarning[] = [];
  const observedId = normalized.selector.observed_id ?? normalized.id;

  if (metadata.id !== observedId) {
    warnings.push({
      code: 'store_binding_id_changed',
      message: `Store at ${root} now reports id '${metadata.id}' instead of '${observedId}'.`,
      target: 'metadata.id',
      fix: `Review ${getStoreMetadataPath(root)} or re-open the workspace with the intended store.`,
    });
  }

  return {
    binding: normalized,
    id: metadata.id,
    root,
    source: 'path',
    warnings,
  };
}
