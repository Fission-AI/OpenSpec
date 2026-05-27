import { Command } from 'commander';

import {
  ContextStoreError,
  doctorContextStores,
  listContextStores,
  prepareContextStoreSetup,
  registerExistingContextStore,
  setupPreparedContextStore,
  type ContextStoreDiagnostic,
  type ContextStoreDoctorResult,
  type ContextStoreInfo,
  type ContextStoreInspection,
  type ContextStoreListResult,
  type ContextStoreMutationResult,
} from '../core/context-store/index.js';
import { isInteractive } from '../utils/interactive.js';

interface ContextStoreSetupOptions {
  path?: string;
  initGit?: boolean;
  json?: boolean;
}

interface ContextStoreRegisterOptions {
  id?: string;
  json?: boolean;
}

interface ContextStoreJsonOptions {
  json?: boolean;
}

interface ContextStoreOutput {
  id: string;
  root: string;
  metadata_path?: string;
}

interface ContextStoreMutationOutput {
  context_store: ContextStoreOutput | null;
  registry: {
    path: string;
    registered: boolean;
  } | null;
  git: {
    is_repository: boolean;
    initialized: boolean;
  } | null;
  created_files: string[];
  status: ContextStoreDiagnostic[];
}

interface ContextStoreListOutput {
  context_stores: ContextStoreOutput[];
  status: ContextStoreDiagnostic[];
}

interface ContextStoreDoctorStoreOutput extends ContextStoreOutput {
  metadata: ContextStoreInspection['metadata'];
  git: {
    is_repository: boolean | null;
  };
  status: ContextStoreDiagnostic[];
}

interface ContextStoreDoctorOutput {
  context_stores: ContextStoreDoctorStoreOutput[];
  status: ContextStoreDiagnostic[];
}

function printJson(payload: unknown): void {
  console.log(JSON.stringify(payload, null, 2));
}

function asErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function appendStatus<T extends { status: ContextStoreDiagnostic[] }>(
  payload: T,
  status: ContextStoreDiagnostic
): T {
  return {
    ...payload,
    status: [...payload.status, status],
  };
}

function toStoreOutput(store: ContextStoreInfo): ContextStoreOutput {
  return {
    id: store.id,
    root: store.root,
    ...(store.metadataPath ? { metadata_path: store.metadataPath } : {}),
  };
}

function toMutationOutput(result: ContextStoreMutationResult): ContextStoreMutationOutput {
  return {
    context_store: toStoreOutput(result.store),
    registry: {
      path: result.registryCommit.path,
      registered: true,
    },
    git: {
      is_repository: result.git.isRepository,
      initialized: result.git.initialized,
    },
    created_files: result.createdArtifacts,
    status: [],
  };
}

function toListOutput(result: ContextStoreListResult): ContextStoreListOutput {
  return {
    context_stores: result.stores.map(toStoreOutput),
    status: [],
  };
}

function toDoctorStoreOutput(store: ContextStoreInspection): ContextStoreDoctorStoreOutput {
  return {
    ...toStoreOutput(store),
    metadata: store.metadata,
    git: {
      is_repository: store.git.isRepository,
    },
    status: store.diagnostics,
  };
}

function toDoctorOutput(result: ContextStoreDoctorResult): ContextStoreDoctorOutput {
  return {
    context_stores: result.stores.map(toDoctorStoreOutput),
    status: result.diagnostics,
  };
}

function asStatus(error: unknown): ContextStoreDiagnostic {
  if (error instanceof ContextStoreError) {
    return error.diagnostic;
  }

  const message = asErrorMessage(error);

  return {
    severity: 'error',
    code: 'context_store_error',
    message,
  };
}

function isPromptCancellationError(error: unknown): boolean {
  return (
    error instanceof Error &&
    (error.name === 'ExitPromptError' || error.message.includes('force closed the prompt with SIGINT'))
  );
}

async function shouldInitializeGit(options: ContextStoreSetupOptions): Promise<boolean> {
  if (options.initGit !== undefined) {
    return options.initGit;
  }

  if (options.json || !isInteractive()) {
    return false;
  }

  const { confirm } = await import('@inquirer/prompts');
  return confirm({
    message: 'Initialize Git repository?',
    default: true,
  });
}

function formatGitHuman(git: ContextStoreMutationOutput['git']): string {
  if (!git) return 'unknown';
  if (git.initialized) return 'initialized';
  return git.is_repository ? 'repository detected' : 'not initialized';
}

function printMutationHuman(title: string, payload: ContextStoreMutationOutput): void {
  if (!payload.context_store || !payload.registry || !payload.git) {
    return;
  }

  console.log(title);
  console.log('');
  console.log(`ID: ${payload.context_store.id}`);
  console.log(`Location: ${payload.context_store.root}`);
  console.log(`Metadata: ${payload.context_store.metadata_path}`);
  console.log(`Registry: ${payload.registry.path}`);
  console.log(`Git: ${formatGitHuman(payload.git)}`);
}

function printListHuman(payload: ContextStoreListOutput): void {
  if (payload.context_stores.length === 0) {
    console.log('No context stores registered.');
    console.log('');
    console.log('Next:');
    console.log('  openspec context-store setup team-context');
    console.log('  openspec context-store register /path/to/context-store');
    return;
  }

  console.log(`OpenSpec context stores (${payload.context_stores.length})`);
  console.log('');
  console.log(`${'ID'.padEnd(16)}Location`);
  for (const store of payload.context_stores) {
    console.log(`${store.id.padEnd(16)}${store.root}`);
  }
}

