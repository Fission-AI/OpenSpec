import * as os from 'node:os';
import * as path from 'node:path';
import { Command } from 'commander';

import {
  ContextStoreError,
  doctorContextStores,
  listContextStores,
  prepareContextStoreSetup,
  prepareContextStoreCleanup,
  registerExistingContextStore,
  removeContextStore,
  setupPreparedContextStore,
  unregisterContextStore,
  validateContextStoreId,
  type ContextStoreCleanupResult,
  type ContextStoreDiagnostic,
  type ContextStoreDoctorResult,
  type ContextStoreInfo,
  type ContextStoreInspection,
  type ContextStoreListResult,
  type ContextStoreMutationResult,
  type SetupContextStoreInput,
} from '../core/context-store/index.js';
import { isInteractive } from '../utils/interactive.js';

interface ContextStoreSetupOptions {
  path?: string;
  initGit?: boolean;
  json?: boolean;
}

interface ContextStoreRegisterOptions {
  id?: string;
  yes?: boolean;
  json?: boolean;
}

interface ContextStoreRemoveOptions {
  yes?: boolean;
  json?: boolean;
}

interface ContextStoreJsonOptions {
  json?: boolean;
}

interface ResolvedContextStoreSetupInput extends SetupContextStoreInput {
  id: string;
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
    already_registered: boolean;
  } | null;
  git: {
    is_repository: boolean;
    initialized: boolean;
    committed: boolean;
  } | null;
  created_files: string[];
  status: ContextStoreDiagnostic[];
}

interface ContextStoreCleanupOutput {
  context_store: ContextStoreOutput | null;
  registry: {
    path: string;
    removed: boolean;
  } | null;
  files: {
    deleted: boolean;
    deleted_path: string | null;
    left_on_disk: string | null;
  } | null;
  status: ContextStoreDiagnostic[];
}

interface ContextStoreListOutput {
  context_stores: ContextStoreOutput[];
  status: ContextStoreDiagnostic[];
}

type OpenSpecRootOutput = Omit<ContextStoreInspection['openspecRoot'], 'diagnostics'> & {
  status: ContextStoreDiagnostic[];
};

interface ContextStoreDoctorStoreOutput extends ContextStoreOutput {
  openspec_root: OpenSpecRootOutput;
  metadata: ContextStoreInspection['metadata'];
  git: {
    is_repository: boolean | null;
    has_commits: boolean | null;
    has_uncommitted_changes: boolean | null;
    has_remote: boolean | null;
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
      registered: result.registryCommit.registered,
      already_registered: result.registryCommit.alreadyRegistered,
    },
    git: {
      is_repository: result.git.isRepository,
      initialized: result.git.initialized,
      committed: result.git.committed,
    },
    created_files: result.createdArtifacts,
    status: result.diagnostics,
  };
}

function toCleanupOutput(result: ContextStoreCleanupResult): ContextStoreCleanupOutput {
  return {
    context_store: toStoreOutput(result.store),
    registry: {
      path: result.registryCommit.path,
      removed: result.registryCommit.removed,
    },
    files: {
      deleted: result.files.deleted,
      deleted_path: result.files.deletedPath ?? null,
      left_on_disk: result.files.leftOnDisk ?? null,
    },
    status: result.diagnostics,
  };
}

function toListOutput(result: ContextStoreListResult): ContextStoreListOutput {
  return {
    context_stores: result.stores.map(toStoreOutput),
    status: [],
  };
}

function toOpenSpecRootOutput(root: ContextStoreInspection['openspecRoot']): OpenSpecRootOutput {
  return {
    present: root.present,
    config: root.config,
    specs: root.specs,
    changes: root.changes,
    archive: root.archive,
    healthy: root.healthy,
    status: root.diagnostics,
  };
}

