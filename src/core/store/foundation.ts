import * as nodeFs from 'node:fs';
import * as path from 'node:path';
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';
import { z } from 'zod';
import {
  folderStyleNameProblem,
  isKebabId,
  KEBAB_ID_DESCRIPTION,
  KEBAB_ID_FIX,
} from '../id.js';

import { getGlobalDataDir } from '../global-config.js';
import { FileSystemUtils } from '../../utils/file-system.js';
import {
  acquireFileLock,
  isNodeErrorCode,
  makeLockErrorFactory,
  pathIsDirectory,
  pathIsFile,
  releaseFileLock,
  writeFileAtomically,
} from '../file-state.js';
import { formatZodIssues } from '../zod-issues.js';
import { StoreError } from './errors.js';

const fs = nodeFs.promises;

export const STORE_METADATA_DIR_NAME = '.openspec-store';
export const STORE_METADATA_FILE_NAME = 'store.yaml';
export const STORES_DIR_NAME = 'stores';
export const STORE_REGISTRY_FILE_NAME = 'registry.yaml';

export interface StorePathOptions {
  globalDataDir?: string;
  /** When set, registry operations target a project-scoped registry file
   * at `<projectRoot>/.openspec-store/registry.yaml` instead of the global
   * machine-level registry. */
  projectRoot?: string;
}

export interface StoreGitBackendConfig {
  type: 'git';
  local_path: string;
  remote?: string;
  branch?: string;
}

export type StoreBackendConfig = StoreGitBackendConfig;

export interface StoreRegistryEntryState {
  backend: StoreBackendConfig;
}

export interface StoreRegistryState {
  version: 1;
  stores: Record<string, StoreRegistryEntryState>;
}

export interface StoreRegistryEntry {
  id: string;
  backend: StoreBackendConfig;
}

export interface StoreMetadataState {
  version: 1;
  id: string;
  /** Canonical clone source, team-authored. Optional (slice 3.3). */
  remote?: string;
}

export interface ResolveGitStoreBackendInput {
  localPath: string;
  remote?: string;
  branch?: string;
}

function joinStorePath(basePath: string, ...segments: string[]): string {
  return FileSystemUtils.joinPath(basePath, ...segments);
}

export function getStoresDir(options: StorePathOptions = {}): string {
  return joinStorePath(options.globalDataDir ?? getGlobalDataDir(), STORES_DIR_NAME);
}

export function getStoreRegistryPath(options: StorePathOptions = {}): string {
  if (options.projectRoot !== undefined) {
    return joinStorePath(
      options.projectRoot,
      STORE_METADATA_DIR_NAME,
      STORE_REGISTRY_FILE_NAME
    );
  }
  return joinStorePath(getStoresDir(options), STORE_REGISTRY_FILE_NAME);
}

/**
 * Walks up from startPath looking for `.openspec-store/registry.yaml`.
 * Returns the directory containing the file, or null if not found.
 * Uses the same nearest-ancestor pattern as `findRepoPlanningRootSync`.
 */
export function findProjectRegistryDir(startPath: string = process.cwd()): string | null {
  const resolved = path.resolve(startPath);

  let currentDir: string;
  try {
    const stats = nodeFs.statSync(resolved);
    currentDir = stats.isDirectory() ? resolved : path.dirname(resolved);
  } catch {
    currentDir = resolved;
  }

  while (true) {
    const candidate = path.join(currentDir, STORE_METADATA_DIR_NAME, STORE_REGISTRY_FILE_NAME);
    try {
      if (nodeFs.statSync(candidate).isFile()) {
        return FileSystemUtils.canonicalizeExistingPath(currentDir);
      }
    } catch {
      // File doesn't exist at this level — continue walking up.
    }

    const parentDir = path.dirname(currentDir);
    if (parentDir === currentDir) {
      return null;
    }
    currentDir = parentDir;
  }
}

export function getStoreMetadataDir(storeRoot: string): string {
  return joinStorePath(storeRoot, STORE_METADATA_DIR_NAME);
}

export function getStoreMetadataPath(storeRoot: string): string {
  return joinStorePath(
    getStoreMetadataDir(storeRoot),
    STORE_METADATA_FILE_NAME
  );
}

export function validateStoreId(id: string): string {
  const folderProblem = folderStyleNameProblem(id, 'Store id');
  if (folderProblem !== null) {
    throw new StoreError(folderProblem, 'invalid_store_id', {
      target: 'store.id',
      fix: KEBAB_ID_FIX,
    });
  }

  if (!isKebabId(id)) {
    throw new StoreError(
      `Store id ${KEBAB_ID_DESCRIPTION}`,
      'invalid_store_id',
      {
        target: 'store.id',
        fix: KEBAB_ID_FIX,
      }
    );
  }

  return id;
}

