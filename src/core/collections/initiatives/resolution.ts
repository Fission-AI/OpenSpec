import {
  getContextStoreMetadataPath,
  listRegisteredContextStores,
  readOptionalContextStoreMetadataState,
  resolveGitContextStoreBackendConfig,
  resolveRegisteredContextStore,
} from '../../context-store/index.js';
import { mountInitiativesCollection } from './collection.js';
import { readInitiative } from './operations.js';
import { INITIATIVE_FILE_NAME, type InitiativeState } from './schema.js';

export type ContextStoreSelectorSource = 'registry' | 'path';

export interface InitiativeSelectorOptions {
  store?: string;
  storePath?: string;
  json?: boolean;
}

export interface SelectedContextStore {
  id: string;
  root: string;
  source: ContextStoreSelectorSource;
}

export interface InitiativeResolutionMatch {
  context_store: {
    id: string;
    root: string;
  };
  initiative: {
    id: string;
    title: string;
    root: string;
  };
}

export interface InitiativeResolutionDetails extends Record<string, unknown> {
  matches?: InitiativeResolutionMatch[];
}

export class InitiativeResolutionError extends Error {
  readonly code: string;
  readonly target?: string;
  readonly fix?: string;
  readonly details?: InitiativeResolutionDetails;

  constructor(
    message: string,
    code: string,
    options: { target?: string; fix?: string; details?: InitiativeResolutionDetails } = {}
  ) {
    super(message);
    this.code = code;
    this.target = options.target;
    this.fix = options.fix;
    this.details = options.details;
  }
}

export interface InitiativeViewReference {
  store: string;
  storeSource: ContextStoreSelectorSource;
  storeRoot: string;
  id: string;
  title: string;
  summary: string;
  created: string;
  root: string;
  storePath: string;
  metadataPath: string;
}

function asErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function requireInitiativeId(
  id: string | undefined,
  commandName: 'create' | 'show'
): string {
  if (id === undefined || id.trim().length === 0) {
    throw new InitiativeResolutionError('Pass an initiative id.', 'initiative_id_required', {
      target: 'initiative.id',
      fix: `openspec initiative ${commandName} <id>`,
    });
  }

  return id.trim();
}

export function parseInitiativeReference(
  reference: string | undefined,
  options: InitiativeSelectorOptions
): { initiativeId: string; options: InitiativeSelectorOptions } {
  const initiativeId = requireInitiativeId(reference, 'show');
  const parts = initiativeId.split('/');

  if (parts.length === 1) {
    return { initiativeId, options };
  }

  if (parts.length !== 2 || parts[0].length === 0 || parts[1].length === 0) {
    throw new InitiativeResolutionError(
      `Invalid initiative reference '${initiativeId}'.`,
      'invalid_initiative_reference',
      {
        target: 'initiative.id',
        fix: 'Use <initiative-id>, <store>/<initiative-id>, or <initiative-id> --store <store>.',
      }
    );
  }

  if (options.store !== undefined || options.storePath !== undefined) {
    throw new InitiativeResolutionError(
      'Pass either --initiative <store>/<id> or a context store selector, not both.',
      'context_store_selector_conflict',
      {
        target: 'context_store',
        fix: 'Use --initiative <store>/<id> or --initiative <id> --store <store>.',
      }
    );
  }

  return {
    initiativeId: parts[1],
    options: {
      ...options,
      store: parts[0],
    },
  };
}

