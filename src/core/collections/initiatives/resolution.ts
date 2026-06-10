import {
  StoreError,
  formatStoreSelector,
  listRegisteredStores,
  resolveSelectedStore,
  type StoreSelectorOptions,
  type StoreSelectorSource,
  type SelectedStore,
} from '../../store/index.js';
import { mountInitiativesCollection } from './collection.js';
import { listInitiatives, readInitiative } from './operations.js';
import { INITIATIVE_FILE_NAME, type InitiativeState } from './schema.js';

export interface InitiativeSelectorOptions extends StoreSelectorOptions {
  json?: boolean;
}

export type { StoreSelectorSource, SelectedStore };
export { formatStoreSelector };

export interface InitiativeResolutionMatch {
  store: {
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
  storeSource: StoreSelectorSource;
  storeRoot: string;
  id: string;
  title: string;
  summary: string;
  created: string;
  root: string;
  storePath: string;
  metadataPath: string;
}

export interface ListedInitiativeReference extends InitiativeViewReference {
  status: InitiativeState['status'];
  owners: InitiativeState['owners'];
  metadata: InitiativeState['metadata'];
}

export type InitiativeDiagnosticSeverity = 'error' | 'warning';

export interface InitiativeDiagnostic {
  severity: InitiativeDiagnosticSeverity;
  code: string;
  message: string;
  target?: string;
  fix?: string;
  details?: InitiativeResolutionDetails;
}

export interface StoreInitiativeListReference {
  store: SelectedStore;
  initiatives: ListedInitiativeReference[];
  status: InitiativeDiagnostic[];
}

export interface InitiativeListReferenceResult {
  store: SelectedStore | null;
  stores: StoreInitiativeListReference[];
  initiatives: ListedInitiativeReference[];
  status: InitiativeDiagnostic[];
}

function asErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function makeDiagnostic(
  severity: InitiativeDiagnosticSeverity,
  code: string,
  message: string,
  options: { target?: string; fix?: string; details?: InitiativeResolutionDetails } = {}
): InitiativeDiagnostic {
  return {
    severity,
    code,
    message,
    ...options,
  };
}

const INITIATIVE_ALREADY_EXISTS_PREFIX = "Initiative '";
const INITIATIVE_ALREADY_EXISTS_MARKER = "' already exists";

export function initiativeDiagnosticFromError(error: unknown): InitiativeDiagnostic {
  if (error instanceof InitiativeResolutionError) {
    return makeDiagnostic('error', error.code, error.message, {
      target: error.target,
      fix: error.fix,
      details: error.details,
    });
  }

  const message = asErrorMessage(error);

  if (
    message.startsWith(INITIATIVE_ALREADY_EXISTS_PREFIX) &&
    message.includes(
      INITIATIVE_ALREADY_EXISTS_MARKER,
      INITIATIVE_ALREADY_EXISTS_PREFIX.length
    )
  ) {
    return makeDiagnostic('error', 'initiative_already_exists', message, {
      target: 'initiative.id',
      fix: 'Choose a new initiative id or list existing initiatives first.',
    });
  }

  if (message.startsWith('Initiative id ')) {
    return makeDiagnostic('error', 'invalid_initiative_id', message, {
      target: 'initiative.id',
      fix: 'Use kebab-case with lowercase letters, numbers, and single hyphen separators.',
    });
  }

  if (message.startsWith('Invalid initiative')) {
    return makeDiagnostic('error', 'invalid_initiative', message, {
      target: 'initiative',
      fix: 'Fix the initiative folder state and retry.',
    });
  }

  return makeDiagnostic('error', 'initiative_error', message);
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
      'Pass either --initiative <store>/<id> or a store selector, not both.',
      'store_selector_conflict',
      {
        target: 'store',
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

function storeErrorAsInitiativeError(error: unknown): InitiativeResolutionError {
  if (error instanceof StoreError) {
    return new InitiativeResolutionError(error.message, error.diagnostic.code, {
      target: error.diagnostic.target,
      fix: error.diagnostic.fix,
    });
  }

  const message = asErrorMessage(error);

  if (message.startsWith('Store id ')) {
    return new InitiativeResolutionError(message, 'invalid_store_id', {
      target: 'store.id',
      fix: 'Use kebab-case with lowercase letters, numbers, and single hyphen separators.',
    });
  }

  return new InitiativeResolutionError(message, 'invalid_store', {
    target: 'store',
    fix: 'Fix the store registry or pass --store-path <path>.',
  });
}

export async function resolveRegisteredInitiativeStore(
  storeId: string
): Promise<SelectedStore> {
  return selectStoreForInitiative({ store: storeId }, 'show');
}

export async function resolvePathInitiativeStore(
  storePath: string
): Promise<SelectedStore> {
  return selectStoreForInitiative({ storePath }, 'show');
}

export async function selectStoreForInitiative(
  options: InitiativeSelectorOptions,
  commandName: 'create' | 'list' | 'show'
): Promise<SelectedStore> {
  try {
    return await resolveSelectedStore(options, `initiative ${commandName}`);
  } catch (error) {
    throw storeErrorAsInitiativeError(error);
  }
}

function toInitiativeViewReference(
  selected: SelectedStore,
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
  selected: SelectedStore,
  state: InitiativeState
): InitiativeResolutionMatch {
  const reference = toInitiativeViewReference(selected, state);

  return {
    store: {
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

function toListedInitiativeReference(
  selected: SelectedStore,
  state: InitiativeState
): ListedInitiativeReference {
  return {
    ...toInitiativeViewReference(selected, state),
    status: state.status,
    owners: state.owners,
    metadata: state.metadata,
  };
}

async function readSelectedInitiative(
  selected: SelectedStore,
  initiativeId: string
): Promise<InitiativeState | null> {
  return readInitiative({
    collection: mountInitiativesCollection(selected.root),
    id: initiativeId,
  });
}

export async function resolveSelectedInitiativeViewReference(
  selected: SelectedStore,
  initiativeId: string
): Promise<InitiativeViewReference> {
  const state = await readSelectedInitiative(selected, initiativeId);

  if (!state) {
    throw new InitiativeResolutionError(
      `Initiative '${initiativeId}' was not found in store '${selected.id}'.`,
      'initiative_not_found',
      {
        target: 'initiative.id',
        fix: `openspec initiative list ${formatStoreSelector(selected)}`,
      }
    );
  }

  return toInitiativeViewReference(selected, state);
}

export async function listSelectedInitiativeViewReferences(
  selected: SelectedStore
): Promise<StoreInitiativeListReference> {
  const collection = mountInitiativesCollection(selected.root);
  const initiatives = await listInitiatives({ collection });

  return {
    store: selected,
    initiatives: initiatives.map((initiative) => toListedInitiativeReference(selected, initiative)),
    status: [],
  };
}

interface InitiativeStoreListFound {
  kind: 'listed';
  listed: StoreInitiativeListReference;
}

interface InitiativeStoreUnreadable {
  kind: 'store_unreadable';
  entryId: string;
  error: unknown;
}

interface InitiativeStoreListInvalid {
  kind: 'initiative_collection_invalid';
  selected: SelectedStore;
  error: unknown;
  diagnostic: InitiativeDiagnostic;
}

type InitiativeStoreListOutcome =
  | InitiativeStoreListFound
  | InitiativeStoreUnreadable
  | InitiativeStoreListInvalid;

interface InitiativeStoreLookupMatch {
  kind: 'match';
  selected: SelectedStore;
  state: InitiativeState;
  diagnostic: InitiativeResolutionMatch;
}

interface InitiativeStoreLookupMissing {
  kind: 'missing';
  selected: SelectedStore;
}

interface InitiativeStoreInitiativeInvalid {
  kind: 'initiative_invalid';
  selected: SelectedStore;
  error: unknown;
}

type InitiativeStoreLookupOutcome =
  | InitiativeStoreLookupMatch
  | InitiativeStoreLookupMissing
  | InitiativeStoreUnreadable
  | InitiativeStoreInitiativeInvalid;

async function scanRegisteredStoreForInitiativeList(
  entryId: string
): Promise<InitiativeStoreListOutcome> {
  let selected: SelectedStore;

  try {
    selected = await resolveRegisteredInitiativeStore(entryId);
  } catch (error) {
    return {
      kind: 'store_unreadable',
      entryId,
      error,
    };
  }

  try {
    return {
      kind: 'listed',
      listed: await listSelectedInitiativeViewReferences(selected),
    };
  } catch (error) {
    return {
      kind: 'initiative_collection_invalid',
      selected,
      error,
      diagnostic: initiativeDiagnosticFromError(error),
    };
  }
}

async function scanRegisteredStoreForInitiative(
  entryId: string,
  initiativeId: string
): Promise<InitiativeStoreLookupOutcome> {
  let selected: SelectedStore;

  try {
    selected = await resolveRegisteredInitiativeStore(entryId);
  } catch (error) {
    return {
      kind: 'store_unreadable',
      entryId,
      error,
    };
  }

  try {
    const state = await readSelectedInitiative(selected, initiativeId);
    if (!state) {
      return {
        kind: 'missing',
        selected,
      };
    }

    return {
      kind: 'match',
      selected,
      state,
      diagnostic: toResolutionMatch(selected, state),
    };
  } catch (error) {
    return {
      kind: 'initiative_invalid',
      selected,
      error,
    };
  }
}

async function scanRegisteredStoresForInitiativeLists(): Promise<InitiativeStoreListOutcome[]> {
  const registeredStores = await listRegisteredStores();
  return Promise.all(
    registeredStores.map((entry) => scanRegisteredStoreForInitiativeList(entry.id))
  );
}

async function scanRegisteredStoresForInitiative(
  initiativeId: string
): Promise<InitiativeStoreLookupOutcome[]> {
  const registeredStores = await listRegisteredStores();
  return Promise.all(
    registeredStores.map((entry) => scanRegisteredStoreForInitiative(entry.id, initiativeId))
  );
}

export async function listInitiativeViewReferences(
  options: InitiativeSelectorOptions = {}
): Promise<InitiativeListReferenceResult> {
  if (options.store !== undefined || options.storePath !== undefined) {
    const selected = await selectStoreForInitiative(options, 'list');
    const listed = await listSelectedInitiativeViewReferences(selected);

    return {
      store: listed.store,
      stores: [listed],
      initiatives: listed.initiatives,
      status: [],
    };
  }

  const outcomes = await scanRegisteredStoresForInitiativeLists();
  if (outcomes.length === 0) {
    return {
      store: null,
      stores: [],
      initiatives: [],
      status: [],
    };
  }

  const stores = outcomes
    .filter((outcome): outcome is InitiativeStoreListFound => outcome.kind === 'listed')
    .map((outcome) => outcome.listed);
  const invalidCollections = outcomes.filter(
    (outcome): outcome is InitiativeStoreListInvalid =>
      outcome.kind === 'initiative_collection_invalid'
  );
  const unreadable = outcomes.filter(
    (outcome): outcome is InitiativeStoreUnreadable => outcome.kind === 'store_unreadable'
  );
  const storeResults: StoreInitiativeListReference[] = [
    ...stores,
    ...invalidCollections.map((outcome) => ({
      store: outcome.selected,
      initiatives: [],
      status: [outcome.diagnostic],
    })),
  ];

  if (stores.length === 0 && invalidCollections.length > 0) {
    throw new InitiativeResolutionError(
      'No initiatives could be read because registered stores contain invalid initiatives.',
      'initiative_collections_invalid',
      {
        target: 'initiative',
        fix: 'Fix the invalid initiative folder state and retry.',
      }
    );
  }

  if (storeResults.length === 0) {
    throw new InitiativeResolutionError(
      'No initiatives could be read from registered stores.',
      'stores_unreadable',
      {
        target: 'store',
        fix: 'openspec store doctor',
      }
    );
  }

  const status: InitiativeDiagnostic[] = [];

  if (unreadable.length > 0) {
    status.push(makeDiagnostic(
      'warning',
      'stores_partially_unreadable',
      'Some registered stores could not be read.',
      {
        target: 'store',
        fix: 'openspec store doctor',
      }
    ));
  }

  if (invalidCollections.length > 0) {
    status.push(makeDiagnostic(
      'warning',
      'initiative_collections_partially_invalid',
      'Some registered stores contain invalid initiatives.',
      {
        target: 'initiative',
        fix: 'Fix the invalid initiative folder state and retry.',
      }
    ));
  }

  return {
    store: null,
    stores: storeResults,
    initiatives: storeResults
      .flatMap((store) => store.initiatives)
      .sort((left, right) => left.store.localeCompare(right.store) || left.id.localeCompare(right.id)),
    status,
  };
}

export async function resolveInitiativeViewReference(
  reference: string | undefined,
  options: InitiativeSelectorOptions = {}
): Promise<InitiativeViewReference> {
  const parsed = parseInitiativeReference(reference, options);

  if (parsed.options.store !== undefined || parsed.options.storePath !== undefined) {
    const selected = await selectStoreForInitiative(parsed.options, 'show');
    return resolveSelectedInitiativeViewReference(selected, parsed.initiativeId);
  }

  const outcomes = await scanRegisteredStoresForInitiative(parsed.initiativeId);
  const matches = outcomes.filter(
    (outcome): outcome is InitiativeStoreLookupMatch => outcome.kind === 'match'
  );
  const unreadable = outcomes.filter(
    (outcome): outcome is InitiativeStoreUnreadable => outcome.kind === 'store_unreadable'
  );
  const invalidInitiatives = outcomes.filter(
    (outcome): outcome is InitiativeStoreInitiativeInvalid =>
      outcome.kind === 'initiative_invalid'
  );

  if (invalidInitiatives.length > 0) {
    throw invalidInitiatives[0].error;
  }

  if (unreadable.length > 0) {
    throw new InitiativeResolutionError(
      `Initiative lookup for '${parsed.initiativeId}' is incomplete because some stores could not be read.`,
      'initiative_lookup_incomplete',
      {
        target: 'store',
        fix: 'openspec store doctor',
        ...(matches.length > 0
          ? { details: { matches: matches.map((match) => match.diagnostic) } }
          : {}),
      }
    );
  }

  if (matches.length === 0) {
    throw new InitiativeResolutionError(
      `Initiative '${parsed.initiativeId}' was not found in registered stores.`,
      'initiative_not_found',
      {
        target: 'initiative.id',
        fix: 'openspec initiative list',
      }
    );
  }

  if (matches.length > 1) {
    throw new InitiativeResolutionError(
      `Initiative '${parsed.initiativeId}' exists in multiple stores.`,
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

export interface InitiativeLinkReference {
  store: string;
  id: string;
}

export async function resolveInitiativeLinkReference(
  reference: string | undefined,
  options: InitiativeSelectorOptions = {}
): Promise<InitiativeLinkReference> {
  const initiative = await resolveInitiativeViewReference(reference, options);

  return {
    store: initiative.store,
    id: initiative.id,
  };
}
