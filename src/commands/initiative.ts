import { Command } from 'commander';
import chalk from 'chalk';
import {
  createInitiative,
  INITIATIVE_FILE_NAMES,
  type InitiativeResolutionDetails,
  type InitiativeSelectorOptions,
  type InitiativeViewReference,
  type ContextStoreSelectorSource,
  listInitiativeViewReferences,
  mountInitiativesCollection,
  initiativeDiagnosticFromError as coreInitiativeDiagnosticFromError,
  resolveInitiativeViewReference as resolveCoreInitiativeViewReference,
  selectContextStoreForInitiative,
  type ListedInitiativeReference,
  type SelectedContextStore,
  type InitiativeState,
  type InitiativeDiagnostic,
  formatContextStoreSelector,
} from '../core/collections/initiatives/index.js';

interface ContextStoreOutput {
  id: string;
  root: string;
  source: ContextStoreSelectorSource;
}

interface InitiativeOutput extends InitiativeState {
  store: string;
  root: string;
  store_path: string;
}

interface InitiativeShowContextStoreOutput {
  id: string;
  root: string;
}

interface InitiativeShowOutputItem {
  version: 1;
  id: string;
  title: string;
  summary: string;
  created: string;
  root: string;
  store_path: string;
  metadata_path: string;
}

interface InitiativeCreateOutput {
  context_store: ContextStoreOutput | null;
  initiative: InitiativeOutput | null;
  created_files: string[];
  status: InitiativeDiagnostic[];
}

interface InitiativeListOutput {
  context_store: ContextStoreOutput | null;
  context_stores: ContextStoreInitiativeOutput[];
  initiatives: InitiativeOutput[];
  status: InitiativeDiagnostic[];
}

interface ContextStoreInitiativeOutput {
  context_store: ContextStoreOutput;
  initiatives: InitiativeOutput[];
  status: InitiativeDiagnostic[];
}

interface InitiativeShowOutput {
  context_store: InitiativeShowContextStoreOutput | null;
  initiative: InitiativeShowOutputItem | null;
  status: InitiativeDiagnostic[];
}

interface InitiativeCreateOptions extends InitiativeSelectorOptions {
  title?: string;
  summary?: string;
}

type InitiativeListOptions = InitiativeSelectorOptions;
type InitiativeShowOptions = InitiativeSelectorOptions;

export class InitiativeCliError extends Error {
  readonly diagnostic: InitiativeDiagnostic;

  constructor(
    message: string,
    code: string,
    options: { target?: string; fix?: string; details?: InitiativeResolutionDetails } = {}
  ) {
    super(message);
    this.diagnostic = {
      severity: 'error',
      code,
      message,
      ...options,
    };
  }
}

function printJson(payload: unknown): void {
  console.log(JSON.stringify(payload, null, 2));
}

export function initiativeDiagnosticFromError(error: unknown): InitiativeDiagnostic {
  if (error instanceof InitiativeCliError) {
    return error.diagnostic;
  }

  return coreInitiativeDiagnosticFromError(error);
}

function appendDiagnostic<T extends { status: InitiativeDiagnostic[] }>(
  payload: T,
  diagnostic: InitiativeDiagnostic
): T {
  return {
    ...payload,
    status: [...payload.status, diagnostic],
  };
}

function requireNonBlankOption(
  value: string | undefined,
  flagName: string,
  target: string,
  code: string
): string {
  if (value === undefined || value.trim().length === 0) {
    throw new InitiativeCliError(`Pass --${flagName} <value>.`, code, {
      target,
      fix: `openspec initiative create <id> --${flagName} <value>`,
    });
  }

  return value.trim();
}

function requireInitiativeId(
  id: string | undefined,
  commandName: 'create' | 'show'
): string {
  if (id === undefined || id.trim().length === 0) {
    throw new InitiativeCliError('Pass an initiative id.', 'initiative_id_required', {
      target: 'initiative.id',
      fix: `openspec initiative ${commandName} <id>`,
    });
  }

  return id.trim();
}

function toContextStoreOutput(selected: SelectedContextStore): ContextStoreOutput {
  return {
    id: selected.id,
    root: selected.root,
    source: selected.source,
  };
}

function toInitiativeOutput(
  selected: SelectedContextStore,
  state: InitiativeState
): InitiativeOutput {
  const collection = mountInitiativesCollection(selected.root);

  return {
    ...state,
    store: selected.id,
    root: collection.resolvePath(state.id),
    store_path: collection.toStorePath(state.id),
  };
}

