import * as os from 'node:os';
import { asErrorMessage, emitFailure, printJson } from './shared-output.js';
import * as path from 'node:path';
import { Command } from 'commander';

import { COMMAND_REGISTRY } from '../core/completions/command-registry.js';

import {
  StoreError,
  doctorStores,
  listStores,
  prepareStoreSetup,
  prepareStoreCleanup,
  registerExistingStore,
  removeStore,
  resolveSetupGitEnabled,
  setupPreparedStore,
  unregisterStore,
  validateStoreId,
  type StoreCleanupResult,
  type StoreDiagnostic,
  type StoreDoctorResult,
  type StoreInfo,
  type StoreInspection,
  type StoreListResult,
  type StoreMutationResult,
  type SetupStoreInput,
} from '../core/store/index.js';
import { isInteractive } from '../utils/interactive.js';

interface StoreSetupOptions {
  path?: string;
  initGit?: boolean;
  json?: boolean;
  remote?: string;
}

interface StoreRegisterOptions {
  id?: string;
  yes?: boolean;
  json?: boolean;
}

interface StoreRemoveOptions {
  yes?: boolean;
  json?: boolean;
}

interface StoreJsonOptions {
  json?: boolean;
}

interface ResolvedStoreSetupInput extends SetupStoreInput {
  id: string;
}

interface StoreOutput {
  id: string;
  root: string;
  metadata_path?: string;
}

interface StoreMutationOutput {
  store: StoreOutput | null;
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
  status: StoreDiagnostic[];
}

interface StoreCleanupOutput {
  store: StoreOutput | null;
  registry: {
    path: string;
    removed: boolean;
  } | null;
  files: {
    deleted: boolean;
    deleted_path: string | null;
    left_on_disk: string | null;
  } | null;
  status: StoreDiagnostic[];
}

interface StoreListOutput {
  stores: StoreOutput[];
  status: StoreDiagnostic[];
}

type OpenSpecRootOutput = Omit<StoreInspection['openspecRoot'], 'diagnostics'> & {
  status: StoreDiagnostic[];
};

interface StoreDoctorStoreOutput extends StoreOutput {
  openspec_root: OpenSpecRootOutput;
  metadata: StoreInspection['metadata'];
  git: {
    is_repository: boolean | null;
    has_commits: boolean | null;
    has_uncommitted_changes: boolean | null;
    has_remote: boolean | null;
    origin_url: string | null;
  };
  status: StoreDiagnostic[];
}

interface StoreDoctorOutput {
  stores: StoreDoctorStoreOutput[];
  status: StoreDiagnostic[];
}





function toStoreOutput(store: StoreInfo): StoreOutput {
  return {
    id: store.id,
    root: store.root,
    ...(store.metadataPath ? { metadata_path: store.metadataPath } : {}),
  };
}

