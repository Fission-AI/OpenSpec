/**
 * Shared OpenSpec root resolution for normal commands.
 *
 * Normal commands (`new change`, `status`, `instructions`, `list`, `show`,
 * `validate`, `archive`) resolve one OpenSpec root through this module:
 *
 * - `--store <id>` selects a registered store's root.
 * - Without `--store`, the nearest ancestor containing `openspec/` wins.
 *   Leftover workspace view state is never considered a root here.
 * - With no nearest root, a global `defaultStore` (if set) is the last
 *   machine-level fallback before the selection hint error.
 * - With no nearest root and no default, registered stores produce a
 *   selection hint error; otherwise commands may treat the current
 *   directory as an implicit root.
 *
 * Diagnostic codes reuse the store taxonomy where an error passes
 * through unchanged (`invalid_store_id`, metadata parse failures);
 * resolver-specific failures use the normal-command codes below
 * (`unknown_store`, `no_registered_stores`, `store_identity_mismatch`,
 * `unhealthy_store_root`, `store_path_not_supported`,
 * `invalid_store_pointer`, `no_root_with_registered_stores`,
 * `no_openspec_root`).
 */

import * as fs from 'node:fs';
import * as fsPromises from 'node:fs/promises';
import * as path from 'node:path';

import { StoreError } from './store/errors.js';
import {
  getStoreMetadataPath,
  listStoreRegistryEntries,
  readStoreRegistryState,
  readOptionalStoreMetadataState,
  validateStoreId,
  findProjectRegistryDir,
  findProjectStoreById,
  listProjectStoreRegistryEntries,
  walkProjectStoreRegistries,
} from './store/foundation.js';
import { getStoreRootForBackend } from './store/registry.js';
import { inspectOpenSpecRoot } from './openspec-root.js';
import { findRepoPlanningRootSync, type PlanningHome } from './planning-home.js';
import { classifyOpenSpecDir, storePointerProblem } from './project-config.js';
import { getGlobalConfig } from './global-config.js';
import { FileSystemUtils } from '../utils/file-system.js';