export function isValidStoreId(id: string): boolean {
  try {
    validateStoreId(id);
    return true;
  } catch {
    return false;
  }
}

function isFileNotFoundError(error: unknown): boolean {
  return isNodeErrorCode(error, 'ENOENT');
}

function normalizeExistingPathForStorage(existingPath: string): string {
  return FileSystemUtils.canonicalizeExistingPath(existingPath);
}

export function normalizePathForComparison(targetPath: string): string {
  try {
    return FileSystemUtils.canonicalizeExistingPath(targetPath);
  } catch {
    return path.resolve(targetPath);
  }
}

function nonEmptyOptionalString() {
  return z.string().min(1).optional();
}

const GitBackendConfigSchema = z.object({
  type: z.literal('git'),
  local_path: z.string().min(1),
  remote: nonEmptyOptionalString(),
  branch: nonEmptyOptionalString(),
}).strict();

const RegistryEntrySchema = z.object({
  backend: GitBackendConfigSchema,
}).strict();

const RegistryStateSchema = z.object({
  version: z.literal(1),
  stores: z.record(z.string(), RegistryEntrySchema),
  // Legacy code-checkout map data is tolerated on read and dropped on
  // the next write.
  repos: z.unknown().optional(),
}).strict();

const MetadataStateSchema = z.object({
  version: z.literal(1),
  id: z.string(),
  remote: nonEmptyOptionalString(),
}).strict();

function storeStateDiagnostic(label: string): {
  code: string;
  target: string;
  fix: string;
} {
  if (label.includes('metadata')) {
    return {
      code: 'invalid_store_metadata',
      target: 'store.metadata',
      fix: 'Repair .openspec-store/store.yaml.',
    };
  }

  return {
    code: 'invalid_store_registry',
    target: 'store.registry',
    fix: `Repair or remove ${getStoreRegistryPath({})}.`,
  };
}

function invalidStoreStateError(label: string, message: string): StoreError {
  const diagnostic = storeStateDiagnostic(label);
  return new StoreError(`Invalid ${label}: ${message}`, diagnostic.code, {
    target: diagnostic.target,
    fix: diagnostic.fix,
  });
}

function parseYamlObject(content: string, label: string): unknown {
  try {
    return parseYaml(content);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw invalidStoreStateError(label, message);
  }
}

function assertValidStoreIds(ids: string[], label: string): void {
  for (const id of ids) {
    if (!isKebabId(id)) {
      throw invalidStoreStateError(
        label,
        `'${id}': ${KEBAB_ID_DESCRIPTION}`
      );
    }
  }
}

export function parseStoreRegistryState(content: string): StoreRegistryState {
  const raw = parseYamlObject(content, 'store registry state');
  const result = RegistryStateSchema.safeParse(raw);

  if (!result.success) {
    throw invalidStoreStateError(
      'store registry state',
      formatZodIssues(result.error)
    );
  }

  assertValidStoreIds(Object.keys(result.data.stores), 'store id');

  return {
    version: 1,
    stores: result.data.stores,
  };
}

export function parseStoreMetadataState(content: string): StoreMetadataState {
  const raw = parseYamlObject(content, 'store metadata state');
  const result = MetadataStateSchema.safeParse(raw);

  if (!result.success) {
    throw invalidStoreStateError(
      'store metadata state',
      formatZodIssues(result.error)
    );
  }

  validateStoreId(result.data.id);

  return {
    version: 1,
    id: result.data.id,
    ...(result.data.remote !== undefined ? { remote: result.data.remote } : {}),
  };
}

export function serializeStoreRegistryState(state: StoreRegistryState): string {
  const result = RegistryStateSchema.safeParse(state);

  if (!result.success) {
    throw invalidStoreStateError(
      'store registry state',
      formatZodIssues(result.error)
    );
  }

  assertValidStoreIds(Object.keys(result.data.stores), 'store id');

  return stringifyYaml({
    version: 1,
    stores: result.data.stores,
  });
}

export function serializeStoreMetadataState(state: StoreMetadataState): string {
  const result = MetadataStateSchema.safeParse(state);

  if (!result.success) {
    throw invalidStoreStateError(
      'store metadata state',
      formatZodIssues(result.error)
    );
  }

  validateStoreId(result.data.id);

  return stringifyYaml({
    version: 1,
    id: result.data.id,
    ...(result.data.remote !== undefined ? { remote: result.data.remote } : {}),
  });
}