function listedInitiativeToOutput(
  initiative: ListedInitiativeReference
): InitiativeOutput {
  return {
    version: 1,
    id: initiative.id,
    title: initiative.title,
    summary: initiative.summary,
    status: initiative.status,
    created: initiative.created,
    owners: initiative.owners,
    metadata: initiative.metadata,
    store: initiative.store,
    root: initiative.root,
    store_path: initiative.storePath,
  };
}

function initiativeReferenceToShowOutput(
  reference: InitiativeViewReference
): InitiativeShowOutputItem {
  return {
    version: 1,
    id: reference.id,
    title: reference.title,
    summary: reference.summary,
    created: reference.created,
    root: reference.root,
    store_path: reference.storePath,
    metadata_path: reference.metadataPath,
  };
}

function printCreateHuman(payload: InitiativeCreateOutput): void {
  if (!payload.context_store || !payload.initiative) {
    return;
  }

  console.log(chalk.green('Created initiative'));
  console.log(`ID: ${payload.initiative.id}`);
  console.log(`Title: ${payload.initiative.title}`);
  console.log(`Status: ${payload.initiative.status}`);
  console.log(`Context store: ${payload.context_store.id}`);
  console.log(`Location: ${payload.initiative.root}`);
  console.log('');
  console.log(`Created files (${payload.created_files.length}):`);
  for (const fileName of payload.created_files) {
    console.log(`  - ${fileName}`);
  }
  console.log('');
  console.log('Next useful commands:');
  console.log(`  openspec initiative list ${formatContextStoreSelector(payload.context_store)}`);
}

function printTableHeader(includeStore: boolean): void {
  const idHeader = 'ID'.padEnd(22);
  const storeHeader = includeStore ? `${'Store'.padEnd(12)}` : '';
  console.log(`${idHeader}${storeHeader}Title`);
}

function printInitiativeRow(initiative: InitiativeOutput, includeStore: boolean): void {
  const id = initiative.id.padEnd(22);
  const store = includeStore ? `${initiative.store.padEnd(12)}` : '';
  console.log(`${id}${store}${initiative.title}`);
}

function printListStatuses(statuses: InitiativeDiagnostic[]): void {
  if (statuses.length === 0) {
    return;
  }

  console.log('');
  for (const status of statuses) {
    console.log(status.message);
    if (status.fix) {
      console.log(`Run: ${status.fix}`);
    }
  }
}

function printListHuman(payload: InitiativeListOutput): void {
  if (payload.context_store) {
    console.log(`OpenSpec initiatives in ${payload.context_store.id} (${payload.initiatives.length})`);

    if (payload.initiatives.length === 0) {
      console.log('');
      console.log(`No initiatives found in ${payload.context_store.id}.`);
      console.log('');
      console.log(`Location: ${payload.context_store.root}`);
      return;
    }

    console.log('');
    printTableHeader(false);
    for (const initiative of payload.initiatives) {
      printInitiativeRow(initiative, false);
    }
    console.log('');
    console.log(`Location: ${payload.context_store.root}`);
    return;
  }

  if (payload.context_stores.length === 0) {
    console.log('No initiatives found because no context stores are registered.');
    return;
  }

  if (payload.initiatives.length === 0) {
    console.log('No initiatives found across registered context stores.');
    printListStatuses(payload.status);
    return;
  }

  console.log(
    `OpenSpec initiatives (${payload.initiatives.length} across ${payload.context_stores.length} stores)`
  );
  console.log('');
  printTableHeader(true);
  for (const initiative of payload.initiatives) {
    printInitiativeRow(initiative, true);
  }
  printListStatuses(payload.status);
}

function printShowHuman(payload: InitiativeShowOutput): void {
  if (!payload.context_store || !payload.initiative) {
    return;
  }

  console.log(`OpenSpec initiative: ${payload.initiative.title}`);
  console.log('');
  console.log(`ID: ${payload.initiative.id}`);
  console.log(`Summary: ${payload.initiative.summary}`);
  console.log(`Context store: ${payload.context_store.id}`);
  console.log(`Location: ${payload.initiative.root}`);
  console.log(`Metadata: ${payload.initiative.metadata_path}`);
}

function printDiagnosticMatches(diagnostic: InitiativeDiagnostic): void {
  const matches = diagnostic.details?.matches ?? [];
  if (matches.length === 0) {
    return;
  }

  console.error('');
  console.error(diagnostic.code === 'initiative_lookup_incomplete' ? 'Partial matches:' : 'Matches:');
  for (const match of matches) {
    console.error(`  ${match.context_store.id.padEnd(12)}${match.initiative.root}`);
  }
}