async function pathKind(targetPath: string): Promise<'missing' | 'directory' | 'file' | 'other'> {
  try {
    const stat = await fsPromises.stat(targetPath);
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

export type OpenSpecRootSource =
  | 'store'
  | 'project_store'
  | 'declared'
  | 'global_default'
  | 'nearest'
  | 'implicit';

export interface StoreSelectorOptions {
  store?: string;
  storePath?: string;
}

export interface ResolveOpenSpecRootOptions extends StoreSelectorOptions {
  startPath?: string;
  allowImplicitRoot?: boolean;
  globalDataDir?: string;
}

export interface ResolvedOpenSpecRoot {
  path: string;
  changesDir: string;
  specsDir: string;
  archiveDir: string;
  defaultSchema: 'spec-driven';
  source: OpenSpecRootSource;
  storeId?: string;
}

export interface RootSelectionDiagnostic {
  severity: 'error';
  code: string;
  message: string;
  target?: string;
  fix?: string;
}

export class RootSelectionError extends Error {
  readonly diagnostic: RootSelectionDiagnostic;

  constructor(
    message: string,
    code: string,
    options: { target?: string; fix?: string } = {}
  ) {
    super(message);
    this.name = 'RootSelectionError';
    this.diagnostic = {
      severity: 'error',
      code,
      message,
      ...options,
    };
  }
}

export function isRootSelectionError(error: unknown): error is RootSelectionError {
  return error instanceof RootSelectionError;
}

function fromStoreError(error: unknown): never {
  if (error instanceof StoreError) {
    throw new RootSelectionError(error.message, error.diagnostic.code, {
      ...(error.diagnostic.target ? { target: error.diagnostic.target } : {}),
      ...(error.diagnostic.fix ? { fix: error.diagnostic.fix } : {}),
    });
  }

  throw error;
}

function doctorFix(id: string): string {
  return `Run openspec store doctor ${id} to inspect it.`;
}

function makeRoot(
  rootPath: string,
  source: OpenSpecRootSource,
  storeId?: string
): ResolvedOpenSpecRoot {
  return {
    path: rootPath,
    changesDir: path.join(rootPath, 'openspec', 'changes'),
    specsDir: path.join(rootPath, 'openspec', 'specs'),
    archiveDir: path.join(rootPath, 'openspec', 'changes', 'archive'),
    defaultSchema: 'spec-driven',
    source,
    ...(storeId ? { storeId } : {}),
  };
}

function canonicalDirectory(startPath: string): string {
  const resolved = path.resolve(startPath);

  try {
    const stats = fs.statSync(resolved);
    const dir = stats.isDirectory() ? resolved : path.dirname(resolved);
    return FileSystemUtils.canonicalizeExistingPath(dir);
  } catch {
    return resolved;
  }
}

async function resolveStoreRoot(
  id: string,
  globalDataDir?: string,
  source: OpenSpecRootSource = 'store'
): Promise<ResolvedOpenSpecRoot> {
  try {
    validateStoreId(id);
  } catch (error) {
    fromStoreError(error);
  }

  let registry;
  try {
    registry = await readStoreRegistryState(globalDataDir ? { globalDataDir } : {});
  } catch (error) {
    fromStoreError(error);
  }
  const entries = registry ? listStoreRegistryEntries(registry) : [];
  const entry = entries.find((candidate) => candidate.id === id);

  if (!entry) {
    if (entries.length === 0) {
      throw new RootSelectionError(
        `Unknown store '${id}'. No stores are registered.`,
        'no_registered_stores',
        {
          target: 'store.id',
          fix: `Run openspec store setup ${id} or openspec store register <path> first.`,
        }
      );
    }

    throw new RootSelectionError(
      `Unknown store '${id}'. Registered stores: ${entries
        .map((candidate) => candidate.id)
        .join(', ')}.`,
      'unknown_store',
      {
        target: 'store.id',
        fix: 'Pass a registered store id, or run openspec store list.',
      }
    );
  }

  const storeRoot = getStoreRootForBackend(entry.backend);
  const inspection = await inspectRegisteredStore(id, storeRoot);
  return resolveFromInspection(id, storeRoot, inspection, source);
}

/**
 * Maps a store inspection result to a resolved root or throws.
 * Shared between project-scoped and global resolution paths.
 */
function resolveFromInspection(
  id: string,
  storeRoot: string,
  inspection: RegisteredStoreInspection,
  source: OpenSpecRootSource
): ResolvedOpenSpecRoot {
  switch (inspection.kind) {
    case 'ok':
      return makeRoot(inspection.canonicalRoot, source, id);
    case 'metadata_error':
      return fromStoreError(inspection.error);
    case 'metadata_missing':
      throw new RootSelectionError(
        `Store '${id}' is missing identity metadata at ${inspection.metadataPath}. ${doctorFix(id)}`,
        'store_identity_mismatch',
        { target: 'store.metadata', fix: doctorFix(id) }
      );
    case 'metadata_id_mismatch':
      throw new RootSelectionError(
        `Store '${id}' metadata id '${inspection.actualId}' does not match its registered id. ${doctorFix(id)}`,
        'store_identity_mismatch',
        { target: 'store.metadata', fix: doctorFix(id) }
      );
    case 'unhealthy_root':
      throw new RootSelectionError(
        `Store '${id}' does not have a healthy OpenSpec root at ${storeRoot}: ${inspection.problems} ${doctorFix(id)}`,
        'unhealthy_store_root',
        { target: 'openspec.root', fix: doctorFix(id) }
      );
  }
}

/**
 * Resolves a store ID by walking up project-scoped registries (D4 Variant C),
 * then falling back to the global registry.
 * When a store ID is found in a project-scoped registry, `source: 'project_store'`
 * is used. When found only in the global registry, the caller-provided `source`
 * is used (defaults to `'store'`).
 */
async function resolveMergedStoreRoot(
  id: string,
  startPath: string,
  globalDataDir?: string,
  source: OpenSpecRootSource = 'store'
): Promise<ResolvedOpenSpecRoot> {
  try {
    validateStoreId(id);
  } catch (error) {
    fromStoreError(error);
  }

  // Walk up checking each .openspec-store/registry.yaml for the ID (D4 Variant C).
  const projectLookup = await findProjectStoreById(id, startPath);
  if (projectLookup.found) {
    const kind = await pathKind(projectLookup.found.storeRoot);
    if (kind === 'missing') {
      throw new RootSelectionError(`Store '${id}' folder is missing: ${projectLookup.found.storeRoot}`, 'store_root_missing');
    }
    const inspection = await inspectRegisteredStore(id, projectLookup.found.storeRoot);
    return resolveFromInspection(id, projectLookup.found.storeRoot, inspection, 'project_store');
  }

  // Fall back to global registry.
  let globalRegistry;
  try {
    globalRegistry = await readStoreRegistryState(globalDataDir ? { globalDataDir } : {});
  } catch (error) {
    fromStoreError(error);
  }
  const globalEntries = globalRegistry ? listStoreRegistryEntries(globalRegistry) : [];
  const globalEntry = globalEntries.find((candidate) => candidate.id === id);

  if (globalEntry) {
    const storeRoot = getStoreRootForBackend(globalEntry.backend);
    const kind = await pathKind(storeRoot);
    if (kind === 'missing') {
      throw new RootSelectionError(`Store '${id}' folder is missing: ${storeRoot}`, 'store_root_missing');
    }
    const inspection = await inspectRegisteredStore(id, storeRoot);
    return resolveFromInspection(id, storeRoot, inspection, source);
  }

  // Not found in either registry. "No stores are registered" is only true
  // when no project-scoped registry had entries either.
  if (globalEntries.length === 0) {
    if (!projectLookup.projectStoresExist) {
      throw new RootSelectionError(
        `Unknown store '${id}'. No stores are registered.`,
        'no_registered_stores',
        {
          target: 'store.id',
          fix: `Run openspec store setup ${id} or openspec store register <path> first.`,
        }
      );
    }

    throw new RootSelectionError(
      `Unknown store '${id}'. No project-scoped or global registry registers it.`,
      'unknown_store',
      {
        target: 'store.id',
        fix: 'Pass a registered store id, or run openspec store list.',
      }
    );
  }

  throw new RootSelectionError(
    `Unknown store '${id}'. Registered stores: ${globalEntries.map((e) => e.id).join(', ')}.`,
    'unknown_store',
    {
      target: 'store.id',
      fix: 'Pass a registered store id, or run openspec store list.',
    }
  );
}

/**
 * The metadata-identity and root-health stages of registered-store
 * resolution, as a non-throwing result. `resolveStoreRoot` maps each
 * failure kind to its established error; the reference index assembler
 * maps them to warnings. One shared inspection path — never fork it.
 */
export type RegisteredStoreInspection =
  | { kind: 'ok'; canonicalRoot: string }
  | { kind: 'metadata_error'; error: unknown }
  | { kind: 'metadata_missing'; metadataPath: string }
  | { kind: 'metadata_id_mismatch'; actualId: string }
  | { kind: 'unhealthy_root'; problems: string };

export async function inspectRegisteredStore(
  id: string,
  storeRoot: string
): Promise<RegisteredStoreInspection> {
  // Identity (metadata) failures win before root-health diagnostics.
  let metadata;
  try {
    metadata = await readOptionalStoreMetadataState(storeRoot);
  } catch (error) {
    return { kind: 'metadata_error', error };
  }

  if (!metadata) {
    return { kind: 'metadata_missing', metadataPath: getStoreMetadataPath(storeRoot) };
  }

  if (metadata.id !== id) {
    return { kind: 'metadata_id_mismatch', actualId: metadata.id };
  }

  const inspection = await inspectOpenSpecRoot(storeRoot);
  if (!inspection.healthy) {
    const problems =
      inspection.diagnostics.map((diagnostic) => diagnostic.message).join(' ') ||
      'OpenSpec root is missing or incomplete.';
    return { kind: 'unhealthy_root', problems };
  }

  return { kind: 'ok', canonicalRoot: FileSystemUtils.canonicalizeExistingPath(storeRoot) };
}

/**
 * Classifies the nearest `openspec/` directory (slice 3.2): a planning
 * shape (specs/ or changes/ directories) is a real root and wins —
 * fallback never override. A config-only directory with a `store:`
 * pointer resolves the declared store; without one, it stays a root
 * (today's behavior for freshly initialized minimal roots).
 */
/**
 * The nearest-root walk, qualified: an `openspec/` DIRECTORY alone is
 * not a root — it must carry a planning shape or a config file.
 * Without this, the recommended `~/openspec/<id>` store layout would
 * make $HOME a phantom root that captures every command under the
 * home tree.
 */
function findQualifyingRootSync(startPath: string): string | null {
  let candidate = findRepoPlanningRootSync(startPath);
  while (candidate) {
    const { hasPlanningShape, pointer } = classifyOpenSpecDir(candidate);
    if (hasPlanningShape || pointer.filePath) {
      return candidate;
    }
    const parent = path.dirname(candidate);
    if (parent === candidate) {
      return null;
    }
    candidate = findRepoPlanningRootSync(parent);
  }
  return null;
}

async function resolveNearestOrDeclaredRoot(
  nearestRoot: string,
  globalDataDir?: string
): Promise<ResolvedOpenSpecRoot> {
  const { hasPlanningShape, pointer } = classifyOpenSpecDir(nearestRoot);

  if (hasPlanningShape) {
    if (pointer.value !== undefined) {
      console.error(
        `Warning: ${pointer.filePath} declares store '${pointer.value}', but this directory is a real OpenSpec root; the declaration is ignored.`
      );
    }
    return makeRoot(nearestRoot, 'nearest');
  }

  if (pointer.malformed) {
    const problem = storePointerProblem(pointer.malformed);
    throw new RootSelectionError(
      `Invalid store declaration in ${pointer.filePath}: ${problem}.`,
      'invalid_store_pointer',
      {
        target: 'store.pointer',
        fix:
          pointer.malformed === 'unparseable'
            ? `Fix the YAML syntax in ${pointer.filePath}.`
            : `Edit ${pointer.filePath} so the store key is a registered store id, or remove it.`,
      }
    );
  }

  if (pointer.value === undefined) {
    return makeRoot(nearestRoot, 'nearest');
  }

  try {
    return await resolveMergedStoreRoot(pointer.value, nearestRoot, globalDataDir, 'declared');
  } catch (error) {
    if (error instanceof RootSelectionError) {
      // Rewrap with the declaration origin. The unknown-store fix is
      // reshaped for the actual mistake: the user declared a pointer,
      // they did not pass --store.
      const declarationFix =
        error.diagnostic.code === 'unknown_store'
          ? `Register the store (openspec store register <path> --id ${pointer.value}) or edit ${pointer.filePath} to name a registered store.`
          : error.diagnostic.fix;
      throw new RootSelectionError(
        `Declared in ${pointer.filePath}: ${error.message}`,
        error.diagnostic.code,
        {
          ...(error.diagnostic.target ? { target: error.diagnostic.target } : {}),
          ...(declarationFix ? { fix: declarationFix } : {}),
        }
      );
    }
    throw error;
  }
}

/**
 * The machine-level fallback: the global `defaultStore` resolved as a root,
 * with its own provenance (`global_default`) so JSON surfaces can tell a
 * machine-wide default from a repo's `store:` pointer. Mirrors the
 * declared-pointer catch — a stale or unregistered id degrades to the
 * underlying error, reshaped to point at clearing the global default
 * rather than passing --store.
 */
async function resolveDefaultStoreRoot(
  id: string,
  globalDataDir?: string
): Promise<ResolvedOpenSpecRoot> {
  try {
    return await resolveStoreRoot(id, globalDataDir, 'global_default');
  } catch (error) {
    if (error instanceof RootSelectionError) {
      const staleFix =
        error.diagnostic.code === 'unknown_store' ||
        error.diagnostic.code === 'no_registered_stores'
          ? `Register the store (openspec store register <path> --id ${id}) or clear the stale global default (openspec config unset defaultStore).`
          : error.diagnostic.fix;
      throw new RootSelectionError(
        `Global defaultStore '${id}': ${error.message}`,
        error.diagnostic.code,
        {
          ...(error.diagnostic.target ? { target: error.diagnostic.target } : {}),
          ...(staleFix ? { fix: staleFix } : {}),
        }
      );
    }
    throw error;
  }
}

export async function resolveOpenSpecRoot(
  options: ResolveOpenSpecRootOptions = {}
): Promise<ResolvedOpenSpecRoot> {
  if (options.storePath !== undefined) {
    throw new RootSelectionError(
      '--store-path is not supported. Register the path with openspec store register <path>, then select it with --store <id>.',
      'store_path_not_supported',
      {
        target: 'store.id',
        fix: 'openspec store register <path>, then rerun with --store <id>.',
      }
    );
  }

  if (options.store !== undefined) {
    const storeStartPath = options.startPath ?? process.cwd();
    return resolveMergedStoreRoot(options.store, storeStartPath, options.globalDataDir);
  }

  const startPath = options.startPath ?? process.cwd();
  const nearestRoot = findQualifyingRootSync(startPath);
  if (nearestRoot) {
    return resolveNearestOrDeclaredRoot(nearestRoot, options.globalDataDir);
  }

  // Project-scoped registry discovery: if a project-scoped registry exists
  // but no nearest root was found, try to resolve any store from the merged
  // registry before falling back to the global defaultStore.
  // When no registry is found, the chain continues to defaultStore.
  // The walk mirrors resolution semantics: malformed levels are skipped with
  // a warning, and the first store entry in document order is taken,
  // nearest registry first. If that entry's folder is missing or unhealthy,
  // the system reports an error rather than skipping to the next entry.
  const discoveryProjectRoot = findProjectRegistryDir(startPath);
  if (discoveryProjectRoot) {
    const levels = await walkProjectStoreRegistries(startPath);
    for (const level of levels) {
      const entries = listProjectStoreRegistryEntries(level.state, level.registryDir);
      if (entries.length > 0) {
        const entry = entries[0];
        const kind = await pathKind(entry.storeRoot);
        if (kind === 'missing') {
          throw new RootSelectionError(`Store '${entry.id}' folder is missing: ${entry.storeRoot}`, 'store_root_missing');
        }
        const inspection = await inspectRegisteredStore(entry.id, entry.storeRoot);
        return resolveFromInspection(entry.id, entry.storeRoot, inspection, 'project_store');
      }
    }
  }

  // Machine-level fallback: a global defaultStore is consulted only after
  // --store, the nearest local root, and project-level pointers have all
  // failed to resolve — it changes the failure path, never the precedence.
  const defaultStore = getGlobalConfig().defaultStore;
  if (defaultStore) {
    return resolveDefaultStoreRoot(defaultStore, options.globalDataDir);
  }

  let registry;
  try {
    registry = await readStoreRegistryState(
      options.globalDataDir ? { globalDataDir: options.globalDataDir } : {}
    );
  } catch (error) {
    fromStoreError(error);
  }
  const registeredIds = registry
    ? listStoreRegistryEntries(registry).map((entry) => entry.id)
    : [];

  if (registeredIds.length > 0) {
    throw new RootSelectionError(
      `No OpenSpec root found in the current directory or its ancestors. Registered stores: ${registeredIds.join(', ')}. Pass --store <id> to use one, or run openspec init to create a local root.`,
      'no_root_with_registered_stores',
      {
        target: 'openspec.root',
        fix: `Rerun with --store <id> (registered: ${registeredIds.join(', ')}) or run openspec init.`,
      }
    );
  }

  if (options.allowImplicitRoot === false) {
    throw new RootSelectionError(
      'No OpenSpec root found from the current directory.',
      'no_openspec_root',
      { target: 'openspec.root', fix: 'Run openspec init to create a root here.' }
    );
  }

  return makeRoot(canonicalDirectory(startPath), 'implicit');
}

// -----------------------------------------------------------------------------
// Output helpers
// -----------------------------------------------------------------------------

export interface RootOutput {
  path: string;
  source: OpenSpecRootSource;
  store_id?: string;
}

export function toRootOutput(root: ResolvedOpenSpecRoot): RootOutput {
  return {
    path: root.path,
    source: root.source,
    ...(root.storeId ? { store_id: root.storeId } : {}),
  };
}

/**
 * A store-selected root — explicit `--store`, a declared pointer, or the
 * global default. Cross-root behavior (absolute paths, --store hints,
 * suppressed noun-form suggestions) keys on this, never on `source` directly.
 */
export function isStoreSelectedRoot(
  root: ResolvedOpenSpecRoot
): root is ResolvedOpenSpecRoot & { storeId: string } {
  return root.storeId !== undefined;
}

/**
 * The project on the current path whose `store:` pointer names `storeId`,
 * as a canonical path (the root walk resolves aliases). Null when the
 * nearest root is a real planning root or points at a different store.
 */
export function findDeclaringProjectRoot(
  storeId: string,
  startPath: string = process.cwd()
): string | null {
  const nearestRoot = findQualifyingRootSync(startPath);
  if (!nearestRoot) {
    return null;
  }
  const { hasPlanningShape, pointer } = classifyOpenSpecDir(nearestRoot);
  if (hasPlanningShape || pointer.value !== storeId) {
    return null;
  }
  return nearestRoot;
}

/**
 * Human-mode verification signal for a selected store. Written to stderr so
 * raw-Markdown and agent-consumed stdout payloads stay clean.
 */
export function emitStoreRootBanner(root: ResolvedOpenSpecRoot): void {
  if (isStoreSelectedRoot(root)) {
    console.error(`Using OpenSpec root: ${root.storeId} (${root.path})`);
  }
}

/**
 * Keeps follow-up command hints inside the selected store: a hint a user can
 * paste verbatim must carry `--store <id>` when a store was selected.
 */
export function withStoreFlag(root: ResolvedOpenSpecRoot, command: string): string {
  return isStoreSelectedRoot(root)
    ? `${command} --store ${root.storeId}`
    : command;
}

/**
 * Compatibility bridge for workflow code that still expects a PlanningHome.
 * The planning home is always repo-shaped.
 */
export function toPlanningHome(root: ResolvedOpenSpecRoot): PlanningHome {
  return {
    kind: 'repo',
    root: root.path,
    changesDir: root.changesDir,
    defaultSchema: root.defaultSchema,
  };
}

/**
 * CLI adapter shared by the supported commands. In JSON mode a resolution
 * failure is reported as a machine-readable payload on stdout (no human prose
 * or blank lines) with a non-zero exit code; the caller must return when this
 * resolves to null. In human mode the error propagates to the command's
 * standard error handling so message text and exit behavior stay consistent.
 */
export async function resolveRootForCommand(
  selector: StoreSelectorOptions,
  output: {
    json?: boolean;
    failurePayload?: Record<string, unknown>;
    /** Commands that require an existing root set this to false. */
    allowImplicitRoot?: boolean;
  } = {}
): Promise<ResolvedOpenSpecRoot | null> {
  try {
    const root = await resolveOpenSpecRoot({
      ...(selector.store !== undefined ? { store: selector.store } : {}),
      ...(selector.storePath !== undefined ? { storePath: selector.storePath } : {}),
      ...(output.allowImplicitRoot !== undefined
        ? { allowImplicitRoot: output.allowImplicitRoot }
        : {}),
    });

    // Emitted at resolution time so the banner survives command failures
    // that happen after the root was successfully selected.
    if (!output.json) {
      emitStoreRootBanner(root);
    }

    return root;
  } catch (error) {
    if (output.json && isRootSelectionError(error)) {
      console.log(
        JSON.stringify(
          { ...(output.failurePayload ?? {}), status: [error.diagnostic] },
          null,
          2
        )
      );
      process.exitCode = 1;
      return null;
    }

    throw error;
  }
}