function formatMetadataHuman(store: ContextStoreDoctorOutput['context_stores'][number]): string {
  if (store.metadata.valid) return 'ok';
  if (store.metadata.present === false) return 'missing';
  if (store.metadata.present === null) return 'unknown';
  return 'invalid';
}

function formatDoctorGitHuman(store: ContextStoreDoctorOutput['context_stores'][number]): string {
  if (store.git.is_repository === null) return 'unknown';
  return store.git.is_repository ? 'repository detected' : 'not detected';
}

function printDoctorHuman(payload: ContextStoreDoctorOutput): void {
  if (payload.context_stores.length === 0) {
    console.log('No context stores registered.');
    return;
  }

  console.log('Context store doctor');
  for (const store of payload.context_stores) {
    console.log('');
    console.log(store.id);
    console.log(`  Location: ${store.root}`);
    console.log(`  Metadata: ${formatMetadataHuman(store)}`);
    console.log(`  Git: ${formatDoctorGitHuman(store)}`);

    if (store.status.length === 0) {
      console.log('  Issues: none');
      continue;
    }

    console.log('  Issues:');
    for (const status of store.status) {
      console.log(`    - ${status.message}`);
      if (status.fix) {
        console.log(`      Fix: ${status.fix}`);
      }
    }
  }
}

class ContextStoreCommand {
  async setup(id: string | undefined, options: ContextStoreSetupOptions = {}): Promise<void> {
    try {
      const prepared = await prepareContextStoreSetup({
        id,
        path: options.path,
      });
      const initGit = await shouldInitializeGit(options);
      const payload = toMutationOutput(await setupPreparedContextStore(prepared, {
        initGit,
      }));

      if (options.json) {
        printJson(payload);
        return;
      }

      printMutationHuman('Context store setup complete', payload);
    } catch (error) {
      this.handleFailure(
        options.json,
        { context_store: null, registry: null, git: null, created_files: [], status: [] },
        error
      );
    }
  }

  async register(inputPath: string | undefined, options: ContextStoreRegisterOptions = {}): Promise<void> {
    try {
      const payload = toMutationOutput(await registerExistingContextStore({
        path: inputPath,
        id: options.id,
      }));

      if (options.json) {
        printJson(payload);
        return;
      }

      printMutationHuman('Context store registered', payload);
    } catch (error) {
      this.handleFailure(
        options.json,
        { context_store: null, registry: null, git: null, created_files: [], status: [] },
        error
      );
    }
  }

  async list(options: ContextStoreJsonOptions = {}): Promise<void> {
    try {
      const payload = toListOutput(await listContextStores());

      if (options.json) {
        printJson(payload);
        return;
      }

      printListHuman(payload);
    } catch (error) {
      this.handleFailure(options.json, { context_stores: [], status: [] }, error);
    }
  }

  async doctor(id: string | undefined, options: ContextStoreJsonOptions = {}): Promise<void> {
    try {
      const payload = toDoctorOutput(await doctorContextStores(id));

      if (options.json) {
        printJson(payload);
        return;
      }

      printDoctorHuman(payload);
    } catch (error) {
      this.handleFailure(options.json, { context_stores: [], status: [] }, error);
    }
  }

  private handleFailure<T extends { status: ContextStoreDiagnostic[] }>(
    json: boolean | undefined,
    payload: T,
    error: unknown
  ): void {
    if (!json && isPromptCancellationError(error)) {
      console.error('Cancelled.');
      process.exitCode = 130;
      return;
    }

    const status = asStatus(error);
    if (json) {
      printJson(appendStatus(payload, status));
      process.exitCode = 1;
      return;
    }

    console.error(`Error: ${status.message}`);
    if (status.fix) {
      console.error(`Fix: ${status.fix}`);
    }
    process.exitCode = 1;
  }
}

export function registerContextStoreCommand(program: Command): void {
  const contextStoreCommand = new ContextStoreCommand();
  const contextStore = program
    .command('context-store')
    .description('Set up and inspect local context stores');

  contextStore
    .command('setup [id]')
    .description('Create and register a local context store')
    .option('--path <path>', 'Context store folder path; defaults to ./<id>')
    .option('--init-git', 'Initialize a Git repository in the context store')
    .option('--no-init-git', 'Do not initialize a Git repository')
    .option('--json', 'Output as JSON')
    .action(async (id: string | undefined, options: ContextStoreSetupOptions) => {
      await contextStoreCommand.setup(id, options);
    });

  contextStore
    .command('register [path]')
    .description('Register an existing local context store')
    .option('--id <id>', 'Context store id; defaults to metadata or folder name')
    .option('--json', 'Output as JSON')
    .action(async (inputPath: string | undefined, options: ContextStoreRegisterOptions) => {
      await contextStoreCommand.register(inputPath, options);
    });

  contextStore
    .command('list')
    .alias('ls')
    .description('List locally registered context stores')
    .option('--json', 'Output as JSON')
    .action(async (options: ContextStoreJsonOptions) => {
      await contextStoreCommand.list(options);
    });

  contextStore
    .command('doctor [id]')
    .description('Check local context-store registration and metadata')
    .option('--json', 'Output as JSON')
    .action(async (id: string | undefined, options: ContextStoreJsonOptions) => {
      await contextStoreCommand.doctor(id, options);
    });
}
