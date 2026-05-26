import { execFile } from 'node:child_process';
import * as nodeFs from 'node:fs';
import * as path from 'node:path';
import { promisify } from 'node:util';

import { FileSystemUtils } from '../../utils/file-system.js';
import {
  getContextStoreMetadataPath,
  getContextStoreRegistryPath,
  listContextStoreRegistryEntries,
  readContextStoreRegistryState,
  readOptionalContextStoreMetadataState,
  resolveGitContextStoreBackendConfig,
  validateContextStoreId,
  type ContextStoreGitBackendConfig,
  type ContextStoreRegistryState,
} from './foundation.js';
import { ContextStoreError, type ContextStoreDiagnostic, makeContextStoreDiagnostic } from './errors.js';
import {
  getStoreRootForBackend,
  assertNoRegisteredStoreConflict,
  commitContextStoreRegistration,
  listRegisteredContextStores,
} from './registry.js';

const fs = nodeFs.promises;
const execFileAsync = promisify(execFile);

type PathKind = 'missing' | 'directory' | 'file' | 'other';

export interface ContextStoreInfo {
  id: string;
  root: string;
  metadataPath?: string;
}

export interface ContextStoreMutationResult {
  store: ContextStoreInfo;
  registryCommit: {
    path: string;
  };
  git: {
    isRepository: boolean;
    initialized: boolean;
  };
  createdArtifacts: string[];
}

export interface ContextStoreListResult {
  stores: ContextStoreInfo[];
}

export interface ContextStoreDoctorResult {
  stores: ContextStoreInspection[];
  diagnostics: ContextStoreDiagnostic[];
}

export interface ContextStoreInspection extends ContextStoreInfo {
  metadata: {
    present: boolean | null;
    valid: boolean | null;
    id?: string;
  };
  git: {
    isRepository: boolean | null;
  };
  diagnostics: ContextStoreDiagnostic[];
}

export interface SetupContextStoreInput {
  id?: string;
  path?: string;
  initGit?: boolean;
}

export interface RegisterExistingContextStoreInput {
  path?: string;
  id?: string;
}

export interface PreparedContextStoreSetup {
  id: string;
  root: string;
  rootKind: Extract<PathKind, 'missing' | 'directory'>;
  backend?: ContextStoreGitBackendConfig;
  registry: ContextStoreRegistryState | null;
}

interface ContextStoreSetupPlan {
  id: string;
  storeRoot: string;
  kind: Extract<PathKind, 'missing' | 'directory'>;
  backend?: ContextStoreGitBackendConfig;
  registry: ContextStoreRegistryState | null;
}

async function pathKind(targetPath: string): Promise<PathKind> {
  try {
    const stat = await fs.stat(targetPath);
    if (stat.isDirectory()) return 'directory';
    if (stat.isFile()) return 'file';
    return 'other';
  } catch (error) {
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as NodeJS.ErrnoException).code === 'ENOENT'
    ) {
      return 'missing';
    }
    throw error;
  }
}

async function isDirectoryEmpty(directory: string): Promise<boolean> {
  return (await fs.readdir(directory)).length === 0;
}

