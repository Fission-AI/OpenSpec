import { execFile } from 'node:child_process';
import * as nodeFs from 'node:fs';
import * as path from 'node:path';
import { promisify } from 'node:util';
import { Command } from 'commander';

import {
  getContextStoreMetadataPath,
  getContextStoreRegistryPath,
  listContextStoreRegistryEntries,
  listRegisteredContextStores,
  readContextStoreRegistryState,
  readOptionalContextStoreMetadataState,
  resolveGitContextStoreBackendConfig,
  validateContextStoreId,
  writeContextStoreMetadataState,
  writeContextStoreRegistryState,
  type ContextStoreGitBackendConfig,
  type ContextStorePathOptions,
  type ContextStoreRegistryState,
} from '../core/context-store/index.js';
import { FileSystemUtils } from '../utils/file-system.js';
import { isInteractive } from '../utils/interactive.js';

const fs = nodeFs.promises;
const execFileAsync = promisify(execFile);

type ContextStoreStatusSeverity = 'error' | 'warning';

interface ContextStoreStatus {
  severity: ContextStoreStatusSeverity;
  code: string;
  message: string;
  target?: string;
  fix?: string;
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
  status: ContextStoreStatus[];
}

interface ContextStoreListOutput {
  context_stores: ContextStoreOutput[];
  status: ContextStoreStatus[];
}

interface ContextStoreDoctorOutput {
  context_stores: ContextStoreDoctorStoreOutput[];
  status: ContextStoreStatus[];
}

interface ContextStoreDoctorStoreOutput extends ContextStoreOutput {
  metadata: {
    present: boolean | null;
    valid: boolean | null;
    id?: string;
  };
  git: {
    is_repository: boolean | null;
  };
  status: ContextStoreStatus[];
}

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

class ContextStoreCliError extends Error {
  readonly status: ContextStoreStatus;

  constructor(
    message: string,
    code: string,
    options: { target?: string; fix?: string } = {}
  ) {
    super(message);
    this.status = {
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

function asErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function makeStatus(
  severity: ContextStoreStatusSeverity,
  code: string,
  message: string,
  options: { target?: string; fix?: string } = {}
): ContextStoreStatus {
  return {
    severity,
    code,
    message,
    ...options,
  };
}

function appendStatus<T extends { status: ContextStoreStatus[] }>(
  payload: T,
  status: ContextStoreStatus
): T {
  return {
    ...payload,
    status: [...payload.status, status],
  };
}

function asStatus(error: unknown): ContextStoreStatus {
  if (error instanceof ContextStoreCliError) {
    return error.status;
  }

  const message = asErrorMessage(error);

  if (message.startsWith('Context store id ')) {
    return makeStatus('error', 'invalid_context_store_id', message, {
      target: 'context_store.id',
      fix: 'Use kebab-case with lowercase letters, numbers, and single hyphen separators.',
    });
  }

  if (message.startsWith('Invalid context store registry state')) {
    return makeStatus('error', 'invalid_context_store_registry', message, {
      target: 'context_store.registry',
      fix: 'Repair or remove the context-store registry file.',
    });
  }

  if (message.startsWith('Invalid context store metadata state')) {
    return makeStatus('error', 'invalid_context_store_metadata', message, {
      target: 'context_store.metadata',
      fix: 'Repair .openspec-store/store.yaml.',
    });
  }

  return makeStatus('error', 'context_store_error', message);
}

function isPromptCancellationError(error: unknown): boolean {
  return (
    error instanceof Error &&
    (error.name === 'ExitPromptError' || error.message.includes('force closed the prompt with SIGINT'))
  );
}

async function pathKind(targetPath: string): Promise<'missing' | 'directory' | 'file' | 'other'> {
  try {
    const stat = await fs.stat(targetPath);
    if (stat.isDirectory()) return 'directory';
    if (stat.isFile()) return 'file';
    return 'other';
  } catch (error) {
    if (isNodeErrorCode(error, 'ENOENT')) {
      return 'missing';
    }
    throw error;
  }
}

function isNodeErrorCode(error: unknown, code: string): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as NodeJS.ErrnoException).code === code
  );
}

async function isDirectoryEmpty(directory: string): Promise<boolean> {
  return (await fs.readdir(directory)).length === 0;
}

function normalizePathForComparison(targetPath: string): string {
  return FileSystemUtils.canonicalizeExistingPath(targetPath);
}