function mapRegistrySelectorError(error: unknown, storeId: string): InitiativeResolutionError {
  const message = asErrorMessage(error);

  if (message === 'No context store registry found') {
    return new InitiativeResolutionError(message, 'no_context_store_registry', {
      target: 'context_store.id',
      fix: 'Register a context store before using --store, or pass --store-path <path>.',
    });
  }

  if (message.startsWith('Unknown context store ')) {
    return new InitiativeResolutionError(message, 'context_store_not_found', {
      target: 'context_store.id',
      fix: `Use a known context store id instead of '${storeId}', or pass --store-path <path>.`,
    });
  }

  if (message.startsWith('Context store id ')) {
    return new InitiativeResolutionError(message, 'invalid_context_store_id', {
      target: 'context_store.id',
      fix: 'Use kebab-case with lowercase letters, numbers, and single hyphen separators.',
    });
  }

  return new InitiativeResolutionError(message, 'invalid_context_store', {
    target: 'context_store',
    fix: 'Fix the context store registry or pass --store-path <path>.',
  });
}

export async function resolveRegisteredInitiativeContextStore(
  storeId: string
): Promise<SelectedContextStore> {
  try {
    const resolved = await resolveRegisteredContextStore({ id: storeId });

    return {
      id: resolved.id,
      root: resolved.storeRoot,
      source: 'registry',
    };
  } catch (error) {
    throw mapRegistrySelectorError(error, storeId);
  }
}

export async function resolvePathInitiativeContextStore(
  storePath: string
): Promise<SelectedContextStore> {
  let root: string;

  try {
    const backend = await resolveGitContextStoreBackendConfig({
      localPath: storePath,
    });
    root = backend.local_path;
  } catch (error) {
    throw new InitiativeResolutionError(
      asErrorMessage(error),
      'invalid_context_store_path',
      {
        target: 'context_store.path',
        fix: 'Pass an existing context store root.',
      }
    );
  }

  let metadata: Awaited<ReturnType<typeof readOptionalContextStoreMetadataState>>;

  try {
    metadata = await readOptionalContextStoreMetadataState(root);
  } catch (error) {
    throw new InitiativeResolutionError(
      asErrorMessage(error),
      'invalid_context_store_metadata',
      {
        target: 'context_store.metadata',
        fix: `Fix ${getContextStoreMetadataPath(root)} before using this store.`,
      }
    );
  }

  if (!metadata) {
    throw new InitiativeResolutionError(
      `Context store metadata not found at ${getContextStoreMetadataPath(root)}`,
      'context_store_metadata_not_found',
      {
        target: 'context_store.metadata',
        fix: 'Pass a context store root that contains .openspec-store/store.yaml.',
      }
    );
  }

  return {
    id: metadata.id,
    root,
    source: 'path',
  };
}

export async function selectContextStoreForInitiative(
  options: InitiativeSelectorOptions,
  commandName: 'create' | 'list' | 'show'
): Promise<SelectedContextStore> {
  const { store, storePath } = options;
  const hasStore = store !== undefined;
  const hasStorePath = storePath !== undefined;

  if (hasStore && hasStorePath) {
    throw new InitiativeResolutionError(
      'Pass either --store <id> or --store-path <path>, not both.',
      'context_store_selector_conflict',
      {
        target: 'context_store',
        fix: `openspec initiative ${commandName} --store <id>`,
      }
    );
  }

  if (hasStorePath) {
    return resolvePathInitiativeContextStore(storePath);
  }

  if (hasStore) {
    return resolveRegisteredInitiativeContextStore(store);
  }

  throw new InitiativeResolutionError(
    'Pass --store <id> or --store-path <path>.',
    'context_store_required',
    {
      target: 'context_store',
      fix: `openspec initiative ${commandName} --store <id>`,
    }
  );
}

export function formatContextStoreSelector(selected: SelectedContextStore): string {
  return selected.source === 'registry'
    ? `--store ${selected.id}`
    : `--store-path ${selected.root}`;
}

function toInitiativeViewReference(
  selected: SelectedContextStore,
  state: InitiativeState
): InitiativeViewReference {
  const collection = mountInitiativesCollection(selected.root);

  return {
    store: selected.id,
    storeSource: selected.source,
    storeRoot: selected.root,
    id: state.id,
    title: state.title,
    summary: state.summary,
    created: state.created,
    root: collection.resolvePath(state.id),
    storePath: collection.toStorePath(state.id),
    metadataPath: collection.resolvePath(`${state.id}/${INITIATIVE_FILE_NAME}`),
  };
}

