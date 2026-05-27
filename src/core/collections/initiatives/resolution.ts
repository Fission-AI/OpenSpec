import {
  ContextStoreError,
  formatContextStoreSelector,
  listRegisteredContextStores,
  resolveSelectedContextStore,
  type ContextStoreSelectorOptions,
  type ContextStoreSelectorSource,
  type SelectedContextStore,
} from '../../context-store/index.js';
import { mountInitiativesCollection } from './collection.js';
import { listInitiatives, readInitiative } from './operations.js';
import { INITIATIVE_FILE_NAME, type InitiativeState } from './schema.js';

export interface InitiativeSelectorOptions extends ContextStoreSelectorOptions {
  json?: boolean;
}

export type { ContextStoreSelectorSource, SelectedContextStore };
export { formatContextStoreSelector };

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

export interface ContextStoreInitiativeListReference {
  contextStore: SelectedContextStore;
  initiatives: ListedInitiativeReference[];
  status: InitiativeDiagnostic[];
}

export interface InitiativeListReferenceResult {
  contextStore: SelectedContextStore | null;
  contextStores: ContextStoreInitiativeListReference[];
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

function contextStoreErrorAsInitiativeError(error: unknown): InitiativeResolutionError {
  if (error instanceof ContextStoreError) {
    return new InitiativeResolutionError(error.message, error.diagnostic.code, {
      target: error.diagnostic.target,
      fix: error.diagnostic.fix,
    });
  }

  const message = asErrorMessage(error);

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
  return selectContextStoreForInitiative({ store: storeId }, 'show');
}

export async function resolvePathInitiativeContextStore(
  storePath: string
): Promise<SelectedContextStore> {
  return selectContextStoreForInitiative({ storePath }, 'show');
}

export async function selectContextStoreForInitiative(
  options: InitiativeSelectorOptions,
  commandName: 'create' | 'list' | 'show'
): Promise<SelectedContextStore> {
  try {
    return await resolveSelectedContextStore(options, `initiative ${commandName}`);
  } catch (error) {
    throw contextStoreErrorAsInitiativeError(error);
  }
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

function toListedInitiativeReference(
  selected: SelectedContextStore,
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

export async function listSelectedInitiativeViewReferences(
  selected: SelectedContextStore
): Promise<ContextStoreInitiativeListReference> {
  const collection = mountInitiativesCollection(selected.root);
  const initiatives = await listInitiatives({ collection });

  return {
    contextStore: selected,
    initiatives: initiatives.map((initiative) => toListedInitiativeReference(selected, initiative)),
    status: [],
  };
}

interface InitiativeStoreListFound {
  kind: 'listed';
  listed: ContextStoreInitiativeListReference;
}

interface InitiativeStoreUnreadable {
  kind: 'store_unreadable';
  entryId: string;
  error: unknown;
}

interface InitiativeStoreListInvalid {
  kind: 'initiative_collection_invalid';
  selected: SelectedContextStore;
  error: unknown;
  diagnostic: InitiativeDiagnostic;
}

type InitiativeStoreListOutcome =
  | InitiativeStoreListFound
  | InitiativeStoreUnreadable
  | InitiativeStoreListInvalid;

interface InitiativeStoreLookupMatch {
  kind: 'match';
  selected: SelectedContextStore;
  state: InitiativeState;
  diagnostic: InitiativeResolutionMatch;
}

interface InitiativeStoreLookupMissing {
  kind: 'missing';
  selected: SelectedContextStore;
}

interface InitiativeStoreInitiativeInvalid {
  kind: 'initiative_invalid';
  selected: SelectedContextStore;
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
  let selected: SelectedContextStore;

  try {
    selected = await resolveRegisteredInitiativeContextStore(entryId);
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
  let selected: SelectedContextStore;

  try {
    selected = await resolveRegisteredInitiativeContextStore(entryId);
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
  const registeredStores = await listRegisteredContextStores();
  return Promise.all(
    registeredStores.map((entry) => scanRegisteredStoreForInitiativeList(entry.id))
  );
}

async function scanRegisteredStoresForInitiative(
  initiativeId: string
): Promise<InitiativeStoreLookupOutcome[]> {
  const registeredStores = await listRegisteredContextStores();
  return Promise.all(
    registeredStores.map((entry) => scanRegisteredStoreForInitiative(entry.id, initiativeId))
  );
}

export async function listInitiativeViewReferences(
  options: InitiativeSelectorOptions = {}
): Promise<InitiativeListReferenceResult> {
  if (options.store !== undefined || options.storePath !== undefined) {
    const selected = await selectContextStoreForInitiative(options, 'list');
    const listed = await listSelectedInitiativeViewReferences(selected);

    return {
      contextStore: listed.contextStore,
      contextStores: [listed],
      initiatives: listed.initiatives,
      status: [],
    };
  }

  const outcomes = await scanRegisteredStoresForInitiativeLists();
  if (outcomes.length === 0) {
    return {
      contextStore: null,
      contextStores: [],
      initiatives: [],
      status: [],
    };
  }

  const contextStores = outcomes
    .filter((outcome): outcome is InitiativeStoreListFound => outcome.kind === 'listed')
    .map((outcome) => outcome.listed);
  const invalidCollections = outcomes.filter(
    (outcome): outcome is InitiativeStoreListInvalid =>
      outcome.kind === 'initiative_collection_invalid'
  );
  const unreadable = outcomes.filter(
    (outcome): outcome is InitiativeStoreUnreadable => outcome.kind === 'store_unreadable'
  );
  const contextStoreResults: ContextStoreInitiativeListReference[] = [
    ...contextStores,
    ...invalidCollections.map((outcome) => ({
      contextStore: outcome.selected,
      initiatives: [],
      status: [outcome.diagnostic],
    })),
  ];

  if (contextStores.length === 0 && invalidCollections.length > 0) {
    throw new InitiativeResolutionError(
      'No initiatives could be read because registered context stores contain invalid initiatives.',
      'initiative_collections_invalid',
      {
        target: 'initiative',
        fix: 'Fix the invalid initiative folder state and retry.',
      }
    );
  }

  if (contextStoreResults.length === 0) {
    throw new InitiativeResolutionError(
      'No initiatives could be read from registered context stores.',
      'context_stores_unreadable',
      {
        target: 'context_store',
        fix: 'openspec context-store doctor',
      }
    );
  }

  const status: InitiativeDiagnostic[] = [];

  if (unreadable.length > 0) {
    status.push(makeDiagnostic(
      'warning',
      'context_stores_partially_unreadable',
      'Some registered context stores could not be read.',
      {
        target: 'context_store',
        fix: 'openspec context-store doctor',
      }
    ));
  }

  if (invalidCollections.length > 0) {
    status.push(makeDiagnostic(
      'warning',
      'initiative_collections_partially_invalid',
      'Some registered context stores contain invalid initiatives.',
      {
        target: 'initiative',
        fix: 'Fix the invalid initiative folder state and retry.',
      }
    ));
  }

  return {
    contextStore: null,
    contextStores: contextStoreResults,
    initiatives: contextStoreResults
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
    const selected = await selectContextStoreForInitiative(parsed.options, 'show');
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