function toMutationOutput(result: StoreMutationResult): StoreMutationOutput {
  return {
    store: toStoreOutput(result.store),
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

function toCleanupOutput(result: StoreCleanupResult): StoreCleanupOutput {
  return {
    store: toStoreOutput(result.store),
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

function toListOutput(result: StoreListResult): StoreListOutput {
  return {
    stores: result.stores.map(toStoreOutput),
    status: [],
  };
}

function toOpenSpecRootOutput(root: StoreInspection['openspecRoot']): OpenSpecRootOutput {
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

function toDoctorStoreOutput(store: StoreInspection): StoreDoctorStoreOutput {
  return {
    ...toStoreOutput(store),
    openspec_root: toOpenSpecRootOutput(store.openspecRoot),
    metadata: store.metadata,
    git: {
      is_repository: store.git.isRepository,
      has_commits: store.git.hasCommits,
      has_uncommitted_changes: store.git.hasUncommittedChanges,
      has_remote: store.git.hasRemote,
      origin_url: store.git.originUrl,
    },
    status: store.diagnostics,
  };
}

function toDoctorOutput(result: StoreDoctorResult): StoreDoctorOutput {
  return {
    stores: result.stores.map(toDoctorStoreOutput),
    status: result.diagnostics,
  };
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

async function promptStoreId(): Promise<string> {
  const { input } = await import('@inquirer/prompts');

  return input({
    message: 'Store name',
    required: true,
    validate(value: string) {
      try {
        validateStoreId(value);
        return true;
      } catch (error) {
        return asErrorMessage(error);
      }
    },
  });
}

async function promptStorePath(id: string): Promise<string> {
  const { input } = await import('@inquirer/prompts');
  // Suggest a visible, user-owned location — never the managed XDG data dir.
  const defaultPath = ['~', 'openspec', id].join('/');

  return input({
    message: 'Where should this store live?',
    default: defaultPath,
    prefill: 'editable',
    required: true,
  });
}

async function resolveSetupInput(
  id: string | undefined,
  options: StoreSetupOptions
): Promise<ResolvedStoreSetupInput> {
  const interactive = !options.json && isInteractive();

  if (!id && !interactive) {
    throw new StoreError(
      'Pass a store name.',
      'store_setup_id_required',
      {
        target: 'store.id',
        fix: 'openspec store setup <id> --path ~/openspec/<id> --json',
      }
    );
  }

  if (options.path === undefined && !interactive) {
    throw new StoreError(
      'Pass --path with the folder where this store should live.',
      'store_setup_path_required',
      {
        target: 'store.root',
        fix: `openspec store setup ${id ?? '<id>'} --path ~/openspec/${id ?? '<id>'}`,
      }
    );
  }

  const resolvedId = id ? validateStoreId(id) : await promptStoreId();
  const promptedPath = options.path === undefined
    ? await promptStorePath(resolvedId)
    : undefined;

  return {
    id: resolvedId,
    path: options.path ?? promptedPath,
    ...(options.remote !== undefined ? { remote: options.remote } : {}),
  };
}

async function prepareSetupInput(
  input: ResolvedStoreSetupInput,
  _options: StoreSetupOptions
) {
  return prepareStoreSetup(input);
}

async function confirmSetup(
  prepared: Awaited<ReturnType<typeof prepareStoreSetup>>,
  initGit: boolean
): Promise<void> {
  const { confirm } = await import('@inquirer/prompts');

  console.log('');
  console.log('OpenSpec will create:');
  console.log('');
  console.log(`  Store: ${prepared.id}`);
  console.log(`  Location: ${formatPathForHuman(prepared.root)}`);
  console.log(`  Git: ${initGit ? 'initialized' : 'not initialized'}`);
  console.log('');

  const confirmed = await confirm({
    message: 'Create this store?',
    default: true,
  });

  if (!confirmed) {
    throw new StoreError(
      'Store setup cancelled.',
      'store_setup_cancelled',
      {
        target: 'store.root',
        fix: 'Rerun setup when you are ready.',
      }
    );
  }
}

async function confirmRemove(id: string, root: string, options: StoreRemoveOptions): Promise<void> {
  if (options.yes) return;

  if (options.json || !isInteractive()) {
    throw new StoreError(
      'Pass --yes to delete store files non-interactively.',
      'store_remove_confirmation_required',
      {
        target: 'store.root',
        fix: `openspec store remove ${id} --yes`,
      }
    );
  }

  const { confirm } = await import('@inquirer/prompts');
  const confirmed = await confirm({
    message: `Delete local store folder ${formatPathForHuman(root)}?`,
    default: false,
  });

  if (!confirmed) {
    throw new StoreError(
      'Store remove cancelled.',
      'store_remove_cancelled',
      {
        target: 'store.root',
        fix: 'Run "openspec store unregister <id>" if you only want to forget the local registration.',
      }
    );
  }
}

function isRegisterIdentityConfirmationError(error: unknown): boolean {
  return (
    error instanceof StoreError &&
    error.diagnostic.code === 'store_register_identity_confirmation_required'
  );
}

async function confirmRegisterConversion(error: unknown): Promise<void> {
  const { confirm } = await import('@inquirer/prompts');
  const confirmed = await confirm({
    message: asErrorMessage(error),
    default: false,
  });

  if (!confirmed) {
    throw new StoreError(
      'Store register cancelled.',
      'store_register_cancelled',
      {
        target: 'store.metadata',
        fix: 'Rerun register when you are ready to create store identity metadata.',
      }
    );
  }
}

function printMutationHuman(
  title: string,
  payload: StoreMutationOutput,
  remotes?: { canonical?: string; observed?: string }
): void {
  if (!payload.store || !payload.registry || !payload.git) {
    return;
  }

  console.log(`${title}: ${payload.store.id}`);
  console.log(`Location: ${formatPathForHuman(payload.store.root)}`);
  console.log('OpenSpec root: ready');
  console.log(`Registry: ${payload.registry.already_registered ? 'already registered' : 'registered'}`);
  for (const status of payload.status) {
    console.log(`${status.severity === 'error' ? 'Issue' : 'Note'}: ${status.message}`);
  }
  console.log('');
  console.log('Next: run normal OpenSpec commands against this store, for example:');
  console.log(`  openspec new change <change-id> --store ${payload.store.id}`);
  if (payload.git.is_repository) {
    const shareRemote = remotes?.canonical ?? remotes?.observed;
    console.log(
      shareRemote
        ? `Share it: teammates clone ${shareRemote} and run openspec store register <path>.`
        : 'Share this store by committing and pushing it like any Git repo.'
    );
  }
}

function printCleanupHuman(title: string, payload: StoreCleanupOutput): void {
  if (!payload.store || !payload.registry || !payload.files) {
    return;
  }

  console.log(`${title}: ${payload.store.id}`);

  if (payload.files.deleted_path) {
    console.log(`Deleted: ${formatPathForHuman(payload.files.deleted_path)}`);
  } else if (payload.files.left_on_disk) {
    console.log(`Files kept at: ${formatPathForHuman(payload.files.left_on_disk)}`);
  } else if (!payload.files.deleted) {
    console.log(`Files were already missing: ${formatPathForHuman(payload.store.root)}`);
  }

  for (const status of payload.status) {
    console.log(`${status.severity === 'error' ? 'Issue' : 'Note'}: ${status.message}`);
  }
}

function printListHuman(payload: StoreListOutput): void {
  if (payload.stores.length === 0) {
    console.log('No stores registered.');
    console.log('');
    console.log('Next:');
    console.log('  openspec store setup team-context --path ~/openspec/team-context');
    console.log('  openspec store register /path/to/store');
    return;
  }

  console.log(`OpenSpec stores (${payload.stores.length})`);
  console.log('');
  console.log(`${'ID'.padEnd(16)}Location`);
  for (const store of payload.stores) {
    console.log(`${store.id.padEnd(16)}${store.root}`);
  }
}

function formatMetadataHuman(store: StoreDoctorOutput['stores'][number]): string {
  if (store.metadata.valid) return 'ok';
  if (store.metadata.present === false) return 'missing';
  if (store.metadata.present === null) return 'unknown';
  return 'invalid';
}

function formatDoctorGitHuman(store: StoreDoctorOutput['stores'][number]): string {
  if (store.git.is_repository === null) return 'unknown';
  if (!store.git.is_repository) return 'not detected';

  const fact = (value: boolean | null, yes: string, no: string): string =>
    value === null ? 'unknown' : value ? yes : no;

  return `repository detected (commits: ${fact(store.git.has_commits, 'yes', 'none')}, uncommitted changes: ${fact(store.git.has_uncommitted_changes, 'yes', 'no')}, remote: ${fact(store.git.has_remote, 'yes', 'none')})`;
}

function formatOpenSpecRootHuman(store: StoreDoctorOutput['stores'][number]): string {
  if (store.openspec_root.healthy) return 'ok';
  if (store.openspec_root.present === false) return 'missing';
  if (store.openspec_root.present === null) return 'unknown';
  return 'incomplete';
}

function printDoctorHuman(payload: StoreDoctorOutput): void {
  if (payload.stores.length === 0) {
    console.log('No stores registered.');
    return;
  }

  console.log('Store doctor');
  for (const store of payload.stores) {
    console.log('');
    console.log(store.id);
    console.log(`  Location: ${store.root}`);
    console.log(`  OpenSpec root: ${formatOpenSpecRootHuman(store)}`);
    console.log(`  Metadata: ${formatMetadataHuman(store)}`);
    const remoteLine = store.metadata.remote ?? store.git.origin_url;
    if (remoteLine) {
      console.log(`  Remote: ${remoteLine}`);
    }
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

class StoreCommand {
  async setup(id: string | undefined, options: StoreSetupOptions = {}): Promise<void> {
    try {
      const setupInput = await resolveSetupInput(id, options);
      const prepared = await prepareSetupInput(setupInput, options);
      const initGit = resolveSetupGitEnabled(prepared, options.initGit);
      if (!options.json && isInteractive()) {
        await confirmSetup(prepared, initGit);
      }
      const result = await setupPreparedStore(prepared, { initGit });
      const payload = toMutationOutput(result);

      if (options.json) {
        printJson(payload);
        return;
      }

      printMutationHuman('Store ready', payload, result.remotes);
    } catch (error) {
      this.handleFailure(
        options.json,
        { store: null, registry: null, git: null, created_files: [], status: [] },
        error
      );
    }
  }

  async register(inputPath: string | undefined, options: StoreRegisterOptions = {}): Promise<void> {
    try {
      let result: StoreMutationResult;
      try {
        result = await registerExistingStore({
          path: inputPath,
          id: options.id,
          allowCreateIdentity: options.yes,
        });
      } catch (error) {
        if (!isRegisterIdentityConfirmationError(error) || options.json || !isInteractive()) {
          throw error;
        }

        await confirmRegisterConversion(error);
        result = await registerExistingStore({
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

      printMutationHuman('Store registered', payload, result.remotes);
    } catch (error) {
      this.handleFailure(
        options.json,
        { store: null, registry: null, git: null, created_files: [], status: [] },
        error
      );
    }
  }

  async unregister(id: string, options: StoreJsonOptions = {}): Promise<void> {
    try {
      const payload = toCleanupOutput(await unregisterStore({ id }));

      if (options.json) {
        printJson(payload);
        return;
      }

      printCleanupHuman('Unregistered store', payload);
    } catch (error) {
      this.handleFailure(
        options.json,
        { store: null, registry: null, files: null, status: [] },
        error
      );
    }
  }

  async remove(id: string, options: StoreRemoveOptions = {}): Promise<void> {
    try {
      const target = await prepareStoreCleanup({ id });
      await confirmRemove(target.id, target.root, options);
      const payload = toCleanupOutput(await removeStore(target));

      if (options.json) {
        printJson(payload);
        return;
      }

      printCleanupHuman('Removed store', payload);
    } catch (error) {
      this.handleFailure(
        options.json,
        { store: null, registry: null, files: null, status: [] },
        error
      );
    }
  }

  async list(options: StoreJsonOptions = {}): Promise<void> {
    try {
      const payload = toListOutput(await listStores());

      if (options.json) {
        printJson(payload);
        return;
      }

      printListHuman(payload);
    } catch (error) {
      this.handleFailure(options.json, { stores: [], status: [] }, error);
    }
  }

  async doctor(id: string | undefined, options: StoreJsonOptions = {}): Promise<void> {
    try {
      const payload = toDoctorOutput(await doctorStores(id));

      if (options.json) {
        printJson(payload);
        return;
      }

      printDoctorHuman(payload);
    } catch (error) {
      this.handleFailure(options.json, { stores: [], status: [] }, error);
    }
  }

  private handleFailure<T extends { status: StoreDiagnostic[] }>(
    json: boolean | undefined,
    payload: T,
    error: unknown
  ): void {
    emitFailure(json, payload, error, 'store_error');
  }
}

export function registerStoreCommand(program: Command): void {
  const storeCommand = new StoreCommand();
  // One source for the locked group one-liner: the completions registry
  // entry, which shell completion scripts also consume.
  const storeGroupDescription =
    COMMAND_REGISTRY.find((entry) => entry.name === 'store')?.description ??
    'Create and manage stores - standalone OpenSpec repos you register on this machine';
  const store = program.command('store').description(storeGroupDescription);

  store
    .command('setup [id]')
    .description('Create and register a local store')
    .option('--path <path>', 'Folder where the store should live (for example ~/openspec/<id>)')
    .option('--init-git', 'Initialize a Git repository with an initial commit (default)')
    .option('--no-init-git', 'Skip every Git action: no init, no initial commit')
    .option('--remote <url>', 'Canonical clone source recorded in store.yaml')
    .option('--json', 'Output as JSON')
    .action(async (id: string | undefined, options: StoreSetupOptions) => {
      await storeCommand.setup(id, options);
    });

  store
    .command('register [path]')
    .description('Register an existing local store')
    .option('--id <id>', 'Store id; defaults to metadata or folder name')
    .option('--yes', 'Confirm creating store identity metadata for a healthy OpenSpec root')
    .option('--json', 'Output as JSON')
    .action(async (inputPath: string | undefined, options: StoreRegisterOptions) => {
      await storeCommand.register(inputPath, options);
    });

  store
    .command('unregister <id>')
    .description('Forget a local store registration without deleting files')
    .option('--json', 'Output as JSON')
    .action(async (id: string, options: StoreJsonOptions) => {
      await storeCommand.unregister(id, options);
    });

  store
    .command('remove <id>')
    .description('Forget a local store registration and delete its local folder')
    .option('--yes', 'Confirm local store folder deletion')
    .option('--json', 'Output as JSON')
    .action(async (id: string, options: StoreRemoveOptions) => {
      await storeCommand.remove(id, options);
    });

  store
    .command('list')
    .alias('ls')
    .description('List locally registered stores')
    .option('--json', 'Output as JSON')
    .action(async (options: StoreJsonOptions) => {
      await storeCommand.list(options);
    });

  store
    .command('doctor [id]')
    .description('Check local store registration and metadata')
    .option('--json', 'Output as JSON')
    .action(async (id: string | undefined, options: StoreJsonOptions) => {
      await storeCommand.doctor(id, options);
    });

  const lifecycleRedirects = new Set(
    COMMAND_REGISTRY.filter(
      (entry) =>
        entry.flags.some((flag) => flag.name === 'store') ||
        (entry.subcommands ?? []).some((subcommand) =>
          subcommand.flags.some((flag) => flag.name === 'store')
        )
    ).map((entry) => entry.name)
  );
  const storeSubcommandsLine = store.commands
    .map((subcommand) => {
      const aliases = subcommand.aliases();
      return aliases.length > 0 ? `${subcommand.name()} (${aliases.join(', ')})` : subcommand.name();
    })
    .join(', ');
  // One group action owns missing AND unknown subcommands. Known
  // subcommands dispatch above; everything else — including a bare
  // `store --json` with no operand — lands here, so the handler owns the
  // entire message and exit path (same text for human and --json). The
  // permissive flags route unknown operands/options here instead of
  // letting Commander emit a raw error before the action runs. We detect
  // `--json` in the residual args rather than declaring a group option,
  // which would otherwise shadow each subcommand's own `--json` flag.
  store.allowExcessArguments(true);
  store.allowUnknownOption(true);
  store.action(() => {
    const operands = store.args;
    // Flag values are indistinguishable from operands without a full
    // parse, so the verbatim echo only applies to plain-operand input.
    const attempted = operands.filter((operand) => !operand.startsWith('-'));
    const hasFlagLikeToken = operands.some((operand) => operand.startsWith('-'));
    // The agent contract: --json failures emit one JSON document.
    if (operands.includes('--json')) {
      const message =
        attempted.length > 0
          ? `Unknown command '${attempted[0]}' for 'openspec store'. Store subcommands: ${storeSubcommandsLine}.`
          : `Missing subcommand for 'openspec store'. Store subcommands: ${storeSubcommandsLine}.`;
      printJson({
        status: [
          {
            severity: 'error',
            code: 'unknown_store_subcommand',
            message,
            fix: 'Run a store subcommand, or use the lifecycle command with --store <id>.',
          },
        ],
      });
      process.exitCode = 1;
      return;
    }
    let example = 'openspec new change <change-id> --store <id>';
    if (!hasFlagLikeToken && attempted.length > 0 && lifecycleRedirects.has(attempted[0])) {
      if (attempted[0] === 'new') {
        const changeId = attempted[1] === 'change' && attempted[2] ? attempted[2] : '<change-id>';
        example = `openspec new change ${changeId} --store <id>`;
      } else {
        example = `openspec ${attempted.join(' ')} --store <id>`;
      }
    }
    console.error(
      attempted.length > 0
        ? `Error: unknown command '${attempted[0]}' for 'openspec store'.`
        : "Error: missing subcommand for 'openspec store'."
    );
    console.error(
      `Store subcommands manage store registration: ${storeSubcommandsLine}.`
    );
    console.error(
      'To create or work on a change in a store, use the normal command with --store, for example:'
    );
    console.error(`  ${example}`);
    process.exitCode = 1;
  });
}