export function listStoreRegistryEntries(
  registry: StoreRegistryState
): StoreRegistryEntry[] {
  return Object.entries(registry.stores)
    .map(([id, store]) => ({ id, backend: store.backend }))
    .sort((a, b) => a.id.localeCompare(b.id));
}

export async function isStoreRoot(candidateRoot: string): Promise<boolean> {
  return pathIsFile(getStoreMetadataPath(candidateRoot));
}

export async function readStoreRegistryState(
  options: StorePathOptions = {}
): Promise<StoreRegistryState | null> {
  const registryPath = getStoreRegistryPath(options);

  if (!(await pathIsFile(registryPath))) {
    return null;
  }

  return parseStoreRegistryState(await fs.readFile(registryPath, 'utf-8'));
}

export async function writeStoreRegistryState(
  state: StoreRegistryState,
  options: StorePathOptions = {}
): Promise<void> {
  await writeFileAtomically(
    getStoreRegistryPath(options),
    serializeStoreRegistryState(state)
  );
}

const storeRegistryLockError = makeLockErrorFactory({
  createSubject: 'the registry lock file',
  busyMessage: 'Store registry is busy.',
  code: 'store_registry_busy',
  target: 'store.registry',
});

export async function updateStoreRegistryState(
  updater: (
    state: StoreRegistryState | null
  ) => StoreRegistryState | Promise<StoreRegistryState>,
  options: StorePathOptions = {}
): Promise<StoreRegistryState> {
  const registryPath = getStoreRegistryPath(options);
  const lockPath = `${registryPath}.lock`;
  const lock = await acquireFileLock({
    lockPath,
    errorFor: storeRegistryLockError,
  });

  try {
    const next = await updater(await readStoreRegistryState(options));
    await writeStoreRegistryState(next, options);
    return next;
  } finally {
    await releaseFileLock(lock, lockPath);
  }
}

export async function readStoreMetadataState(
  storeRoot: string
): Promise<StoreMetadataState> {
  return parseStoreMetadataState(
    await fs.readFile(getStoreMetadataPath(storeRoot), 'utf-8')
  );
}

export async function readOptionalStoreMetadataState(
  storeRoot: string
): Promise<StoreMetadataState | null> {
  try {
    return await readStoreMetadataState(storeRoot);
  } catch (error) {
    if (isFileNotFoundError(error)) {
      return null;
    }

    throw error;
  }
}

export async function writeStoreMetadataState(
  storeRoot: string,
  state: StoreMetadataState
): Promise<void> {
  await FileSystemUtils.writeFile(
    getStoreMetadataPath(storeRoot),
    serializeStoreMetadataState(state)
  );
}

export async function resolveGitStoreBackendConfig(
  input: ResolveGitStoreBackendInput,
  cwd = process.cwd()
): Promise<StoreGitBackendConfig> {
  if (input.localPath.length === 0) {
    throw new Error('Store local path must not be empty.');
  }

  const resolvedPath = path.isAbsolute(input.localPath)
    ? path.resolve(input.localPath)
    : path.resolve(cwd, input.localPath);

  if (!(await pathIsDirectory(resolvedPath))) {
    throw new Error(`Store local path does not exist: ${input.localPath}`);
  }

  if (input.remote !== undefined && input.remote.length === 0) {
    throw new Error('Store backend remote must not be empty when provided.');
  }

  if (input.branch !== undefined && input.branch.length === 0) {
    throw new Error('Store branch must not be empty when provided.');
  }

  return {
    type: 'git',
    local_path: normalizeExistingPathForStorage(resolvedPath),
    ...(input.remote ? { remote: input.remote } : {}),
    ...(input.branch ? { branch: input.branch } : {}),
  };
}

// --- Project-scoped registry (simple { path: ... } format) ---

export interface ProjectStoreEntryState {
  path: string;
}

export interface ProjectStoreRegistryState {
  version: 1;
  stores: Record<string, ProjectStoreEntryState>;
}

export interface ProjectStoreRegistryEntry {
  id: string;
  /** Absolute path resolved relative to the registry file's directory. */
  storeRoot: string;
}

const ProjectStoreEntrySchema = z.object({
  path: z.string().min(1),
}).strict();

const ProjectStoreRegistryStateSchema = z.object({
  version: z.literal(1),
  stores: z.record(z.string(), ProjectStoreEntrySchema),
}).strict();