function sortedRegistryState(
  registry: ContextStoreRegistryState | null,
  id: string,
  backend: ContextStoreGitBackendConfig
): ContextStoreRegistryState {
  return {
    version: 1,
    stores: Object.fromEntries(
      Object.entries({
        ...(registry?.stores ?? {}),
        [id]: {
          backend,
        },
      }).sort(([left], [right]) => left.localeCompare(right))
    ),
  };
}

function getStoreRootForBackend(backend: ContextStoreGitBackendConfig): string {
  return backend.local_path;
}

function assertNoRegistryConflict(
  registry: ContextStoreRegistryState | null,
  id: string,
  localPath: string
): void {
  const nextPath = normalizePathForComparison(localPath);

  for (const entry of listContextStoreRegistryEntries(registry ?? { version: 1, stores: {} })) {
    const entryPath = normalizePathForComparison(getStoreRootForBackend(entry.backend));

    if (entry.id === id && entryPath === nextPath) {
      continue;
    }

    if (entry.id === id) {
      throw new ContextStoreCliError(
        `Context store '${id}' is already registered at ${entry.backend.local_path}.`,
        'context_store_id_conflict',
        {
          target: 'context_store.id',
          fix: 'Use the existing registration or choose a different context store id.',
        }
      );
    }

    if (entryPath === nextPath) {
      throw new ContextStoreCliError(
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

async function readStoreMetadataForCommand(storeRoot: string) {
  try {
    return await readOptionalContextStoreMetadataState(storeRoot);
  } catch (error) {
    throw new ContextStoreCliError(
      asErrorMessage(error),
      'invalid_context_store_metadata',
      {
        target: 'context_store.metadata',
        fix: `Repair ${getContextStoreMetadataPath(storeRoot)}.`,
      }
    );
  }
}

async function isGitRepositoryAtRoot(storeRoot: string): Promise<boolean> {
  const gitPath = path.join(storeRoot, '.git');
  const kind = await pathKind(gitPath);
  return kind === 'directory' || kind === 'file';
}

async function initGitRepository(storeRoot: string): Promise<boolean> {
  if (await isGitRepositoryAtRoot(storeRoot)) {
    return false;
  }

  try {
    await execFileAsync('git', ['init'], { cwd: storeRoot });
  } catch (error) {
    throw new ContextStoreCliError(
      `Failed to initialize Git repository: ${asErrorMessage(error)}`,
      'context_store_git_init_failed',
      {
        target: 'context_store.git',
        fix: 'Install Git or rerun setup with --no-init-git.',
      }
    );
  }

  return true;
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

function resolveSetupRoot(id: string, inputPath: string | undefined): string {
  if (inputPath !== undefined && inputPath.trim().length === 0) {
    throw new ContextStoreCliError('Pass a non-empty --path value.', 'context_store_path_required', {
      target: 'context_store.root',
      fix: `openspec context-store setup ${id} --path ./team-context`,
    });
  }

  return path.resolve(inputPath ?? id);
}

function resolveRegisterRoot(inputPath: string | undefined): string {
  if (inputPath === undefined || inputPath.trim().length === 0) {
    throw new ContextStoreCliError('Pass a context store path.', 'context_store_path_required', {
      target: 'context_store.root',
      fix: 'openspec context-store register /path/to/context-store',
    });
  }

  return path.resolve(inputPath);
}

function inferStoreIdFromPath(storeRoot: string): string {
  return validateContextStoreId(path.basename(storeRoot));
}

async function resolveExistingStoreBackend(storeRoot: string): Promise<ContextStoreGitBackendConfig> {
  return resolveGitContextStoreBackendConfig({ localPath: storeRoot });
}

function mutationPayload(
  id: string,
  storeRoot: string,
  registryPath: string,
  git: { is_repository: boolean; initialized: boolean },
  createdFiles: string[]
): ContextStoreMutationOutput {
  return {
    context_store: {
      id,
      root: storeRoot,
      metadata_path: getContextStoreMetadataPath(storeRoot),
    },
    registry: {
      path: registryPath,
      registered: true,
    },
    git,
    created_files: createdFiles,
    status: [],
  };
}

async function setupContextStore(
  rawId: string | undefined,
  options: ContextStoreSetupOptions
): Promise<ContextStoreMutationOutput> {
  const id = validateContextStoreId(rawId ?? '');
  const storeRoot = resolveSetupRoot(id, options.path);
  const kind = await pathKind(storeRoot);

  if (kind === 'file' || kind === 'other') {
    throw new ContextStoreCliError(
      `Context store setup path is not a directory: ${storeRoot}`,
      'context_store_setup_path_not_directory',
      {
        target: 'context_store.root',
        fix: 'Choose an empty directory or omit --path to use ./<id>.',
      }
    );
  }

  const createdFiles: string[] = [];
  let metadata: Awaited<ReturnType<typeof readStoreMetadataForCommand>> = null;
  let backend: ContextStoreGitBackendConfig | undefined;

  if (kind === 'directory') {
    metadata = await readStoreMetadataForCommand(storeRoot);

    if (metadata) {
      if (metadata.id !== id) {
        throw new ContextStoreCliError(
          `Context store metadata id '${metadata.id}' does not match requested id '${id}'.`,
          'context_store_metadata_id_mismatch',
          {
            target: 'context_store.metadata',
            fix: `Use id '${metadata.id}' or choose a different setup path.`,
          }
        );
      }
    } else if (!(await isDirectoryEmpty(storeRoot))) {
      throw new ContextStoreCliError(
        'Context store setup does not support initializing a non-empty folder yet.',
        'context_store_setup_non_empty_directory',
        {
          target: 'context_store.root',
          fix: 'Create an empty folder or use context-store register for an existing context store.',
        }
      );
    }
    backend = await resolveExistingStoreBackend(storeRoot);
  }

  const registryOptions: ContextStorePathOptions = {};
  const registry = await readContextStoreRegistryState(registryOptions);
  assertNoRegistryConflict(registry, id, backend?.local_path ?? storeRoot);
  const initGitRequested = await shouldInitializeGit(options);

  if (kind === 'missing') {
    await fs.mkdir(storeRoot, { recursive: true });
  }

  if (!metadata) {
    await writeContextStoreMetadataState(storeRoot, { version: 1, id });
    createdFiles.push('.openspec-store/store.yaml');
  }

  backend ??= await resolveExistingStoreBackend(storeRoot);
  assertNoRegistryConflict(registry, id, backend.local_path);

  const gitInitialized = initGitRequested ? await initGitRepository(backend.local_path) : false;
  const isRepository = await isGitRepositoryAtRoot(backend.local_path);

  await writeContextStoreRegistryState(sortedRegistryState(registry, id, backend), registryOptions);

  return mutationPayload(id, backend.local_path, getContextStoreRegistryPath(), {
    is_repository: isRepository,
    initialized: gitInitialized,
  }, createdFiles);
}

async function registerExistingContextStore(
  inputPath: string | undefined,
  options: ContextStoreRegisterOptions
): Promise<ContextStoreMutationOutput> {
  const storeRoot = resolveRegisterRoot(inputPath);
  const kind = await pathKind(storeRoot);

  if (kind === 'missing') {
    throw new ContextStoreCliError(`Context store path does not exist: ${storeRoot}`, 'context_store_path_missing', {
      target: 'context_store.root',
      fix: 'Clone or create the context store folder before registering it.',
    });
  }

  if (kind !== 'directory') {
    throw new ContextStoreCliError(
      `Context store path is not a directory: ${storeRoot}`,
      'context_store_path_not_directory',
      {
        target: 'context_store.root',
        fix: 'Pass an existing context store directory.',
      }
    );
  }

  const metadata = await readStoreMetadataForCommand(storeRoot);
  const explicitId = options.id !== undefined
    ? validateContextStoreId(options.id)
    : undefined;

  if (metadata && explicitId !== undefined && metadata.id !== explicitId) {
    throw new ContextStoreCliError(
      `Context store metadata id '${metadata.id}' does not match --id '${explicitId}'.`,
      'context_store_metadata_id_mismatch',
      {
        target: 'context_store.id',
        fix: `Use --id ${metadata.id} or register a different folder.`,
      }
    );
  }

  const id = metadata?.id ?? explicitId ?? inferStoreIdFromPath(storeRoot);
  const backend = await resolveExistingStoreBackend(storeRoot);
  const registryOptions: ContextStorePathOptions = {};
  const registry = await readContextStoreRegistryState(registryOptions);
  assertNoRegistryConflict(registry, id, backend.local_path);

  const createdFiles: string[] = [];
  if (!metadata) {
    await writeContextStoreMetadataState(backend.local_path, { version: 1, id });
    createdFiles.push('.openspec-store/store.yaml');
  }

  await writeContextStoreRegistryState(sortedRegistryState(registry, id, backend), registryOptions);

  return mutationPayload(id, backend.local_path, getContextStoreRegistryPath(), {
    is_repository: await isGitRepositoryAtRoot(backend.local_path),
    initialized: false,
  }, createdFiles);
}

async function listContextStores(): Promise<ContextStoreListOutput> {
  const entries = await listRegisteredContextStores();

  return {
    context_stores: entries.map((entry) => ({
      id: entry.id,
      root: entry.storeRoot,
    })),
    status: [],
  };
}

function doctorStatusForError(error: unknown, code: string, target: string, fix?: string): ContextStoreStatus {
  return makeStatus('error', code, asErrorMessage(error), {
    target,
    ...(fix ? { fix } : {}),
  });
}

async function inspectContextStore(entry: { id: string; backend: ContextStoreGitBackendConfig }): Promise<ContextStoreDoctorStoreOutput> {
  const root = getStoreRootForBackend(entry.backend);
  const metadataPath = getContextStoreMetadataPath(root);
  const status: ContextStoreStatus[] = [];
  const kind = await pathKind(root);
  let metadata: ContextStoreDoctorStoreOutput['metadata'] = {
    present: null,
    valid: null,
  };
  let git: ContextStoreDoctorStoreOutput['git'] = {
    is_repository: null,
  };

  if (kind === 'missing') {
    status.push(makeStatus('error', 'context_store_root_missing', 'Context store location does not exist.', {
      target: 'context_store.root',
      fix: `Run openspec context-store register /path/to/${entry.id} --id ${entry.id}.`,
    }));
  } else if (kind !== 'directory') {
    status.push(makeStatus('error', 'context_store_root_not_directory', 'Context store location is not a directory.', {
      target: 'context_store.root',
      fix: 'Register a directory path for this context store.',
    }));
  } else {
    try {
      const parsed = await readOptionalContextStoreMetadataState(root);
      if (!parsed) {
        metadata = { present: false, valid: false };
        status.push(makeStatus('error', 'context_store_metadata_missing', 'Context store metadata is missing.', {
          target: 'context_store.metadata',
          fix: `Create ${metadataPath} or rerun context-store register.`,
        }));
      } else if (parsed.id !== entry.id) {
        metadata = { present: true, valid: false, id: parsed.id };
        status.push(makeStatus('error', 'context_store_metadata_id_mismatch', `Context store metadata id '${parsed.id}' does not match registry id '${entry.id}'.`, {
          target: 'context_store.metadata',
          fix: 'Repair the local registry or store metadata so the ids match.',
        }));
      } else {
        metadata = { present: true, valid: true, id: parsed.id };
      }
    } catch (error) {
      metadata = { present: true, valid: false };
      status.push(doctorStatusForError(
        error,
        'context_store_metadata_invalid',
        'context_store.metadata',
        `Repair ${metadataPath}.`
      ));
    }

    git = {
      is_repository: await isGitRepositoryAtRoot(root),
    };
  }

  return {
    id: entry.id,
    root,
    metadata_path: metadataPath,
    metadata,
    git,
    status,
  };
}

async function doctorContextStores(id?: string): Promise<ContextStoreDoctorOutput> {
  const selectedId = id !== undefined ? validateContextStoreId(id) : undefined;
  const registry = await readContextStoreRegistryState();

  if (!registry) {
    if (selectedId !== undefined) {
      throw new ContextStoreCliError(`Unknown context store '${selectedId}'.`, 'context_store_not_found', {
        target: 'context_store.id',
        fix: 'Run openspec context-store list to see registered stores.',
      });
    }

    return { context_stores: [], status: [] };
  }

  const entries = listContextStoreRegistryEntries(registry);
  const selected = selectedId
    ? entries.filter((entry) => entry.id === selectedId)
    : entries;

  if (selectedId && selected.length === 0) {
    throw new ContextStoreCliError(`Unknown context store '${selectedId}'.`, 'context_store_not_found', {
      target: 'context_store.id',
      fix: 'Run openspec context-store list to see registered stores.',
    });
  }

  return {
    context_stores: await Promise.all(selected.map(inspectContextStore)),
    status: [],
  };
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

function formatMetadataHuman(store: ContextStoreDoctorStoreOutput): string {
  if (store.metadata.valid) return 'ok';
  if (store.metadata.present === false) return 'missing';
  if (store.metadata.present === null) return 'unknown';
  return 'invalid';
}

function formatDoctorGitHuman(store: ContextStoreDoctorStoreOutput): string {
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
      const payload = await setupContextStore(id, options);

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
      const payload = await registerExistingContextStore(inputPath, options);

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
      const payload = await listContextStores();

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
      const payload = await doctorContextStores(id);

      if (options.json) {
        printJson(payload);
        return;
      }

      printDoctorHuman(payload);
    } catch (error) {
      this.handleFailure(options.json, { context_stores: [], status: [] }, error);
    }
  }

  private handleFailure<T extends { status: ContextStoreStatus[] }>(
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
