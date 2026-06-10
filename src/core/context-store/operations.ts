import { execFile } from 'node:child_process';
import * as nodeFs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { promisify } from 'node:util';

import { FileSystemUtils } from '../../utils/file-system.js';
import {
  ANCHORED_OPENSPEC_DIRS,
  DIRECTORY_ANCHOR_FILE_NAME,
  OPENSPEC_ROOT_DIR,
  ensureOpenSpecRoot,
  inspectOpenSpecRoot,
  rollbackCreatedPaths,
  type CreatedPathLedgerEntry,
  type OpenSpecRootInspection,
} from '../openspec-root.js';
import {
  CONTEXT_STORE_METADATA_DIR_NAME,
  getContextStoreMetadataDir,
  getContextStoreMetadataPath,
  getContextStoreRegistryPath,
  listContextStoreRegistryEntries,
  readContextStoreRegistryState,
  readOptionalContextStoreMetadataState,
  resolveGitContextStoreBackendConfig,
  validateContextStoreId,
  writeContextStoreMetadataState,
  type ContextStoreGitBackendConfig,
  type ContextStorePathOptions,
  type ContextStoreRegistryState,
} from './foundation.js';
import { ContextStoreError, type ContextStoreDiagnostic, makeContextStoreDiagnostic } from './errors.js';
import {
  assertGitCommitIdentity,
  commitStoreFiles,
  gitDirectoryHasTrackedFiles,
  gitHasCommits,
  gitHasRemote,
  gitHasUncommittedChanges,
  initGitRepository,
  isGitRepositoryAtRoot,
} from './git.js';
import {
  getStoreRootForBackend,
  assertNoRegisteredStoreConflict,
  commitContextStoreRegistration,
  getRegisteredContextStore,
  listRegisteredContextStores,
  unregisterContextStoreRegistration,
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
    registered: boolean;
    alreadyRegistered: boolean;
  };
  git: {
    isRepository: boolean;
    initialized: boolean;
    committed: boolean;
  };
  createdArtifacts: string[];
  diagnostics: ContextStoreDiagnostic[];
}

export interface ContextStoreCleanupResult {
  store: ContextStoreInfo;
  registryCommit: {
    path: string;
    removed: boolean;
  };
  files: {
    deleted: boolean;
    deletedPath?: string;
    leftOnDisk?: string;
  };
  diagnostics: ContextStoreDiagnostic[];
}

export interface ContextStoreListResult {
  stores: ContextStoreInfo[];
}

export interface ContextStoreDoctorResult {
  stores: ContextStoreInspection[];
  diagnostics: ContextStoreDiagnostic[];
}

export interface ContextStoreInspection extends ContextStoreInfo {
  openspecRoot: OpenSpecRootInspection;
  metadata: {
    present: boolean | null;
    valid: boolean | null;
    id?: string;
  };
  git: {
    isRepository: boolean | null;
    hasCommits: boolean | null;
    hasUncommittedChanges: boolean | null;
    hasRemote: boolean | null;
  };
  diagnostics: ContextStoreDiagnostic[];
}

export interface SetupContextStoreInput {
  id?: string;
  path?: string;
  initGit?: boolean;
  allowInsideGitRepository?: boolean;
}

export interface RegisterExistingContextStoreInput {
  path?: string;
  id?: string;
  allowCreateIdentity?: boolean;
}

export interface CleanupContextStoreInput extends ContextStorePathOptions {
  id: string;
}