export function parseProjectStoreRegistryState(
  content: string
): ProjectStoreRegistryState {
  const raw = parseYamlObject(content, 'project store registry state');
  const result = ProjectStoreRegistryStateSchema.safeParse(raw);

  if (!result.success) {
    throw invalidStoreStateError(
      'project store registry state',
      formatZodIssues(result.error)
    );
  }

  assertValidStoreIds(Object.keys(result.data.stores), 'store id');

  return {
    version: 1,
    stores: result.data.stores,
  };
}

export function serializeProjectStoreRegistryState(
  state: ProjectStoreRegistryState
): string {
  const result = ProjectStoreRegistryStateSchema.safeParse(state);

  if (!result.success) {
    throw invalidStoreStateError(
      'project store registry state',
      formatZodIssues(result.error)
    );
  }

  assertValidStoreIds(Object.keys(result.data.stores), 'store id');

  return stringifyYaml({
    version: 1,
    stores: result.data.stores,
  });
}

export function listProjectStoreRegistryEntries(
  registry: ProjectStoreRegistryState,
  registryDir: string
): ProjectStoreRegistryEntry[] {
  // Object.entries preserves insertion order for string keys (ES2015+),
  // which matches the document order of the YAML file — no sorting.
  return Object.entries(registry.stores).map(([id, entry]) => ({
    id,
    storeRoot: path.resolve(registryDir, entry.path),
  }));
}

export async function readProjectStoreRegistryState(
  registryDir: string
): Promise<ProjectStoreRegistryState | null> {
  const registryPath = path.join(registryDir, STORE_METADATA_DIR_NAME, STORE_REGISTRY_FILE_NAME);

  if (!(await pathIsFile(registryPath))) {
    return null;
  }

  return parseProjectStoreRegistryState(await fs.readFile(registryPath, 'utf-8'));
}

export interface ProjectStoreLookup {
  registryDir: string;
  storeRoot: string;
}

export interface ProjectStoreLookupResult {
  /** The matched store entry, or null when no project-scoped registry registers the id. */
  found: ProjectStoreLookup | null;
  /** Whether any project-scoped registry on the walk contained store entries. */
  projectStoresExist: boolean;
}

export interface ProjectStoreRegistryLevel {
  /** The directory that contains the `.openspec-store/registry.yaml` file. */
  registryDir: string;
  /** The parsed registry state. */
  state: ProjectStoreRegistryState;
}

/**
 * Walks up from `startPath`, collecting every project-scoped registry file
 * along the ancestor chain, nearest first. Malformed files are skipped with a
 * warning; the walk stops at the filesystem root.
 */
export async function walkProjectStoreRegistries(
  startPath: string = process.cwd()
): Promise<ProjectStoreRegistryLevel[]> {
  // Canonicalize so the reported registryDir is stable (realpath of the
  // ancestors: on macOS /var is a symlink to /private/var).
  let currentDir = FileSystemUtils.canonicalizeExistingPath(path.resolve(startPath));

  // If startPath is a file, start from its directory.
  try {
    const stats = nodeFs.statSync(currentDir);
    if (!stats.isDirectory()) {
      currentDir = path.dirname(currentDir);
    }
  } catch {
    // Path doesn't exist — resolve as-is, dirname will handle it.
  }

  const levels: ProjectStoreRegistryLevel[] = [];

  while (true) {
    const registryPath = path.join(currentDir, STORE_METADATA_DIR_NAME, STORE_REGISTRY_FILE_NAME);
    if (await pathIsFile(registryPath)) {
      try {
        const registry = await readProjectStoreRegistryState(currentDir);
        if (registry) {
          levels.push({ registryDir: currentDir, state: registry });
        }
      } catch {
        console.error(
          `Warning: Project-scoped registry at ${currentDir} is malformed; continuing search in ancestor directories.`
        );
      }
    }

    const parentDir = path.dirname(currentDir);
    if (parentDir === currentDir) {
      return levels;
    }
    currentDir = parentDir;
  }
}

export async function findProjectStoreById(
  id: string,
  startPath: string = process.cwd()
): Promise<ProjectStoreLookupResult> {
  let projectStoresExist = false;

  for (const level of await walkProjectStoreRegistries(startPath)) {
    const entries = listProjectStoreRegistryEntries(level.state, level.registryDir);
    if (entries.length > 0) {
      projectStoresExist = true;
    }
    const entry = entries.find((e) => e.id === id);
    if (entry) {
      return {
        found: {
          registryDir: FileSystemUtils.canonicalizeExistingPath(level.registryDir),
          storeRoot: entry.storeRoot,
        },
        projectStoresExist,
      };
    }
  }

  return { found: null, projectStoresExist };
}
