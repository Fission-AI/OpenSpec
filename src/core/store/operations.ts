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
  STORE_METADATA_DIR_NAME,
  getStoreMetadataDir,
  getStoreMetadataPath,
  getStoreRegistryPath,
  listStoreRegistryEntries,
  readStoreRegistryState,
  readOptionalStoreMetadataState,
  resolveGitStoreBackendConfig,
  validateStoreId,
  writeStoreMetadataState,
  type StoreGitBackendConfig,
  type StorePathOptions,
  type StoreRegistryState,
} from './foundation.js';
import { StoreError, type StoreDiagnostic, makeStoreDiagnostic } from './errors.js';
import {
  assertGitCommitIdentity,
  commitStoreFiles,
  gitDirectoryHasTrackedFiles,
  gitHasCommits,
  gitHasRemote,
  gitHasUncommittedChanges,
  gitOriginUrl,
  initGitRepository,
  isGitRepositoryAtRoot,
} from './git.js';
import {
  getStoreRootForBackend,
  assertNoRegisteredStoreConflict,
  commitStoreRegistration,
  getRegisteredStore,
  listRegisteredStores,
  unregisterStoreRegistration,
} from './registry.js';

const fs = nodeFs.promises;
const execFileAsync = promisify(execFile);

type PathKind = 'missing' | 'directory' | 'file' | 'other';

export interface StoreInfo {
  id: string;
  root: string;
  metadataPath?: string;
}

export interface StoreMutationResult {
  store: StoreInfo;
  /** Clone-source knowledge for human sharing guidance; never in JSON. */
  remotes?: {
    canonical?: string;
    observed?: string;
  };
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
  diagnostics: StoreDiagnostic[];
}

export interface StoreCleanupResult {
  store: StoreInfo;
  registryCommit: {
    path: string;
    removed: boolean;
  };
  files: {
    deleted: boolean;
    deletedPath?: string;
    leftOnDisk?: string;
  };
  diagnostics: StoreDiagnostic[];
}

export interface StoreListResult {
  stores: StoreInfo[];
}

export interface StoreDoctorResult {
  stores: StoreInspection[];
  diagnostics: StoreDiagnostic[];
}

export interface StoreInspection extends StoreInfo {
  openspecRoot: OpenSpecRootInspection;
  metadata: {
    present: boolean | null;
    valid: boolean | null;
    id?: string;
    /** Canonical clone source from store.yaml; null when absent. */
    remote: string | null;
  };
  git: {
    isRepository: boolean | null;
    hasCommits: boolean | null;
    hasUncommittedChanges: boolean | null;
    hasRemote: boolean | null;
    /** Observed origin URL, live-probed; null when none. */
    originUrl: string | null;
  };
  diagnostics: StoreDiagnostic[];
}

export interface SetupStoreInput {
  id?: string;
  path?: string;
  initGit?: boolean;
  allowInsideGitRepository?: boolean;
  /** Canonical clone source written into store.yaml (slice 3.3). */
  remote?: string;
}

export interface RegisterExistingStoreInput {
  path?: string;
  id?: string;
  allowCreateIdentity?: boolean;
}

export interface CleanupStoreInput extends StorePathOptions {
  id: string;
}

export interface PreparedStoreCleanup extends StoreInfo, StorePathOptions {
  backend: StoreGitBackendConfig;
}

export interface PreparedStoreSetup {
  id: string;
  root: string;
  rootKind: Extract<PathKind, 'missing' | 'directory'>;
  backend?: StoreGitBackendConfig;
  registry: StoreRegistryState | null;
  remote?: string;
}

interface StoreSetupPlan {
  id: string;
  storeRoot: string;
  kind: Extract<PathKind, 'missing' | 'directory'>;
  backend?: StoreGitBackendConfig;
  registry: StoreRegistryState | null;
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
    return await readOptionalStoreMetadataState(storeRoot);
  } catch (error) {
    throw new StoreError(
      error instanceof Error ? error.message : String(error),
      'invalid_store_metadata',
      {
        target: 'store.metadata',
        fix: `Repair ${getStoreMetadataPath(storeRoot)}.`,
      }
    );
  }
}