function toResolutionMatch(
  selected: SelectedContextStore,
  state: InitiativeState
): InitiativeResolutionMatch {
  const reference = toInitiativeViewReference(selected, state);

  return {
    context_store: {
      id: reference.store,
      root: reference.storeRoot,
    },
    initiative: {
      id: reference.id,
      title: reference.title,
      root: reference.root,
    },
  };
}

async function readSelectedInitiative(
  selected: SelectedContextStore,
  initiativeId: string
): Promise<InitiativeState | null> {
  return readInitiative({
    collection: mountInitiativesCollection(selected.root),
    id: initiativeId,
  });
}

export async function resolveSelectedInitiativeViewReference(
  selected: SelectedContextStore,
  initiativeId: string
): Promise<InitiativeViewReference> {
  const state = await readSelectedInitiative(selected, initiativeId);

  if (!state) {
    throw new InitiativeResolutionError(
      `Initiative '${initiativeId}' was not found in context store '${selected.id}'.`,
      'initiative_not_found',
      {
        target: 'initiative.id',
        fix: `openspec initiative list ${formatContextStoreSelector(selected)}`,
      }
    );
  }

  return toInitiativeViewReference(selected, state);
}

export async function resolveInitiativeViewReference(
  reference: string | undefined,
  options: InitiativeSelectorOptions = {}
): Promise<InitiativeViewReference> {
  const parsed = parseInitiativeReference(reference, options);

  if (parsed.options.store !== undefined || parsed.options.storePath !== undefined) {
    const selected = await selectContextStoreForInitiative(parsed.options, 'show');
    return resolveSelectedInitiativeViewReference(selected, parsed.initiativeId);
  }

  const registeredStores = await listRegisteredContextStores();
  const matches: Array<{
    selected: SelectedContextStore;
    state: InitiativeState;
    diagnostic: InitiativeResolutionMatch;
  }> = [];
  const invalidInitiatives: unknown[] = [];
  let unreadableCount = 0;

  for (const entry of registeredStores) {
    let selected: SelectedContextStore;
    try {
      selected = await resolveRegisteredInitiativeContextStore(entry.id);
    } catch {
      unreadableCount++;
      continue;
    }

    try {
      const state = await readSelectedInitiative(selected, parsed.initiativeId);
      if (state) {
        matches.push({
          selected,
          state,
          diagnostic: toResolutionMatch(selected, state),
        });
      }
    } catch (error) {
      invalidInitiatives.push(error);
    }
  }

  if (unreadableCount > 0) {
    throw new InitiativeResolutionError(
      `Initiative lookup for '${parsed.initiativeId}' is incomplete because some context stores could not be read.`,
      'initiative_lookup_incomplete',
      {
        target: 'context_store',
        fix: 'openspec context-store doctor',
        ...(matches.length > 0
          ? { details: { matches: matches.map((match) => match.diagnostic) } }
          : {}),
      }
    );
  }

  if (invalidInitiatives.length > 0) {
    throw invalidInitiatives[0];
  }

  if (matches.length === 0) {
    throw new InitiativeResolutionError(
      `Initiative '${parsed.initiativeId}' was not found in registered context stores.`,
      'initiative_not_found',
      {
        target: 'initiative.id',
        fix: 'openspec initiative list',
      }
    );
  }

  if (matches.length > 1) {
    throw new InitiativeResolutionError(
      `Initiative '${parsed.initiativeId}' exists in multiple context stores.`,
      'initiative_ambiguous',
      {
        target: 'initiative.id',
        fix: `openspec initiative show ${parsed.initiativeId} --store <store>`,
        details: { matches: matches.map((match) => match.diagnostic) },
      }
    );
  }

  const [match] = matches;
  return toInitiativeViewReference(match.selected, match.state);
}