class InitiativeCommand {
  async create(id: string | undefined, options: InitiativeCreateOptions = {}): Promise<void> {
    try {
      const initiativeId = requireInitiativeId(id, 'create');
      const title = requireNonBlankOption(
        options.title,
        'title',
        'initiative.title',
        'initiative_title_required'
      );
      const summary = requireNonBlankOption(
        options.summary,
        'summary',
        'initiative.summary',
        'initiative_summary_required'
      );
      const selected = await selectContextStoreForInitiative(options, 'create');
      const collection = mountInitiativesCollection(selected.root);
      const state = await createInitiative({
        collection,
        id: initiativeId,
        title,
        summary,
      });
      const payload: InitiativeCreateOutput = {
        context_store: toContextStoreOutput(selected),
        initiative: toInitiativeOutput(selected, state),
        created_files: [...INITIATIVE_FILE_NAMES],
        status: [],
      };

      if (options.json) {
        printJson(payload);
        return;
      }

      printCreateHuman(payload);
    } catch (error) {
      this.handleFailure(
        options.json,
        { context_store: null, initiative: null, created_files: [], status: [] },
        error
      );
    }
  }

  async list(options: InitiativeListOptions = {}): Promise<void> {
    try {
      const payload = await this.buildListPayload(options);

      if (options.json) {
        printJson(payload);
        return;
      }

      printListHuman(payload);
    } catch (error) {
      this.handleFailure(
        options.json,
        { context_store: null, context_stores: [], initiatives: [], status: [] },
        error
      );
    }
  }

  async show(id: string | undefined, options: InitiativeShowOptions = {}): Promise<void> {
    try {
      const initiativeId = requireInitiativeId(id, 'show');
      const payload = await this.buildShowPayload(initiativeId, options);

      if (options.json) {
        printJson(payload);
        return;
      }

      printShowHuman(payload);
    } catch (error) {
      this.handleFailure(
        options.json,
        { context_store: null, initiative: null, status: [] },
        error
      );
    }
  }

  private async buildListPayload(options: InitiativeListOptions): Promise<InitiativeListOutput> {
    const listed = await listInitiativeViewReferences(options);
    const contextStores = listed.contextStores.map((store) => ({
      context_store: toContextStoreOutput(store.contextStore),
      initiatives: store.initiatives.map(listedInitiativeToOutput),
      status: store.status,
    }));

    return {
      context_store: listed.contextStore ? toContextStoreOutput(listed.contextStore) : null,
      context_stores: contextStores,
      initiatives: listed.initiatives.map(listedInitiativeToOutput),
      status: listed.status,
    };
  }

  async buildShowPayload(
    initiativeId: string,
    options: InitiativeShowOptions
  ): Promise<InitiativeShowOutput> {
    const reference = await resolveCoreInitiativeViewReference(initiativeId, options);
    return {
      context_store: {
        id: reference.store,
        root: reference.storeRoot,
      },
      initiative: initiativeReferenceToShowOutput(reference),
      status: [],
    };
  }

  private handleFailure<T extends { status: InitiativeDiagnostic[] }>(
    json: boolean | undefined,
    payload: T,
    error: unknown
  ): void {
    const diagnostic = initiativeDiagnosticFromError(error);

    if (json) {
      printJson(appendDiagnostic(payload, diagnostic));
      process.exitCode = 1;
      return;
    }

    console.error(`Error: ${diagnostic.message}`);
    printDiagnosticMatches(diagnostic);
    if (diagnostic.fix) {
      console.error(`Fix: ${diagnostic.fix}`);
    }
    process.exitCode = 1;
  }
}

function addContextStoreSelectorOptions(command: Command): Command {
  return command
    .option('--store <id>', 'Context store id from the local context-store registry')
    .option('--store-path <path>', 'Existing local context store root')
    .option('--json', 'Output as JSON');
}

export function registerInitiativeCommand(program: Command): void {
  const initiativeCommand = new InitiativeCommand();
  const initiative = program
    .command('initiative')
    .description('Create and list coordinated initiatives');

  addContextStoreSelectorOptions(
    initiative
      .command('create [id]')
      .description('Create an initiative in a context store')
      .option('--title <title>', 'Initiative title')
      .option('--summary <summary>', 'Initiative summary')
  ).action(async (id: string | undefined, options: InitiativeCreateOptions) => {
    await initiativeCommand.create(id, options);
  });

  addContextStoreSelectorOptions(
    initiative
      .command('show <id>')
      .description('Show where an initiative lives and how to read it')
  ).action(async (id: string | undefined, options: InitiativeShowOptions) => {
    await initiativeCommand.show(id, options);
  });

  addContextStoreSelectorOptions(
    initiative
      .command('list')
      .alias('ls')
      .description('List initiatives across registered context stores')
  ).action(async (options: InitiativeListOptions) => {
    await initiativeCommand.list(options);
  });
}