async function isGitOnlyDirectory(storeRoot: string): Promise<boolean> {
  const entries = await fs.readdir(storeRoot);
  return entries.length === 1 && entries[0] === '.git' && await isGitRepositoryAtRoot(storeRoot);
}

function alreadyRegisteredDiagnostic(id: string): StoreDiagnostic {
  return makeStoreDiagnostic(
    'info',
    'store_already_registered',
    `Store '${id}' is already registered at this path.`,
    {
      target: 'store.registry',
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

  throw new StoreError(
    `Store setup path is inside another Git repository: ${containingGitRoot}`,
    'store_setup_inside_git_repo',
    {
      target: 'store.root',
      fix: 'Choose a path outside that Git repository.',
    }
  );
}

export function expandUserPath(inputPath: string): string {
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
    throw new StoreError(
      'Pass --path with the folder where this store should live.',
      'store_setup_path_required',
      {
        target: 'store.root',
        fix: `openspec store setup ${id} --path ~/openspec/${id}`,
      }
    );
  }

  return path.resolve(expandUserPath(inputPath));
}

function resolveRegisterRoot(inputPath: string | undefined): string {
  if (inputPath === undefined || inputPath.trim().length === 0) {
    throw new StoreError('Pass a store path.', 'store_path_required', {
      target: 'store.root',
      fix: 'openspec store register /path/to/store',
    });
  }

  return path.resolve(expandUserPath(inputPath));
}

function inferStoreIdFromPath(storeRoot: string): string {
  return validateStoreId(path.basename(storeRoot));
}

function normalizeRegistryPathForComparison(targetPath: string): string {
  try {
    return FileSystemUtils.canonicalizeExistingPath(targetPath);
  } catch {
    return path.resolve(targetPath);
  }
}

function isRegisteredAtPath(
  registry: StoreRegistryState | null,
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
  diagnostics: StoreDiagnostic[] = [],
  remotes?: { canonical?: string; observed?: string }
): StoreMutationResult {
  return {
    store: {
      id,
      root: storeRoot,
      metadataPath: getStoreMetadataPath(storeRoot),
    },
    ...(remotes && (remotes.canonical || remotes.observed) ? { remotes } : {}),
    registryCommit: {
      path: getStoreRegistryPath(),
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



function remoteRequiresHandEditError(id: string, storeRoot: string): StoreError {
  return new StoreError(
    `Store '${id}' already has an identity file; --remote cannot change it.`,
    'store_remote_requires_hand_edit',
    {
      target: 'store.metadata',
      fix: `Edit ${getStoreMetadataPath(storeRoot)} and commit it.`,
    }
  );
}

/**
 * Backend config carrying the observed origin. Guarded by an at-root
 * repository check: `git -C` discovers repositories by walking UP the
 * tree, so probing a non-repo store folder nested inside another repo
 * would record the ENCLOSING repo's origin.
 */
async function resolveBackendWithObservedOrigin(
  storeRoot: string
): Promise<StoreGitBackendConfig> {
  const origin = (await isGitRepositoryAtRoot(storeRoot))
    ? await gitOriginUrl(storeRoot)
    : null;
  return resolveGitStoreBackendConfig({
    localPath: storeRoot,
    ...(origin ? { remote: origin } : {}),
  });
}

async function prepareSetupPlan(
  input: Pick<SetupStoreInput, 'id' | 'path' | 'allowInsideGitRepository' | 'remote'>
): Promise<StoreSetupPlan> {
  const id = validateStoreId(input.id ?? '');
  if (input.remote !== undefined && input.remote.length === 0) {
    throw new StoreError('Store remote must not be empty when provided.', 'store_remote_empty', {
      target: 'store.metadata',
      fix: 'Pass a clone URL: --remote <url>.',
    });
  }
  const storeRoot = resolveSetupRoot(id, input.path);
  const kind = await pathKind(storeRoot);

  if (kind === 'file' || kind === 'other') {
    throw new StoreError(
      `Store setup path is not a directory: ${storeRoot}`,
      'store_setup_path_not_directory',
      {
        target: 'store.root',
        fix: 'Choose an empty directory or an existing healthy OpenSpec root.',
      }
    );
  }

  // Stores may be Git-backed, but creating one inside an implementation
  // repo is almost always an accidental nested-repo setup.
  await assertSetupPathIsNotNestedInGitRepo(storeRoot, {
    allowInsideGitRepository: input.allowInsideGitRepository,
  });

  let metadata: Awaited<ReturnType<typeof readStoreMetadataForOperation>> = null;
  let backend: StoreGitBackendConfig | undefined;

  if (kind === 'directory') {
    metadata = await readStoreMetadataForOperation(storeRoot);

    if (metadata) {
      if (metadata.id !== id) {
        throw new StoreError(
          `Store metadata id '${metadata.id}' does not match requested id '${id}'.`,
          'store_metadata_id_mismatch',
          {
            target: 'store.metadata',
            fix: `Use id '${metadata.id}' or choose a different setup path.`,
          }
        );
      }
      if (input.remote !== undefined) {
        // Silent acceptance is the forbidden outcome: the identity file
        // already exists, so --remote cannot reach the committed shape.
        throw remoteRequiresHandEditError(id, storeRoot);
      }
    } else {
      const openspecRoot = await inspectOpenSpecRoot(storeRoot);
      const safeFreshDirectory = await isDirectoryEmpty(storeRoot) || await isGitOnlyDirectory(storeRoot);
      if (!openspecRoot.healthy && !safeFreshDirectory) {
        throw new StoreError(
          'Store setup does not support initializing a non-empty folder that is not a healthy OpenSpec root.',
          'store_setup_non_empty_directory',
          {
            target: 'store.root',
            fix: 'Choose an empty folder, a Git-only folder, or an existing healthy OpenSpec root.',
          }
        );
      }
    }

    backend = await resolveBackendWithObservedOrigin(storeRoot);
  }

  const registry = await readStoreRegistryState();
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
  prepared: PreparedStoreSetup,
  initGit?: boolean
): boolean {
  return initGit ?? !isRegisteredAtPath(prepared.registry, prepared.id, prepared.root);
}

export async function prepareStoreSetup(
  input: Pick<SetupStoreInput, 'id' | 'path' | 'allowInsideGitRepository' | 'remote'>
): Promise<PreparedStoreSetup> {
  const plan = await prepareSetupPlan(input);

  return {
    id: plan.id,
    root: plan.storeRoot,
    rootKind: plan.kind,
    registry: plan.registry,
    ...(plan.backend ? { backend: plan.backend } : {}),
    ...(input.remote !== undefined ? { remote: input.remote } : {}),
  };
}

export async function setupPreparedStore(
  prepared: PreparedStoreSetup,
  input: Pick<SetupStoreInput, 'initGit'> = {}
): Promise<StoreMutationResult> {
  const plan: StoreSetupPlan = {
    id: prepared.id,
    storeRoot: prepared.root,
    kind: prepared.rootKind,
    registry: prepared.registry,
    ...(prepared.backend ? { backend: prepared.backend } : {}),
  };
  const { id, storeRoot, kind, registry } = plan;
  let { backend } = plan;

  // The prepare/execute split can span an unbounded interactive
  // confirmation. Re-assert the prepare-time directory facts: if the
  // path appeared in the gap, the plan (and its rollback policy) no
  // longer describes reality - refuse and let a rerun re-prepare.
  if (kind === 'missing' && (await fs.access(storeRoot).then(() => true, () => false))) {
    throw new StoreError(
      `The path ${storeRoot} was created while setup was waiting for confirmation.`,
      'store_setup_path_changed',
      {
        target: 'store.root',
        fix: 'Rerun openspec store setup to re-evaluate the directory.',
      }
    );
  }

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
    backend ??= await resolveBackendWithObservedOrigin(storeRoot);
    assertNoRegisteredStoreConflict(registry, id, backend);

    // The identity file is written before the initial commit so clones carry
    // it; without it, register falls back to the conversion prompt.
    const existingMetadata = await readStoreMetadataForOperation(storeRoot);
    if (existingMetadata && prepared.remote !== undefined) {
      // Re-assert the prepare-phase refusal: metadata that materialized
      // between prepare and execute must not silently swallow --remote.
      throw remoteRequiresHandEditError(id, storeRoot);
    }
    if (!existingMetadata) {
      const metadataDir = getStoreMetadataDir(storeRoot);
      const metadataDirMissing = (await pathKind(metadataDir)) === 'missing';
      await writeStoreMetadataState(storeRoot, {
        version: 1,
        id,
        ...(prepared.remote !== undefined ? { remote: prepared.remote } : {}),
      });
      if (metadataDirMissing) {
        createdPaths.push(createdPath('.openspec-store/', metadataDir, 'directory'));
      }
      createdPaths.push(createdPath(
        '.openspec-store/store.yaml',
        getStoreMetadataPath(storeRoot),
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
      ? [OPENSPEC_ROOT_DIR, STORE_METADATA_DIR_NAME]
      : createdPaths
          .filter((entry) => entry.kind === 'file')
          .map((entry) => entry.relativePath);
    committed = gitEnabled && isRepository
      ? await commitStoreFiles(storeRoot, id, commitPathspecs)
      : false;

    // Identity creation is setup's job (done above, before the commit);
    // registration only verifies it and records the machine-local entry.
    const registered = await commitStoreRegistration({
      id,
      backend,
      writeMetadataIfMissing: false,
    });
    const diagnostics = registered.alreadyRegistered && createdFiles.length === 0
      ? [alreadyRegisteredDiagnostic(id)]
      : [];

    const canonical = prepared.remote ?? existingMetadata?.remote;
    return mutationPayload(id, registered.storeRoot, {
      isRepository,
      initialized: gitInitialized,
      committed,
    }, createdFiles, {
      registered: registered.registryUpdated,
      alreadyRegistered: registered.alreadyRegistered,
    }, diagnostics, {
      ...(canonical ? { canonical } : {}),
      ...(backend.remote ? { observed: backend.remote } : {}),
    });
  } catch (error) {
    // Once the initial commit landed in a (possibly user-owned) repository,
    // the files are durable state; deleting them would orphan the commit.
    // The only remaining failure is the registry write, which is retryable.
    if (committed) {
      throw error;
    }

    if (createdPaths.length > 0) {
      await rollbackCreatedPaths(createdPaths);
    }
    // G14: a half-made .git is never durable state pre-commit - clean it
    // up regardless of whether the ledger recorded other creations, or a
    // rerun registers a commitless store.
    if (gitInitialized) {
      await fs.rm(path.join(storeRoot, '.git'), { recursive: true, force: true }).catch(() => undefined);
    }
    if (kind === 'missing') {
      // Non-recursive both ways: never delete content this operation did
      // not create (the execute-time re-check guarantees kind is accurate,
      // but rmdir is the belt to that suspender).
      await fs.rmdir(storeRoot).catch(() => undefined);
    }

    throw error;
  }
}

export async function setupStore(
  input: SetupStoreInput
): Promise<StoreMutationResult> {
  return setupPreparedStore(await prepareStoreSetup(input), {
    initGit: input.initGit,
  });
}

export async function registerExistingStore(
  input: RegisterExistingStoreInput
): Promise<StoreMutationResult> {
  const storeRoot = resolveRegisterRoot(input.path);
  const kind = await pathKind(storeRoot);

  if (kind === 'missing') {
    throw new StoreError(
      `Store path does not exist: ${storeRoot}`,
      'store_path_missing',
      {
        target: 'store.root',
        fix: 'Clone or create the store folder before registering it.',
      }
    );
  }

  if (kind !== 'directory') {
    throw new StoreError(
      `Store path is not a directory: ${storeRoot}`,
      'store_path_not_directory',
      {
        target: 'store.root',
        fix: 'Pass an existing store directory.',
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

    throw new StoreError(
      `Store register requires an existing healthy OpenSpec root. ${problems}${emptyCloneHint}`,
      'store_register_root_unhealthy',
      {
        target: 'openspec.root',
        fix: isEmptyCloneSuspect
          ? 'If this is a store clone: commit and push the origin store, pull it into this clone, then rerun register.'
          : 'Run openspec store setup for a new store, or point register at a checkout whose openspec/ files are present.',
      }
    );
  }

  const metadata = await readStoreMetadataForOperation(storeRoot);
  const explicitId = input.id !== undefined ? validateStoreId(input.id) : undefined;

  if (metadata && explicitId !== undefined && metadata.id !== explicitId) {
    // The fix must account for whether the metadata id is already registered,
    // so following it never lands on the already-registered error.
    const currentRegistry = await readStoreRegistryState();
    const registeredElsewhere =
      currentRegistry?.stores?.[metadata.id] !== undefined &&
      !isRegisteredAtPath(currentRegistry, metadata.id, storeRoot);

    throw new StoreError(
      `Store metadata id '${metadata.id}' does not match --id '${explicitId}'. The id comes from the store's committed .openspec-store/store.yaml.`,
      'store_metadata_id_mismatch',
      {
        target: 'store.id',
        fix: registeredElsewhere
          ? `One checkout per store id is supported, and '${metadata.id}' is already registered. Run openspec store unregister ${metadata.id} first to register this checkout instead.`
          : `Use --id ${metadata.id} or register a different folder.`,
      }
    );
  }

  const id = metadata?.id ?? explicitId ?? inferStoreIdFromPath(storeRoot);
  if (!metadata && !input.allowCreateIdentity) {
    throw new StoreError(
      `Turn this OpenSpec root into store '${id}'?`,
      'store_register_identity_confirmation_required',
      {
        target: 'store.metadata',
        fix: `Run interactively or pass --yes to create ${getStoreMetadataPath(storeRoot)}.`,
      }
    );
  }

  const backend = await resolveBackendWithObservedOrigin(storeRoot);
  const registry = await readStoreRegistryState();
  assertNoRegisteredStoreConflict(registry, id, backend);
  const createdFiles: string[] = [];
  const isRepository = await isGitRepositoryAtRoot(storeRoot);

  const registered = await commitStoreRegistration({
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
  }, diagnostics, {
    ...(metadata?.remote ? { canonical: metadata.remote } : {}),
    ...(backend.remote ? { observed: backend.remote } : {}),
  });
}

function cleanupStoreOutput(id: string, storeRoot: string): StoreInfo {
  return {
    id,
    root: storeRoot,
    metadataPath: getStoreMetadataPath(storeRoot),
  };
}

export async function prepareStoreCleanup(
  input: CleanupStoreInput
): Promise<PreparedStoreCleanup> {
  const id = validateStoreId(input.id);
  const entry = await getRegisteredStore({
    id,
    globalDataDir: input.globalDataDir,
  });

  return {
    ...cleanupStoreOutput(entry.id, entry.storeRoot),
    backend: entry.backend,
    ...(input.globalDataDir ? { globalDataDir: input.globalDataDir } : {}),
  };
}

export async function unregisterStore(
  input: CleanupStoreInput
): Promise<StoreCleanupResult> {
  const target = await prepareStoreCleanup(input);
  const removed = await unregisterStoreRegistration({
    id: target.id,
    expectedBackend: target.backend,
    globalDataDir: target.globalDataDir,
  });

  return {
    store: cleanupStoreOutput(removed.id, removed.storeRoot),
    registryCommit: {
      path: getStoreRegistryPath({ globalDataDir: target.globalDataDir }),
      removed: true,
    },
    files: {
      deleted: false,
      leftOnDisk: removed.storeRoot,
    },
    diagnostics: [],
  };
}

async function assertSafeToDeleteStoreRoot(storeRoot: string, id: string): Promise<{
  exists: boolean;
}> {
  const kind = await pathKind(storeRoot);

  if (kind === 'missing') {
    return { exists: false };
  }

  if (kind !== 'directory') {
    throw new StoreError(
      `Store path is not a directory: ${storeRoot}`,
      'store_remove_path_not_directory',
      {
        target: 'store.root',
        fix: 'Run "openspec store unregister <id>" if you only want to forget this local registry entry.',
      }
    );
  }

  const metadata = await readStoreMetadataForOperation(storeRoot);
  if (!metadata) {
    throw new StoreError(
      'Store remove refuses to delete a folder without store metadata.',
      'store_remove_metadata_missing',
      {
        target: 'store.metadata',
        fix: 'Run "openspec store unregister <id>" if you only want to forget this local registry entry.',
      }
    );
  }

  if (metadata.id !== id) {
    throw new StoreError(
      `Store metadata id '${metadata.id}' does not match requested id '${id}'.`,
      'store_metadata_id_mismatch',
      {
        target: 'store.metadata',
        fix: 'Repair the registry or run store unregister instead of deleting this folder.',
      }
    );
  }

  return { exists: true };
}

export async function removeStore(
  target: PreparedStoreCleanup
): Promise<StoreCleanupResult> {
  const id = validateStoreId(target.id);
  const diagnostics: StoreDiagnostic[] = [];
  let deleted = false;

  // Order matters: the registry entry goes first, the files second. A
  // failed file deletion leaves recoverable orphan files; the reverse
  // order would leave a phantom registration pointing at nothing.
  let rootMissing = false;
  const removed = await unregisterStoreRegistration({
    id,
    expectedBackend: target.backend,
    globalDataDir: target.globalDataDir,
    beforeCommit: async (entry) => {
      const safeTarget = await assertSafeToDeleteStoreRoot(entry.storeRoot, id);
      rootMissing = !safeTarget.exists;
    },
  });

  if (rootMissing) {
    diagnostics.push(makeStoreDiagnostic(
      'warning',
      'store_root_missing',
      'Store files were already missing.',
      {
        target: 'store.root',
      }
    ));
  } else {
    try {
      await fs.rm(removed.storeRoot, { recursive: true, force: true });
      deleted = true;
    } catch (error) {
      diagnostics.push(makeStoreDiagnostic(
        'warning',
        'store_files_left_on_disk',
        `The registration was removed, but deleting ${removed.storeRoot} failed (${(error as Error).message}).`,
        {
          target: 'store.root',
          fix: `Delete the folder manually: ${removed.storeRoot}`,
        }
      ));
    }
  }

  return {
    store: cleanupStoreOutput(removed.id, removed.storeRoot),
    registryCommit: {
      path: getStoreRegistryPath({ globalDataDir: target.globalDataDir }),
      removed: true,
    },
    files: {
      deleted,
      ...(deleted ? { deletedPath: removed.storeRoot } : {}),
    },
    diagnostics,
  };
}

export async function listStores(): Promise<StoreListResult> {
  const entries = await listRegisteredStores();

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
): StoreDiagnostic {
  if (error instanceof StoreError) {
    return error.diagnostic;
  }

  return makeStoreDiagnostic(
    'error',
    code,
    error instanceof Error ? error.message : String(error),
    {
      target,
      ...(fix ? { fix } : {}),
    }
  );
}

async function inspectStore(entry: {
  id: string;
  backend: StoreGitBackendConfig;
}): Promise<StoreInspection> {
  const root = getStoreRootForBackend(entry.backend);
  const metadataPath = getStoreMetadataPath(root);
  const diagnostics: StoreDiagnostic[] = [];
  const kind = await pathKind(root);
  let metadata: StoreInspection['metadata'] = {
    present: null,
    valid: null,
    remote: null,
  };
  let git: StoreInspection['git'] = {
    isRepository: null,
    hasCommits: null,
    hasUncommittedChanges: null,
    hasRemote: null,
    originUrl: null,
  };
  let openspecRoot: OpenSpecRootInspection = await inspectOpenSpecRoot(root);

  if (kind === 'missing') {
    diagnostics.push(makeStoreDiagnostic(
      'error',
      'store_root_missing',
      'Store location does not exist.',
      {
        target: 'store.root',
        fix: `Run openspec store register /path/to/${entry.id} --id ${entry.id}.`,
      }
    ));
  } else if (kind !== 'directory') {
    diagnostics.push(makeStoreDiagnostic(
      'error',
      'store_root_not_directory',
      'Store location is not a directory.',
      {
        target: 'store.root',
        fix: 'Register a directory path for this store.',
      }
    ));
  } else {
    openspecRoot = await inspectOpenSpecRoot(root);
    diagnostics.push(...openspecRoot.diagnostics);

    try {
      const parsed = await readOptionalStoreMetadataState(root);
      if (!parsed) {
        metadata = { present: false, valid: false, remote: null };
        diagnostics.push(makeStoreDiagnostic(
          'error',
          'store_metadata_missing',
          'Store metadata is missing.',
          {
            target: 'store.metadata',
            fix: `Create ${metadataPath} or rerun store register.`,
          }
        ));
      } else if (parsed.id !== entry.id) {
        metadata = { present: true, valid: false, id: parsed.id, remote: null };
        diagnostics.push(makeStoreDiagnostic(
          'error',
          'store_metadata_id_mismatch',
          `Store metadata id '${parsed.id}' does not match registry id '${entry.id}'.`,
          {
            target: 'store.metadata',
            fix: 'Repair the local registry or store metadata so the ids match.',
          }
        ));
      } else {
        metadata = {
          present: true,
          valid: true,
          id: parsed.id,
          remote: parsed.remote ?? null,
        };
      }
    } catch (error) {
      metadata = { present: true, valid: false, remote: null };
      diagnostics.push(doctorStatusForError(
        error,
        'store_metadata_invalid',
        'store.metadata',
        `Repair ${metadataPath}.`
      ));
    }

    const isRepository = await isGitRepositoryAtRoot(root);
    git = {
      isRepository,
      hasCommits: null,
      hasUncommittedChanges: null,
      hasRemote: null,
      originUrl: null,
    };

    // Read-only Git facts; doctor reports and never repairs.
    if (isRepository) {
      git.hasCommits = await gitHasCommits(root);
      git.hasUncommittedChanges = await gitHasUncommittedChanges(root);
      git.hasRemote = await gitHasRemote(root);
      git.originUrl = await gitOriginUrl(root);

      if (git.hasCommits === false) {
        diagnostics.push(makeStoreDiagnostic(
          'warning',
          'store_git_no_commits',
          'Git repository has no commits yet; clones of this store will be empty until an initial commit exists.',
          {
            target: 'store.git',
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
          diagnostics.push(makeStoreDiagnostic(
            'warning',
            'store_clone_fragile_directories',
            `These directories contain no tracked files and will be lost in clones: ${fragileDirs.join(', ')}.`,
            {
              target: 'store.git',
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

export async function doctorStores(id?: string): Promise<StoreDoctorResult> {
  const selectedId = id !== undefined ? validateStoreId(id) : undefined;
  const registry = await readStoreRegistryState();

  if (!registry) {
    if (selectedId !== undefined) {
      throw new StoreError(`Unknown store '${selectedId}'.`, 'store_not_found', {
        target: 'store.id',
        fix: 'Run openspec store list to see registered stores.',
      });
    }

    return { stores: [], diagnostics: [] };
  }

  const entries = listStoreRegistryEntries(registry);
  const selected = selectedId
    ? entries.filter((entry) => entry.id === selectedId)
    : entries;

  if (selectedId && selected.length === 0) {
    throw new StoreError(`Unknown store '${selectedId}'.`, 'store_not_found', {
      target: 'store.id',
      fix: 'Run openspec store list to see registered stores.',
    });
  }

  return {
    stores: await Promise.all(selected.map(inspectStore)),
    diagnostics: [],
  };
}

export function normalizeStorePathForComparison(targetPath: string): string {
  return FileSystemUtils.canonicalizeExistingPath(targetPath);
}
