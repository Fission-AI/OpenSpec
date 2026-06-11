import * as nodeFs from 'node:fs';
import * as path from 'node:path';
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';
import { z } from 'zod';
import { isKebabId, KEBAB_ID_DESCRIPTION } from '../id.js';

import { getGlobalDataDir } from '../global-config.js';
import { FileSystemUtils } from '../../utils/file-system.js';
import { StoreError } from './errors.js';

const fs = nodeFs.promises;

export const STORE_METADATA_DIR_NAME = '.openspec-store';
export const STORE_METADATA_FILE_NAME = 'store.yaml';
export const STORES_DIR_NAME = 'stores';
export const STORE_REGISTRY_FILE_NAME = 'registry.yaml';

export interface StorePathOptions {
  globalDataDir?: string;
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
  /** Target repo id → local checkout mapping (slice 3.5). */
  repos?: Record<string, { local_path: string }>;
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
  return joinStorePath(getStoresDir(options), STORE_REGISTRY_FILE_NAME);
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

function validateFolderStyleName(name: string, label: string): string {
  if (name.length === 0) {
    throw new Error(`${label} must not be empty`);
  }

  if (name === '.' || name === '..') {
    throw new Error(`${label} must not be '${name}'`);
  }

  if (/[\\/]/u.test(name)) {
    throw new Error(`${label} must not contain path separators`);
  }

  return name;
}

export function validateStoreId(id: string): string {
  try {
    validateFolderStyleName(id, 'Store id');
  } catch (error) {
    throw new StoreError(
      error instanceof Error ? error.message : String(error),
      'invalid_store_id',
      {
        target: 'store.id',
        fix: 'Use kebab-case with lowercase letters, numbers, and single hyphen separators.',
      }
    );
  }

  if (!isKebabId(id)) {
    throw new StoreError(
      'Store id must be kebab-case with lowercase letters, numbers, and single hyphen separators',
      'invalid_store_id',
      {
        target: 'store.id',
        fix: 'Use kebab-case with lowercase letters, numbers, and single hyphen separators.',
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

async function pathIsFile(filePath: string): Promise<boolean> {
  try {
    return (await fs.stat(filePath)).isFile();
  } catch {
    return false;
  }
}

async function pathIsDirectory(dirPath: string): Promise<boolean> {
  try {
    return (await fs.stat(dirPath)).isDirectory();
  } catch {
    return false;
  }
}

function isFileNotFoundError(error: unknown): boolean {
  return isNodeErrorCode(error, 'ENOENT');
}

function isNodeErrorCode(error: unknown, code: string): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as NodeJS.ErrnoException).code === code
  );
}

function normalizeExistingPathForStorage(existingPath: string): string {
  return FileSystemUtils.canonicalizeExistingPath(existingPath);
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

const RepoEntrySchema = z.object({
  local_path: z.string().min(1),
}).strict();

const RegistryStateSchema = z.object({
  version: z.literal(1),
  stores: z.record(z.string(), RegistryEntrySchema),
  // Typed sections (slice 3.5): target repo mappings live beside store
  // registrations in one machine-local file.
  repos: z.record(z.string(), RepoEntrySchema).optional(),
}).strict();

const MetadataStateSchema = z.object({
  version: z.literal(1),
  id: z.string(),
  remote: nonEmptyOptionalString(),
}).strict();

function formatZodIssues(error: z.ZodError): string {
  return error.issues
    .map((issue) => {
      const location = issue.path.length > 0 ? issue.path.join('.') : 'root';
      return `${location}: ${issue.message}`;
    })
    .join('; ');
}

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
    fix: 'Repair or remove the store registry file.',
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
  if (result.data.repos) {
    assertValidStoreIds(Object.keys(result.data.repos), 'repo id');
    // Cross-section uniqueness holds at parse time too: a hand-edited
    // registry with one id in both sections must fail clearly, not
    // resolve ambiguously.
    const overlap = Object.keys(result.data.repos).filter(
      (id) => result.data.stores[id] !== undefined
    );
    if (overlap.length > 0) {
      throw invalidStoreStateError(
        'store registry state',
        `ids registered in both sections: ${overlap.join(', ')} (store and repo ids share one namespace)`
      );
    }
  }

  return {
    version: 1,
    stores: result.data.stores,
    ...(result.data.repos !== undefined ? { repos: result.data.repos } : {}),
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
  if (result.data.repos) {
    assertValidStoreIds(Object.keys(result.data.repos), 'repo id');
  }

  // Omitted-when-absent: a repos-less registry serializes byte-identically
  // to the pre-3.5 format.
  return stringifyYaml({
    version: 1,
    stores: result.data.stores,
    ...(result.data.repos !== undefined ? { repos: result.data.repos } : {}),
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

async function writeFileAtomically(filePath: string, content: string): Promise<void> {
  const dirPath = path.dirname(filePath);
  await FileSystemUtils.createDirectory(dirPath);
  const tempPath = path.join(
    dirPath,
    `.${path.basename(filePath)}.${process.pid}.${Date.now()}.${Math.random().toString(36).slice(2)}.tmp`
  );

  try {
    await fs.writeFile(tempPath, content, 'utf-8');
    await fs.rename(tempPath, filePath);
  } catch (error) {
    await fs.rm(tempPath, { force: true }).catch(() => undefined);
    throw error;
  }
}

async function sleep(milliseconds: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function acquireStoreRegistryLock(
  options: StorePathOptions
): Promise<nodeFs.promises.FileHandle> {
  const registryPath = getStoreRegistryPath(options);
  const lockPath = `${registryPath}.lock`;
  await FileSystemUtils.createDirectory(path.dirname(registryPath));
  const deadline = Date.now() + 5000;

  while (true) {
    try {
      return await fs.open(lockPath, 'wx');
    } catch (error) {
      if (!isNodeErrorCode(error, 'EEXIST') || Date.now() >= deadline) {
        throw new StoreError('Store registry is busy.', 'store_registry_busy', {
          target: 'store.registry',
          fix: 'Retry the command after the current registry update finishes.',
        });
      }

      await sleep(25);
    }
  }
}

export async function updateStoreRegistryState(
  updater: (
    state: StoreRegistryState | null
  ) => StoreRegistryState | Promise<StoreRegistryState>,
  options: StorePathOptions = {}
): Promise<StoreRegistryState> {
  const registryPath = getStoreRegistryPath(options);
  const lockPath = `${registryPath}.lock`;
  const lock = await acquireStoreRegistryLock(options);

  try {
    const next = await updater(await readStoreRegistryState(options));
    await writeStoreRegistryState(next, options);
    return next;
  } finally {
    await lock.close().catch(() => undefined);
    await fs.rm(lockPath, { force: true }).catch(() => undefined);
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