async function readStoreMetadataForOperation(storeRoot: string) {
  try {
    return await readOptionalContextStoreMetadataState(storeRoot);
  } catch (error) {
    throw new ContextStoreError(
      error instanceof Error ? error.message : String(error),
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
    throw new ContextStoreError(
      `Failed to initialize Git repository: ${error instanceof Error ? error.message : String(error)}`,
      'context_store_git_init_failed',
      {
        target: 'context_store.git',
        fix: 'Install Git or rerun setup with --no-init-git.',
      }
    );
  }

  return true;
}

function resolveSetupRoot(id: string, inputPath: string | undefined): string {
  if (inputPath !== undefined && inputPath.trim().length === 0) {
    throw new ContextStoreError('Pass a non-empty --path value.', 'context_store_path_required', {
      target: 'context_store.root',
      fix: `openspec context-store setup ${id} --path ./team-context`,
    });
  }

  return path.resolve(inputPath ?? id);
}

function resolveRegisterRoot(inputPath: string | undefined): string {
  if (inputPath === undefined || inputPath.trim().length === 0) {
    throw new ContextStoreError('Pass a context store path.', 'context_store_path_required', {
      target: 'context_store.root',
      fix: 'openspec context-store register /path/to/context-store',
    });
  }

  return path.resolve(inputPath);
}

function inferStoreIdFromPath(storeRoot: string): string {
  return validateContextStoreId(path.basename(storeRoot));
}

function mutationPayload(
  id: string,
  storeRoot: string,
  git: { isRepository: boolean; initialized: boolean },
  createdFiles: string[]
): ContextStoreMutationResult {
  return {
    store: {
      id,
      root: storeRoot,
      metadataPath: getContextStoreMetadataPath(storeRoot),
    },
    registryCommit: {
      path: getContextStoreRegistryPath(),
    },
    git: {
      isRepository: git.isRepository,
      initialized: git.initialized,
    },
    createdArtifacts: createdFiles,
  };
}

async function prepareSetupPlan(
  input: Pick<SetupContextStoreInput, 'id' | 'path'>
): Promise<ContextStoreSetupPlan> {
  const id = validateContextStoreId(input.id ?? '');
  const storeRoot = resolveSetupRoot(id, input.path);
  const kind = await pathKind(storeRoot);

  if (kind === 'file' || kind === 'other') {
    throw new ContextStoreError(
      `Context store setup path is not a directory: ${storeRoot}`,
      'context_store_setup_path_not_directory',
      {
        target: 'context_store.root',
        fix: 'Choose an empty directory or omit --path to use ./<id>.',
      }
    );
  }

  let metadata: Awaited<ReturnType<typeof readStoreMetadataForOperation>> = null;
  let backend: ContextStoreGitBackendConfig | undefined;

  if (kind === 'directory') {
    metadata = await readStoreMetadataForOperation(storeRoot);

    if (metadata) {
      if (metadata.id !== id) {
        throw new ContextStoreError(
          `Context store metadata id '${metadata.id}' does not match requested id '${id}'.`,
          'context_store_metadata_id_mismatch',
          {
            target: 'context_store.metadata',
            fix: `Use id '${metadata.id}' or choose a different setup path.`,
          }
        );
      }
    } else if (!(await isDirectoryEmpty(storeRoot))) {
      throw new ContextStoreError(
        'Context store setup does not support initializing a non-empty folder yet.',
        'context_store_setup_non_empty_directory',
        {
          target: 'context_store.root',
          fix: 'Create an empty folder or use context-store register for an existing context store.',
        }
      );
    }

    backend = await resolveGitContextStoreBackendConfig({ localPath: storeRoot });
  }

  const registry = await readContextStoreRegistryState();
  const conflictBackend = backend ?? {
    type: 'git' as const,
    local_path: FileSystemUtils.canonicalizeExistingPath(storeRoot),
  };

  assertNoRegisteredStoreConflict(registry, id, conflictBackend);

  return {
    id,
    storeRoot,
    kind,
    registry,
    ...(backend ? { backend } : {}),
  };
}

export async function prepareContextStoreSetup(
  input: Pick<SetupContextStoreInput, 'id' | 'path'>
): Promise<PreparedContextStoreSetup> {
  const plan = await prepareSetupPlan(input);

  return {
    id: plan.id,
    root: plan.storeRoot,
    rootKind: plan.kind,
    registry: plan.registry,
    ...(plan.backend ? { backend: plan.backend } : {}),
  };
}

export async function setupPreparedContextStore(
  prepared: PreparedContextStoreSetup,
  input: Pick<SetupContextStoreInput, 'initGit'> = {}
): Promise<ContextStoreMutationResult> {
  const plan: ContextStoreSetupPlan = {
    id: prepared.id,
    storeRoot: prepared.root,
    kind: prepared.rootKind,
    registry: prepared.registry,
    ...(prepared.backend ? { backend: prepared.backend } : {}),
  };
  const { id, storeRoot, kind, registry } = plan;
  let { backend } = plan;
  const createdFiles: string[] = [];

  const initGit = input.initGit ?? false;

  if (kind === 'missing') {
    await fs.mkdir(storeRoot, { recursive: true });
  }

  try {
    backend ??= await resolveGitContextStoreBackendConfig({ localPath: storeRoot });
    assertNoRegisteredStoreConflict(registry, id, backend);

    const gitInitialized = initGit ? await initGitRepository(storeRoot) : false;
    const registered = await commitContextStoreRegistration({
      id,
      backend,
      writeMetadataIfMissing: true,
    });
    if (registered.metadataCreated) {
      createdFiles.push('.openspec-store/store.yaml');
    }
    const isRepository = await isGitRepositoryAtRoot(registered.storeRoot);

    return mutationPayload(id, registered.storeRoot, {
      isRepository,
      initialized: gitInitialized,
    }, createdFiles);
  } catch (error) {
    if (kind === 'missing') {
      await fs.rm(storeRoot, { recursive: true, force: true });
    }

    throw error;
  }
}

export async function setupContextStore(
  input: SetupContextStoreInput
): Promise<ContextStoreMutationResult> {
  return setupPreparedContextStore(await prepareContextStoreSetup(input), {
    initGit: input.initGit,
  });
}

export async function registerExistingContextStore(
  input: RegisterExistingContextStoreInput
): Promise<ContextStoreMutationResult> {
  const storeRoot = resolveRegisterRoot(input.path);
  const kind = await pathKind(storeRoot);

  if (kind === 'missing') {
    throw new ContextStoreError(
      `Context store path does not exist: ${storeRoot}`,
      'context_store_path_missing',
      {
        target: 'context_store.root',
        fix: 'Clone or create the context store folder before registering it.',
      }
    );
  }

  if (kind !== 'directory') {
    throw new ContextStoreError(
      `Context store path is not a directory: ${storeRoot}`,
      'context_store_path_not_directory',
      {
        target: 'context_store.root',
        fix: 'Pass an existing context store directory.',
      }
    );
  }

  const metadata = await readStoreMetadataForOperation(storeRoot);
  const explicitId = input.id !== undefined ? validateContextStoreId(input.id) : undefined;

  if (metadata && explicitId !== undefined && metadata.id !== explicitId) {
    throw new ContextStoreError(
      `Context store metadata id '${metadata.id}' does not match --id '${explicitId}'.`,
      'context_store_metadata_id_mismatch',
      {
        target: 'context_store.id',
        fix: `Use --id ${metadata.id} or register a different folder.`,
      }
    );
  }

  const id = metadata?.id ?? explicitId ?? inferStoreIdFromPath(storeRoot);
  const backend = await resolveGitContextStoreBackendConfig({ localPath: storeRoot });
  const registry = await readContextStoreRegistryState();
  assertNoRegisteredStoreConflict(registry, id, backend);
  const createdFiles: string[] = [];

  const registered = await commitContextStoreRegistration({
    id,
    backend,
    writeMetadataIfMissing: true,
  });
  if (registered.metadataCreated) {
    createdFiles.push('.openspec-store/store.yaml');
  }

  return mutationPayload(id, registered.storeRoot, {
    isRepository: await isGitRepositoryAtRoot(registered.storeRoot),
    initialized: false,
  }, createdFiles);
}

export async function listContextStores(): Promise<ContextStoreListResult> {
  const entries = await listRegisteredContextStores();

  return {
    stores: entries.map((entry) => ({
      id: entry.id,
      root: entry.storeRoot,
    })),
  };
}

function doctorStatusForError(
  error: unknown,
  code: string,
  target: string,
  fix?: string
): ContextStoreDiagnostic {
  if (error instanceof ContextStoreError) {
    return error.diagnostic;
  }

  return makeContextStoreDiagnostic(
    'error',
    code,
    error instanceof Error ? error.message : String(error),
    {
      target,
      ...(fix ? { fix } : {}),
    }
  );
}

async function inspectContextStore(entry: {
  id: string;
  backend: ContextStoreGitBackendConfig;
}): Promise<ContextStoreInspection> {
  const root = getStoreRootForBackend(entry.backend);
  const metadataPath = getContextStoreMetadataPath(root);
  const diagnostics: ContextStoreDiagnostic[] = [];
  const kind = await pathKind(root);
  let metadata: ContextStoreInspection['metadata'] = {
    present: null,
    valid: null,
  };
  let git: ContextStoreInspection['git'] = {
    isRepository: null,
  };

  if (kind === 'missing') {
    diagnostics.push(makeContextStoreDiagnostic(
      'error',
      'context_store_root_missing',
      'Context store location does not exist.',
      {
        target: 'context_store.root',
        fix: `Run openspec context-store register /path/to/${entry.id} --id ${entry.id}.`,
      }
    ));
  } else if (kind !== 'directory') {
    diagnostics.push(makeContextStoreDiagnostic(
      'error',
      'context_store_root_not_directory',
      'Context store location is not a directory.',
      {
        target: 'context_store.root',
        fix: 'Register a directory path for this context store.',
      }
    ));
  } else {
    try {
      const parsed = await readOptionalContextStoreMetadataState(root);
      if (!parsed) {
        metadata = { present: false, valid: false };
        diagnostics.push(makeContextStoreDiagnostic(
          'error',
          'context_store_metadata_missing',
          'Context store metadata is missing.',
          {
            target: 'context_store.metadata',
            fix: `Create ${metadataPath} or rerun context-store register.`,
          }
        ));
      } else if (parsed.id !== entry.id) {
        metadata = { present: true, valid: false, id: parsed.id };
        diagnostics.push(makeContextStoreDiagnostic(
          'error',
          'context_store_metadata_id_mismatch',
          `Context store metadata id '${parsed.id}' does not match registry id '${entry.id}'.`,
          {
            target: 'context_store.metadata',
            fix: 'Repair the local registry or store metadata so the ids match.',
          }
        ));
      } else {
        metadata = { present: true, valid: true, id: parsed.id };
      }
    } catch (error) {
      metadata = { present: true, valid: false };
      diagnostics.push(doctorStatusForError(
        error,
        'context_store_metadata_invalid',
        'context_store.metadata',
        `Repair ${metadataPath}.`
      ));
    }

    git = {
      isRepository: await isGitRepositoryAtRoot(root),
    };
  }

  return {
    id: entry.id,
    root,
    metadataPath,
    metadata,
    git,
    diagnostics,
  };
}

export async function doctorContextStores(id?: string): Promise<ContextStoreDoctorResult> {
  const selectedId = id !== undefined ? validateContextStoreId(id) : undefined;
  const registry = await readContextStoreRegistryState();

  if (!registry) {
    if (selectedId !== undefined) {
      throw new ContextStoreError(`Unknown context store '${selectedId}'.`, 'context_store_not_found', {
        target: 'context_store.id',
        fix: 'Run openspec context-store list to see registered stores.',
      });
    }

    return { stores: [], diagnostics: [] };
  }

  const entries = listContextStoreRegistryEntries(registry);
  const selected = selectedId
    ? entries.filter((entry) => entry.id === selectedId)
    : entries;

  if (selectedId && selected.length === 0) {
    throw new ContextStoreError(`Unknown context store '${selectedId}'.`, 'context_store_not_found', {
      target: 'context_store.id',
      fix: 'Run openspec context-store list to see registered stores.',
    });
  }

  return {
    stores: await Promise.all(selected.map(inspectContextStore)),
    diagnostics: [],
  };
}

export function normalizeContextStorePathForComparison(targetPath: string): string {
  return FileSystemUtils.canonicalizeExistingPath(targetPath);
}