export interface PreparedContextStoreCleanup extends ContextStoreInfo, ContextStorePathOptions {
  backend: ContextStoreGitBackendConfig;
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

async function isGitOnlyDirectory(storeRoot: string): Promise<boolean> {
  const entries = await fs.readdir(storeRoot);
  return entries.length === 1 && entries[0] === '.git' && await isGitRepositoryAtRoot(storeRoot);
}

function alreadyRegisteredDiagnostic(id: string): ContextStoreDiagnostic {
  return makeContextStoreDiagnostic(
    'info',
    'context_store_already_registered',
    `Context store '${id}' is already registered at this path.`,
    {
      target: 'context_store.registry',
    }
  );
}

function createdPath(relativePath: string, absolutePath: string, kind: CreatedPathLedgerEntry['kind']): CreatedPathLedgerEntry {
  return {
    relativePath,
    absolutePath,
    kind,
  };
}

async function nearestExistingDirectory(targetPath: string): Promise<string | null> {
  let current = path.resolve(targetPath);

  while (true) {
    const kind = await pathKind(current);
    if (kind === 'directory') return current;
    if (kind !== 'missing') return null;

    const parent = path.dirname(current);
    if (parent === current) return null;
    current = parent;
  }
}

async function findContainingGitRepositoryRoot(storeRoot: string): Promise<string | null> {
  const resolvedStoreRoot = path.resolve(storeRoot);
  const nearestParent = await nearestExistingDirectory(path.dirname(resolvedStoreRoot));
  if (!nearestParent) return null;
  const comparableStoreRoot = path.resolve(
    FileSystemUtils.canonicalizeExistingPath(nearestParent),
    path.relative(nearestParent, resolvedStoreRoot)
  );

  const gitRootContainsStore = (gitRoot: string): string | null => {
    const normalizedGitRoot = FileSystemUtils.canonicalizeExistingPath(gitRoot);
    const relative = path.relative(normalizedGitRoot, comparableStoreRoot);
    return relative.length > 0 && !relative.startsWith('..') && !path.isAbsolute(relative)
      ? normalizedGitRoot
      : null;
  };

  try {
    const { stdout } = await execFileAsync('git', [
      '-C',
      nearestParent,
      'rev-parse',
      '--show-toplevel',
    ]);
    return gitRootContainsStore(stdout.trim());
  } catch {
    let current = nearestParent;
    while (true) {
      if (await isGitRepositoryAtRoot(current)) {
        return gitRootContainsStore(current);
      }

      const parent = path.dirname(current);
      if (parent === current) return null;
      current = parent;
    }
  }
}

async function assertSetupPathIsNotNestedInGitRepo(
  storeRoot: string,
  options: { allowInsideGitRepository?: boolean }
): Promise<void> {
  if (options.allowInsideGitRepository) return;

  const containingGitRoot = await findContainingGitRepositoryRoot(storeRoot);
  if (!containingGitRoot) return;

  throw new ContextStoreError(
    `Context store setup path is inside another Git repository: ${containingGitRoot}`,
    'context_store_setup_inside_git_repo',
    {
      target: 'context_store.root',
      fix: 'Choose a path outside that Git repository.',
    }
  );
}

function expandUserPath(inputPath: string): string {
  const trimmed = inputPath.trim();
  if (trimmed === '~') return os.homedir();
  if (trimmed.startsWith('~/') || trimmed.startsWith('~\\')) {
    return path.join(os.homedir(), trimmed.slice(2));
  }

  return trimmed;
}

function resolveSetupRoot(id: string, inputPath: string | undefined): string {
  // A store is a repo the user places; setup never silently picks app data.
  if (inputPath === undefined || inputPath.trim().length === 0) {
    throw new ContextStoreError(
      'Pass --path with the folder where this context store should live.',
      'context_store_setup_path_required',
      {
        target: 'context_store.root',
        fix: `openspec context-store setup ${id} --path ~/openspec/${id}`,
      }
    );
  }

  return path.resolve(expandUserPath(inputPath));
}

function resolveRegisterRoot(inputPath: string | undefined): string {
  if (inputPath === undefined || inputPath.trim().length === 0) {
    throw new ContextStoreError('Pass a context store path.', 'context_store_path_required', {
      target: 'context_store.root',
      fix: 'openspec context-store register /path/to/context-store',
    });
  }

  return path.resolve(expandUserPath(inputPath));
}

function inferStoreIdFromPath(storeRoot: string): string {
  return validateContextStoreId(path.basename(storeRoot));
}

function normalizeRegistryPathForComparison(targetPath: string): string {
  try {
    return FileSystemUtils.canonicalizeExistingPath(targetPath);
  } catch {
    return path.resolve(targetPath);
  }
}

function isRegisteredAtPath(
  registry: ContextStoreRegistryState | null,
  id: string,
  storeRoot: string
): boolean {
  const entry = registry?.stores?.[id];
  if (!entry) return false;

  return (
    normalizeRegistryPathForComparison(getStoreRootForBackend(entry.backend)) ===
    normalizeRegistryPathForComparison(storeRoot)
  );
}

function mutationPayload(
  id: string,
  storeRoot: string,
  git: { isRepository: boolean; initialized: boolean; committed: boolean },
  createdFiles: string[],
  registry: { registered: boolean; alreadyRegistered: boolean },
  diagnostics: ContextStoreDiagnostic[] = []
): ContextStoreMutationResult {
  return {
    store: {
      id,
      root: storeRoot,
      metadataPath: getContextStoreMetadataPath(storeRoot),
    },
    registryCommit: {
      path: getContextStoreRegistryPath(),
      registered: registry.registered,
      alreadyRegistered: registry.alreadyRegistered,
    },
    git: {
      isRepository: git.isRepository,
      initialized: git.initialized,
      committed: git.committed,
    },
    createdArtifacts: createdFiles,
    diagnostics,
  };
}

async function prepareSetupPlan(
  input: Pick<SetupContextStoreInput, 'id' | 'path' | 'allowInsideGitRepository'>
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
        fix: 'Choose an empty directory or an existing healthy OpenSpec root.',
      }
    );
  }

  // Context stores may be Git-backed, but creating one inside an implementation
  // repo is almost always an accidental nested-repo setup.
  await assertSetupPathIsNotNestedInGitRepo(storeRoot, {
    allowInsideGitRepository: input.allowInsideGitRepository,
  });

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
    } else {
      const openspecRoot = await inspectOpenSpecRoot(storeRoot);
      const safeFreshDirectory = await isDirectoryEmpty(storeRoot) || await isGitOnlyDirectory(storeRoot);
      if (!openspecRoot.healthy && !safeFreshDirectory) {
        throw new ContextStoreError(
          'Context store setup does not support initializing a non-empty folder that is not a healthy OpenSpec root.',
          'context_store_setup_non_empty_directory',
          {
            target: 'context_store.root',
            fix: 'Choose an empty folder, a Git-only folder, or an existing healthy OpenSpec root.',
          }
        );
      }
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

/**
 * Resolves the effective Git mode for a prepared setup: on by default for new
 * stores, off for reruns of an already-registered store (which must stay
 * no-ops), and always honoring an explicit --init-git/--no-init-git.
 */
export function resolveSetupGitEnabled(
  prepared: PreparedContextStoreSetup,
  initGit?: boolean
): boolean {
  return initGit ?? !isRegisteredAtPath(prepared.registry, prepared.id, prepared.root);
}

export async function prepareContextStoreSetup(
  input: Pick<SetupContextStoreInput, 'id' | 'path' | 'allowInsideGitRepository'>
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
  let createdPaths: CreatedPathLedgerEntry[] = [];
  let gitInitialized = false;
  let committed = false;

  // Reruns for an already-registered store stay strict no-ops: no anchor
  // retrofit, no git init, no new commit, no identity requirement. Only an
  // explicit --init-git overrides that for the git side.
  const alreadyRegisteredHere = isRegisteredAtPath(registry, id, storeRoot);

  // --no-init-git opts out of every Git action: no preflight, no init, no
  // commit, even when the target is already a repository.
  const gitEnabled = input.initGit ?? !alreadyRegisteredHere;
  const repoExisted = await isGitRepositoryAtRoot(storeRoot);

  // Identity preflight runs before anything is created so a missing identity
  // never leaves half-made state behind.
  if (gitEnabled) {
    await assertGitCommitIdentity(
      (await nearestExistingDirectory(storeRoot)) ?? process.cwd()
    );
  }

  try {
    const root = await ensureOpenSpecRoot(storeRoot, {
      anchorEmptyDirectories: !alreadyRegisteredHere,
    });
    createdFiles.push(...root.createdArtifacts);
    createdPaths = root.createdPaths;
    backend ??= await resolveGitContextStoreBackendConfig({ localPath: storeRoot });
    assertNoRegisteredStoreConflict(registry, id, backend);

    // The identity file is written before the initial commit so clones carry
    // it; without it, register falls back to the conversion prompt.
    const existingMetadata = await readStoreMetadataForOperation(storeRoot);
    if (!existingMetadata) {
      const metadataDir = getContextStoreMetadataDir(storeRoot);
      const metadataDirMissing = (await pathKind(metadataDir)) === 'missing';
      await writeContextStoreMetadataState(storeRoot, { version: 1, id });
      if (metadataDirMissing) {
        createdPaths.push(createdPath('.openspec-store/', metadataDir, 'directory'));
      }
      createdPaths.push(createdPath(
        '.openspec-store/store.yaml',
        getContextStoreMetadataPath(storeRoot),
        'file'
      ));
      createdFiles.push('.openspec-store/store.yaml');
    }

    gitInitialized = gitEnabled ? await initGitRepository(storeRoot) : false;
    const isRepository = gitInitialized || repoExisted;
    // "Files created for rollback" and "files a clone needs" are different
    // sets: when setup initialized the repository itself, the initial commit
    // must contain the full store shape or clones of a converted root would
    // be unhealthy. In a pre-existing repo the user owns the history, so
    // setup commits only what it created.
    const commitPathspecs = gitInitialized
      ? [OPENSPEC_ROOT_DIR, CONTEXT_STORE_METADATA_DIR_NAME]
      : createdPaths
          .filter((entry) => entry.kind === 'file')
          .map((entry) => entry.relativePath);
    committed = gitEnabled && isRepository
      ? await commitStoreFiles(storeRoot, id, commitPathspecs)
      : false;

    // Identity creation is setup's job (done above, before the commit);
    // registration only verifies it and records the machine-local entry.
    const registered = await commitContextStoreRegistration({
      id,
      backend,
      writeMetadataIfMissing: false,
    });
    const diagnostics = registered.alreadyRegistered && createdFiles.length === 0
      ? [alreadyRegisteredDiagnostic(id)]
      : [];

    return mutationPayload(id, registered.storeRoot, {
      isRepository,
      initialized: gitInitialized,
      committed,
    }, createdFiles, {
      registered: registered.registryUpdated,
      alreadyRegistered: registered.alreadyRegistered,
    }, diagnostics);
  } catch (error) {
    // Once the initial commit landed in a (possibly user-owned) repository,
    // the files are durable state; deleting them would orphan the commit.
    // The only remaining failure is the registry write, which is retryable.
    if (committed) {
      throw error;
    }

    if (createdPaths.length > 0) {
      await rollbackCreatedPaths(createdPaths);
      if (gitInitialized) {
        await fs.rm(path.join(storeRoot, '.git'), { recursive: true, force: true }).catch(() => undefined);
      }
      if (kind === 'missing') {
        // Non-recursive: never delete content this operation did not create.
        await fs.rmdir(storeRoot).catch(() => undefined);
      }
    } else if (kind === 'missing') {
      await fs.rm(storeRoot, { recursive: true, force: true }).catch(() => undefined);
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

  const openspecRoot = await inspectOpenSpecRoot(storeRoot);
  if (!openspecRoot.healthy) {
    const problems =
      openspecRoot.diagnostics.map((diagnostic) => diagnostic.message).join(' ') ||
      'The OpenSpec root is missing or incomplete.';
    const isEmptyCloneSuspect =
      (await isGitRepositoryAtRoot(storeRoot)) &&
      (await gitHasCommits(storeRoot)) === false;
    const emptyCloneHint = isEmptyCloneSuspect
      ? ' This folder is a Git repository with no commits — if it is a clone, the origin store needs an initial commit before the clone has any files.'
      : '';

    throw new ContextStoreError(
      `Context store register requires an existing healthy OpenSpec root. ${problems}${emptyCloneHint}`,
      'context_store_register_root_unhealthy',
      {
        target: 'openspec.root',
        fix: isEmptyCloneSuspect
          ? 'Commit and push the origin store, pull it into this clone, then rerun register.'
          : 'Run openspec context-store setup for a new store, or point register at a checkout whose openspec/ files are present.',
      }
    );
  }

  const metadata = await readStoreMetadataForOperation(storeRoot);
  const explicitId = input.id !== undefined ? validateContextStoreId(input.id) : undefined;

  if (metadata && explicitId !== undefined && metadata.id !== explicitId) {
    // The fix must account for whether the metadata id is already registered,
    // so following it never lands on the already-registered error.
    const currentRegistry = await readContextStoreRegistryState();
    const registeredElsewhere =
      currentRegistry?.stores?.[metadata.id] !== undefined &&
      !isRegisteredAtPath(currentRegistry, metadata.id, storeRoot);

    throw new ContextStoreError(
      `Context store metadata id '${metadata.id}' does not match --id '${explicitId}'. The id comes from the store's committed .openspec-store/store.yaml.`,
      'context_store_metadata_id_mismatch',
      {
        target: 'context_store.id',
        fix: registeredElsewhere
          ? `One checkout per store id is supported, and '${metadata.id}' is already registered. Run openspec context-store unregister ${metadata.id} first to register this checkout instead.`
          : `Use --id ${metadata.id} or register a different folder.`,
      }
    );
  }

  const id = metadata?.id ?? explicitId ?? inferStoreIdFromPath(storeRoot);
  if (!metadata && !input.allowCreateIdentity) {
    throw new ContextStoreError(
      `Turn this OpenSpec root into context store '${id}'?`,
      'context_store_register_identity_confirmation_required',
      {
        target: 'context_store.metadata',
        fix: `Run interactively or pass --yes to create ${getContextStoreMetadataPath(storeRoot)}.`,
      }
    );
  }

  const backend = await resolveGitContextStoreBackendConfig({ localPath: storeRoot });
  const registry = await readContextStoreRegistryState();
  assertNoRegisteredStoreConflict(registry, id, backend);
  const createdFiles: string[] = [];
  const isRepository = await isGitRepositoryAtRoot(storeRoot);

  const registered = await commitContextStoreRegistration({
    id,
    backend,
    writeMetadataIfMissing: true,
  });
  if (registered.metadataCreated) {
    createdFiles.push('.openspec-store/store.yaml');
  }
  const diagnostics = registered.alreadyRegistered && createdFiles.length === 0
    ? [alreadyRegisteredDiagnostic(id)]
    : [];

  // Register never commits; converted roots are the user's repo to commit.
  return mutationPayload(id, registered.storeRoot, {
    isRepository,
    initialized: false,
    committed: false,
  }, createdFiles, {
    registered: registered.registryUpdated,
    alreadyRegistered: registered.alreadyRegistered,
  }, diagnostics);
}

function cleanupStoreOutput(id: string, storeRoot: string): ContextStoreInfo {
  return {
    id,
    root: storeRoot,
    metadataPath: getContextStoreMetadataPath(storeRoot),
  };
}

export async function prepareContextStoreCleanup(
  input: CleanupContextStoreInput
): Promise<PreparedContextStoreCleanup> {
  const id = validateContextStoreId(input.id);
  const entry = await getRegisteredContextStore({
    id,
    globalDataDir: input.globalDataDir,
  });

  return {
    ...cleanupStoreOutput(entry.id, entry.storeRoot),
    backend: entry.backend,
    ...(input.globalDataDir ? { globalDataDir: input.globalDataDir } : {}),
  };
}

export async function unregisterContextStore(
  input: CleanupContextStoreInput
): Promise<ContextStoreCleanupResult> {
  const target = await prepareContextStoreCleanup(input);
  const removed = await unregisterContextStoreRegistration({
    id: target.id,
    expectedBackend: target.backend,
    globalDataDir: target.globalDataDir,
  });

  return {
    store: cleanupStoreOutput(removed.id, removed.storeRoot),
    registryCommit: {
      path: getContextStoreRegistryPath({ globalDataDir: target.globalDataDir }),
      removed: true,
    },
    files: {
      deleted: false,
      leftOnDisk: removed.storeRoot,
    },
    diagnostics: [],
  };
}

async function assertSafeToDeleteContextStoreRoot(storeRoot: string, id: string): Promise<{
  exists: boolean;
}> {
  const kind = await pathKind(storeRoot);

  if (kind === 'missing') {
    return { exists: false };
  }

  if (kind !== 'directory') {
    throw new ContextStoreError(
      `Context store path is not a directory: ${storeRoot}`,
      'context_store_remove_path_not_directory',
      {
        target: 'context_store.root',
        fix: 'Run context-store unregister if you only want to forget this local registry entry.',
      }
    );
  }

  const metadata = await readStoreMetadataForOperation(storeRoot);
  if (!metadata) {
    throw new ContextStoreError(
      'Context store remove refuses to delete a folder without context-store metadata.',
      'context_store_remove_metadata_missing',
      {
        target: 'context_store.metadata',
        fix: 'Run context-store unregister if you only want to forget this local registry entry.',
      }
    );
  }

  if (metadata.id !== id) {
    throw new ContextStoreError(
      `Context store metadata id '${metadata.id}' does not match requested id '${id}'.`,
      'context_store_metadata_id_mismatch',
      {
        target: 'context_store.metadata',
        fix: 'Repair the registry or run context-store unregister instead of deleting this folder.',
      }
    );
  }

  return { exists: true };
}

export async function removeContextStore(
  target: PreparedContextStoreCleanup
): Promise<ContextStoreCleanupResult> {
  const id = validateContextStoreId(target.id);
  const diagnostics: ContextStoreDiagnostic[] = [];
  let deleted = false;

  const removed = await unregisterContextStoreRegistration({
    id,
    expectedBackend: target.backend,
    globalDataDir: target.globalDataDir,
    beforeCommit: async (entry) => {
      const safeTarget = await assertSafeToDeleteContextStoreRoot(entry.storeRoot, id);
      if (!safeTarget.exists) {
        diagnostics.push(makeContextStoreDiagnostic(
          'warning',
          'context_store_root_missing',
          'Context store files were already missing.',
          {
            target: 'context_store.root',
          }
        ));
        return;
      }

      await fs.rm(entry.storeRoot, { recursive: true, force: true });
      deleted = true;
    },
  });

  return {
    store: cleanupStoreOutput(removed.id, removed.storeRoot),
    registryCommit: {
      path: getContextStoreRegistryPath({ globalDataDir: target.globalDataDir }),
      removed: true,
    },
    files: {
      deleted,
      ...(deleted ? { deletedPath: removed.storeRoot } : {}),
    },
    diagnostics,
  };
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
    hasCommits: null,
    hasUncommittedChanges: null,
    hasRemote: null,
  };
  let openspecRoot: OpenSpecRootInspection = await inspectOpenSpecRoot(root);

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
    openspecRoot = await inspectOpenSpecRoot(root);
    diagnostics.push(...openspecRoot.diagnostics);

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

    const isRepository = await isGitRepositoryAtRoot(root);
    git = {
      isRepository,
      hasCommits: null,
      hasUncommittedChanges: null,
      hasRemote: null,
    };

    // Read-only Git facts; doctor reports and never repairs.
    if (isRepository) {
      git.hasCommits = await gitHasCommits(root);
      git.hasUncommittedChanges = await gitHasUncommittedChanges(root);
      git.hasRemote = await gitHasRemote(root);

      if (git.hasCommits === false) {
        diagnostics.push(makeContextStoreDiagnostic(
          'warning',
          'context_store_git_no_commits',
          'Git repository has no commits yet; clones of this store will be empty until an initial commit exists.',
          {
            target: 'context_store.git',
            fix: 'Commit the store files, then push to share them.',
          }
        ));
      } else if (git.hasCommits === true) {
        const fragileDirs: string[] = [];
        for (const relativeDir of ANCHORED_OPENSPEC_DIRS) {
          const dirKind = await pathKind(path.join(root, relativeDir));
          if (dirKind !== 'directory') continue;
          if ((await gitDirectoryHasTrackedFiles(root, relativeDir)) === false) {
            fragileDirs.push(`${relativeDir}/`);
          }
        }

        if (fragileDirs.length > 0) {
          diagnostics.push(makeContextStoreDiagnostic(
            'warning',
            'context_store_clone_fragile_directories',
            `These directories contain no tracked files and will be lost in clones: ${fragileDirs.join(', ')}.`,
            {
              target: 'context_store.git',
              fix: `Track a file in each directory (for example ${DIRECTORY_ANCHOR_FILE_NAME}) and commit it.`,
            }
          ));
        }
      }
    }
  }

  return {
    id: entry.id,
    root,
    metadataPath,
    openspecRoot,
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
