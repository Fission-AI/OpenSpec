/**
 * Shared OpenSpec root resolution for normal commands.
 *
 * Normal commands (`new change`, `status`, `instructions`, `list`, `show`,
 * `validate`, `archive`) resolve one OpenSpec root through this module:
 *
 * - `--store <id>` selects a registered context store's root.
 * - Without `--store`, the nearest ancestor containing `openspec/` wins.
 *   Leftover workspace view state is never considered a root here.
 * - With no nearest root, registered stores produce a selection hint error;
 *   otherwise commands may treat the current directory as an implicit root.
 *
 * Diagnostic codes reuse the context-store taxonomy where an error passes
 * through unchanged (`invalid_context_store_id`, metadata parse failures);
 * resolver-specific failures use the normal-command codes below
 * (`unknown_store`, `no_registered_stores`, `store_identity_mismatch`,
 * `unhealthy_store_root`, `store_path_not_supported`,
 * `no_root_with_registered_stores`, `no_openspec_root`).
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

import { ContextStoreError } from './context-store/errors.js';
import {
  getContextStoreMetadataPath,
  listContextStoreRegistryEntries,
  readContextStoreRegistryState,
  readOptionalContextStoreMetadataState,
  validateContextStoreId,
} from './context-store/foundation.js';
import { getStoreRootForBackend } from './context-store/registry.js';
import { inspectOpenSpecRoot } from './openspec-root.js';
import { findRepoPlanningRootSync, type PlanningHome } from './planning-home.js';
import { FileSystemUtils } from '../utils/file-system.js';

export type OpenSpecRootSource = 'store' | 'nearest' | 'implicit';

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

function fromContextStoreError(error: unknown): never {
  if (error instanceof ContextStoreError) {
    throw new RootSelectionError(error.message, error.diagnostic.code, {
      ...(error.diagnostic.target ? { target: error.diagnostic.target } : {}),
      ...(error.diagnostic.fix ? { fix: error.diagnostic.fix } : {}),
    });
  }

  throw error;
}

function doctorFix(id: string): string {
  return `Run openspec context-store doctor ${id} to inspect it.`;
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
  globalDataDir?: string
): Promise<ResolvedOpenSpecRoot> {
  try {
    validateContextStoreId(id);
  } catch (error) {
    fromContextStoreError(error);
  }

  const registry = await readContextStoreRegistryState(
    globalDataDir ? { globalDataDir } : {}
  );
  const entries = registry ? listContextStoreRegistryEntries(registry) : [];
  const entry = entries.find((candidate) => candidate.id === id);

  if (!entry) {
    if (entries.length === 0) {
      throw new RootSelectionError(
        `Unknown context store '${id}'. No context stores are registered.`,
        'no_registered_stores',
        {
          target: 'context_store.id',
          fix: `Run openspec context-store setup ${id} or openspec context-store register <path> first.`,
        }
      );
    }

    throw new RootSelectionError(
      `Unknown context store '${id}'. Registered stores: ${entries
        .map((candidate) => candidate.id)
        .join(', ')}.`,
      'unknown_store',
      {
        target: 'context_store.id',
        fix: 'Pass a registered store id, or run openspec context-store list.',
      }
    );
  }

  const storeRoot = getStoreRootForBackend(entry.backend);

  // Identity (metadata) failures win before root-health diagnostics.
  let metadata;
  try {
    metadata = await readOptionalContextStoreMetadataState(storeRoot);
  } catch (error) {
    fromContextStoreError(error);
  }

  if (!metadata) {
    // The doctor pointer lives in the message because human-mode command
    // wrappers print only the message, not the fix field.
    throw new RootSelectionError(
      `Context store '${id}' is missing identity metadata at ${getContextStoreMetadataPath(storeRoot)}. ${doctorFix(id)}`,
      'store_identity_mismatch',
      { target: 'context_store.metadata', fix: doctorFix(id) }
    );
  }

  if (metadata.id !== id) {
    throw new RootSelectionError(
      `Context store '${id}' metadata id '${metadata.id}' does not match its registered id. ${doctorFix(id)}`,
      'store_identity_mismatch',
      { target: 'context_store.metadata', fix: doctorFix(id) }
    );
  }

  const inspection = await inspectOpenSpecRoot(storeRoot);
  if (!inspection.healthy) {
    const problems =
      inspection.diagnostics.map((diagnostic) => diagnostic.message).join(' ') ||
      'OpenSpec root is missing or incomplete.';
    throw new RootSelectionError(
      `Context store '${id}' does not have a healthy OpenSpec root at ${storeRoot}: ${problems} ${doctorFix(id)}`,
      'unhealthy_store_root',
      { target: 'openspec.root', fix: doctorFix(id) }
    );
  }

  return makeRoot(FileSystemUtils.canonicalizeExistingPath(storeRoot), 'store', id);
}

export async function resolveOpenSpecRoot(
  options: ResolveOpenSpecRootOptions = {}
): Promise<ResolvedOpenSpecRoot> {
  if (options.storePath !== undefined) {
    throw new RootSelectionError(
      '--store-path is not supported. Register the path with openspec context-store register <path>, then select it with --store <id>.',
      'store_path_not_supported',
      {
        target: 'context_store.id',
        fix: 'openspec context-store register <path>, then rerun with --store <id>.',
      }
    );
  }

  if (options.store !== undefined) {
    return resolveStoreRoot(options.store, options.globalDataDir);
  }

  const startPath = options.startPath ?? process.cwd();
  const nearestRoot = findRepoPlanningRootSync(startPath);
  if (nearestRoot) {
    return makeRoot(nearestRoot, 'nearest');
  }

  const registry = await readContextStoreRegistryState(
    options.globalDataDir ? { globalDataDir: options.globalDataDir } : {}
  );
  const registeredIds = registry
    ? listContextStoreRegistryEntries(registry).map((entry) => entry.id)
    : [];

  if (registeredIds.length > 0) {
    throw new RootSelectionError(
      `No OpenSpec root found in the current directory or its ancestors. Registered context stores: ${registeredIds.join(', ')}. Pass --store <id> to use one, or run openspec init to create a local root.`,
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
 * Human-mode verification signal for a selected store. Written to stderr so
 * raw-Markdown and agent-consumed stdout payloads stay clean.
 */
export function emitStoreRootBanner(root: ResolvedOpenSpecRoot): void {
  if (root.source === 'store' && root.storeId) {
    console.error(`Using OpenSpec root: ${root.storeId} (${root.path})`);
  }
}

/**
 * Compatibility bridge for workflow code that still expects a PlanningHome.
 * Normal commands never produce `kind: 'workspace'`.
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
  output: { json?: boolean; failurePayload?: Record<string, unknown> } = {}
): Promise<ResolvedOpenSpecRoot | null> {
  try {
    return await resolveOpenSpecRoot({
      ...(selector.store !== undefined ? { store: selector.store } : {}),
      ...(selector.storePath !== undefined ? { storePath: selector.storePath } : {}),
    });
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