function toDoctorStoreOutput(store: ContextStoreInspection): ContextStoreDoctorStoreOutput {
  return {
    ...toStoreOutput(store),
    openspec_root: toOpenSpecRootOutput(store.openspecRoot),
    metadata: store.metadata,
    git: {
      is_repository: store.git.isRepository,
      has_commits: store.git.hasCommits,
      has_uncommitted_changes: store.git.hasUncommittedChanges,
      has_remote: store.git.hasRemote,
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

function shouldInitializeGit(options: ContextStoreSetupOptions): boolean {
  // Git on by default; --no-init-git is the explicit opt-out.
  return options.initGit ?? true;
}

function formatPathForHuman(targetPath: string): string {
  const home = os.homedir();
  const normalizedHome = path.resolve(home);
  const normalizedTarget = path.resolve(targetPath);

  if (normalizedTarget === normalizedHome) return '~';
  if (normalizedTarget.startsWith(`${normalizedHome}${path.sep}`)) {
    return `~${path.sep}${path.relative(normalizedHome, normalizedTarget)}`;
  }

  return targetPath;
}

async function promptContextStoreId(): Promise<string> {
  const { input } = await import('@inquirer/prompts');

  return input({
    message: 'Context store name',
    required: true,
    validate(value: string) {
      try {
        validateContextStoreId(value);
        return true;
      } catch (error) {
        return asErrorMessage(error);
      }
    },
  });
}

async function promptContextStorePath(id: string): Promise<string> {
  const { input } = await import('@inquirer/prompts');
  // Suggest a visible, user-owned location — never the managed XDG data dir.
  const defaultPath = ['~', 'openspec', id].join('/');

  return input({
    message: 'Where should this context store live?',
    default: defaultPath,
    prefill: 'editable',
    required: true,
  });
}

async function resolveSetupInput(
  id: string | undefined,
  options: ContextStoreSetupOptions
): Promise<ResolvedContextStoreSetupInput> {
  const interactive = !options.json && isInteractive();

  if (!id && !interactive) {
    throw new ContextStoreError(
      'Pass a context store name.',
      'context_store_setup_id_required',
      {
        target: 'context_store.id',
        fix: 'openspec context-store setup <id> --path ~/openspec/<id> --json',
      }
    );
  }

  if (options.path === undefined && !interactive) {
    throw new ContextStoreError(
      'Pass --path with the folder where this context store should live.',
      'context_store_setup_path_required',
      {
        target: 'context_store.root',
        fix: `openspec context-store setup ${id ?? '<id>'} --path ~/openspec/${id ?? '<id>'}`,
      }
    );
  }

  const resolvedId = id ? validateContextStoreId(id) : await promptContextStoreId();
  const promptedPath = options.path === undefined
    ? await promptContextStorePath(resolvedId)
    : undefined;

  return {
    id: resolvedId,
    path: options.path ?? promptedPath,
  };
}

async function prepareSetupInput(
  input: ResolvedContextStoreSetupInput,
  _options: ContextStoreSetupOptions
) {
  return prepareContextStoreSetup(input);
}

async function confirmSetup(
  prepared: Awaited<ReturnType<typeof prepareContextStoreSetup>>,
  initGit: boolean
): Promise<void> {
  const { confirm } = await import('@inquirer/prompts');

  console.log('');
  console.log('OpenSpec will create:');
  console.log('');
  console.log(`  Context store: ${prepared.id}`);
  console.log(`  Location: ${formatPathForHuman(prepared.root)}`);
  console.log(`  Git: ${initGit ? 'initialized' : 'not initialized'}`);
  console.log('');

  const confirmed = await confirm({
    message: 'Create this context store?',
    default: true,
  });

  if (!confirmed) {
    throw new ContextStoreError(
      'Context store setup cancelled.',
      'context_store_setup_cancelled',
      {
        target: 'context_store.root',
        fix: 'Rerun setup when you are ready.',
      }
    );
  }
}

async function confirmRemove(id: string, root: string, options: ContextStoreRemoveOptions): Promise<void> {
  if (options.yes) return;

  if (options.json || !isInteractive()) {
    throw new ContextStoreError(
      'Pass --yes to delete context-store files non-interactively.',
      'context_store_remove_confirmation_required',
      {
        target: 'context_store.root',
        fix: `openspec context-store remove ${id} --yes`,
      }
    );
  }

  const { confirm } = await import('@inquirer/prompts');
  const confirmed = await confirm({
    message: `Delete local context-store folder ${formatPathForHuman(root)}?`,
    default: false,
  });

  if (!confirmed) {
    throw new ContextStoreError(
      'Context store remove cancelled.',
      'context_store_remove_cancelled',
      {
        target: 'context_store.root',
        fix: 'Run context-store unregister if you only want to forget the local registration.',
      }
    );
  }
}

function isRegisterIdentityConfirmationError(error: unknown): boolean {
  return (
    error instanceof ContextStoreError &&
    error.diagnostic.code === 'context_store_register_identity_confirmation_required'
  );
}

async function confirmRegisterConversion(error: unknown): Promise<void> {
  const { confirm } = await import('@inquirer/prompts');
  const confirmed = await confirm({
    message: asErrorMessage(error),
    default: false,
  });

  if (!confirmed) {
    throw new ContextStoreError(
      'Context store register cancelled.',
      'context_store_register_cancelled',
      {
        target: 'context_store.metadata',
        fix: 'Rerun register when you are ready to create context-store identity metadata.',
      }
    );
  }
}

function printMutationHuman(title: string, payload: ContextStoreMutationOutput): void {
  if (!payload.context_store || !payload.registry || !payload.git) {
    return;
  }

  console.log(`${title}: ${payload.context_store.id}`);
  console.log(`Location: ${formatPathForHuman(payload.context_store.root)}`);
  console.log('OpenSpec root: ready');
  console.log(`Registry: ${payload.registry.already_registered ? 'already registered' : 'registered'}`);
  for (const status of payload.status) {
    console.log(`${status.severity === 'error' ? 'Issue' : 'Note'}: ${status.message}`);
  }
  console.log('');
  console.log('Next: run normal OpenSpec commands against this store, for example:');
  console.log(`  openspec new change <change-id> --store ${payload.context_store.id}`);
  console.log('Share this store by committing and pushing it like any Git repo.');
}

function printCleanupHuman(title: string, payload: ContextStoreCleanupOutput): void {
  if (!payload.context_store || !payload.registry || !payload.files) {
    return;
  }

  console.log(`${title}: ${payload.context_store.id}`);

  if (payload.files.deleted_path) {
    console.log(`Deleted: ${formatPathForHuman(payload.files.deleted_path)}`);
  } else if (payload.files.left_on_disk) {
    console.log(`Files kept at: ${formatPathForHuman(payload.files.left_on_disk)}`);
  } else if (!payload.files.deleted) {
    console.log(`Files were already missing: ${formatPathForHuman(payload.context_store.root)}`);
  }

  for (const status of payload.status) {
    console.log(`${status.severity === 'error' ? 'Issue' : 'Note'}: ${status.message}`);
  }
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
  if (!store.git.is_repository) return 'not detected';

  const fact = (value: boolean | null, yes: string, no: string): string =>
    value === null ? 'unknown' : value ? yes : no;

  return `repository detected (commits: ${fact(store.git.has_commits, 'yes', 'none')}, uncommitted changes: ${fact(store.git.has_uncommitted_changes, 'yes', 'no')}, remote: ${fact(store.git.has_remote, 'yes', 'none')})`;
}

function formatOpenSpecRootHuman(store: ContextStoreDoctorOutput['context_stores'][number]): string {
  if (store.openspec_root.healthy) return 'ok';
  if (store.openspec_root.present === false) return 'missing';
  if (store.openspec_root.present === null) return 'unknown';
  return 'incomplete';
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
    console.log(`  OpenSpec root: ${formatOpenSpecRootHuman(store)}`);
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
      const setupInput = await resolveSetupInput(id, options);
      const prepared = await prepareSetupInput(setupInput, options);
      const initGit = shouldInitializeGit(options);
      if (!options.json && isInteractive()) {
        await confirmSetup(prepared, initGit);
      }
      const payload = toMutationOutput(await setupPreparedContextStore(prepared, {
        initGit,
      }));

      if (options.json) {
        printJson(payload);
        return;
      }

      printMutationHuman('Context store ready', payload);
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
      let result: ContextStoreMutationResult;
      try {
        result = await registerExistingContextStore({
          path: inputPath,
          id: options.id,
          allowCreateIdentity: options.yes,
        });
      } catch (error) {
        if (!isRegisterIdentityConfirmationError(error) || options.json || !isInteractive()) {
          throw error;
        }

        await confirmRegisterConversion(error);
        result = await registerExistingContextStore({
          path: inputPath,
          id: options.id,
          allowCreateIdentity: true,
        });
      }

      const payload = toMutationOutput(result);

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

  async unregister(id: string, options: ContextStoreJsonOptions = {}): Promise<void> {
    try {
      const payload = toCleanupOutput(await unregisterContextStore({ id }));

      if (options.json) {
        printJson(payload);
        return;
      }

      printCleanupHuman('Unregistered context store', payload);
    } catch (error) {
      this.handleFailure(
        options.json,
        { context_store: null, registry: null, files: null, status: [] },
        error
      );
    }
  }

  async remove(id: string, options: ContextStoreRemoveOptions = {}): Promise<void> {
    try {
      const target = await prepareContextStoreCleanup({ id });
      await confirmRemove(target.id, target.root, options);
      const payload = toCleanupOutput(await removeContextStore(target));

      if (options.json) {
        printJson(payload);
        return;
      }

      printCleanupHuman('Removed context store', payload);
    } catch (error) {
      this.handleFailure(
        options.json,
        { context_store: null, registry: null, files: null, status: [] },
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
    .option('--path <path>', 'Folder where the context store should live (for example ~/openspec/<id>)')
    .option('--init-git', 'Initialize a Git repository with an initial commit (default)')
    .option('--no-init-git', 'Skip every Git action: no init, no initial commit')
    .option('--json', 'Output as JSON')
    .action(async (id: string | undefined, options: ContextStoreSetupOptions) => {
      await contextStoreCommand.setup(id, options);
    });

  contextStore
    .command('register [path]')
    .description('Register an existing local context store')
    .option('--id <id>', 'Context store id; defaults to metadata or folder name')
    .option('--yes', 'Confirm creating context-store identity metadata for a healthy OpenSpec root')
    .option('--json', 'Output as JSON')
    .action(async (inputPath: string | undefined, options: ContextStoreRegisterOptions) => {
      await contextStoreCommand.register(inputPath, options);
    });

  contextStore
    .command('unregister <id>')
    .description('Forget a local context-store registration without deleting files')
    .option('--json', 'Output as JSON')
    .action(async (id: string, options: ContextStoreJsonOptions) => {
      await contextStoreCommand.unregister(id, options);
    });

  contextStore
    .command('remove <id>')
    .description('Forget a local context-store registration and delete its local folder')
    .option('--yes', 'Confirm local context-store folder deletion')
    .option('--json', 'Output as JSON')
    .action(async (id: string, options: ContextStoreRemoveOptions) => {
      await contextStoreCommand.remove(id, options);
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
