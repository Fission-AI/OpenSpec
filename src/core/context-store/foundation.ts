import * as nodeFs from 'node:fs';
import * as path from 'node:path';
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';
import { z } from 'zod';

import { getGlobalDataDir } from '../global-config.js';
import { FileSystemUtils } from '../../utils/file-system.js';
import { ContextStoreError } from './errors.js';

const fs = nodeFs.promises;

export const CONTEXT_STORE_METADATA_DIR_NAME = '.openspec-store';
export const CONTEXT_STORE_METADATA_FILE_NAME = 'store.yaml';
export const CONTEXT_STORES_DIR_NAME = 'context-stores';
export const CONTEXT_STORE_REGISTRY_FILE_NAME = 'registry.yaml';

export interface ContextStorePathOptions {
  globalDataDir?: string;
}

export interface ContextStoreGitBackendConfig {
  type: 'git';
  local_path: string;
  remote?: string;
  branch?: string;
}

export type ContextStoreBackendConfig = ContextStoreGitBackendConfig;

export interface ContextStoreRegistryEntryState {
  backend: ContextStoreBackendConfig;
}

export interface ContextStoreRegistryState {
  version: 1;
  stores: Record<string, ContextStoreRegistryEntryState>;
}

export interface ContextStoreRegistryEntry {
  id: string;
  backend: ContextStoreBackendConfig;
}

export interface ContextStoreMetadataState {
  version: 1;
  id: string;
}

export interface ResolveGitContextStoreBackendInput {
  localPath: string;
  remote?: string;
  branch?: string;
}

function joinContextStorePath(basePath: string, ...segments: string[]): string {
  return FileSystemUtils.joinPath(basePath, ...segments);
}

export function getContextStoresDir(options: ContextStorePathOptions = {}): string {
  return joinContextStorePath(options.globalDataDir ?? getGlobalDataDir(), CONTEXT_STORES_DIR_NAME);
}

export function getContextStoreRegistryPath(options: ContextStorePathOptions = {}): string {
  return joinContextStorePath(getContextStoresDir(options), CONTEXT_STORE_REGISTRY_FILE_NAME);
}

export function getDefaultContextStoreRoot(id: string, options: ContextStorePathOptions = {}): string {
  return joinContextStorePath(getContextStoresDir(options), id);
}

export function getContextStoreMetadataDir(storeRoot: string): string {
  return joinContextStorePath(storeRoot, CONTEXT_STORE_METADATA_DIR_NAME);
}

export function getContextStoreMetadataPath(storeRoot: string): string {
  return joinContextStorePath(
    getContextStoreMetadataDir(storeRoot),
    CONTEXT_STORE_METADATA_FILE_NAME
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

export function validateContextStoreId(id: string): string {
  try {
    validateFolderStyleName(id, 'Context store id');
  } catch (error) {
    throw new ContextStoreError(
      error instanceof Error ? error.message : String(error),
      'invalid_context_store_id',
      {
        target: 'context_store.id',
        fix: 'Use kebab-case with lowercase letters, numbers, and single hyphen separators.',
      }
    );
  }

  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(id)) {
    throw new ContextStoreError(
      'Context store id must be kebab-case with lowercase letters, numbers, and single hyphen separators',
      'invalid_context_store_id',
      {
        target: 'context_store.id',
        fix: 'Use kebab-case with lowercase letters, numbers, and single hyphen separators.',
      }
    );
  }

  return id;
}

export function isValidContextStoreId(id: string): boolean {
  try {
    validateContextStoreId(id);
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

const RegistryStateSchema = z.object({
  version: z.literal(1),
  stores: z.record(z.string(), RegistryEntrySchema),
}).strict();

const MetadataStateSchema = z.object({
  version: z.literal(1),
  id: z.string(),
}).strict();

function formatZodIssues(error: z.ZodError): string {
  return error.issues
    .map((issue) => {
      const location = issue.path.length > 0 ? issue.path.join('.') : 'root';
      return `${location}: ${issue.message}`;
    })
    .join('; ');
}

function contextStoreStateDiagnostic(label: string): {
  code: string;
  target: string;
  fix: string;
} {
  if (label.includes('metadata')) {
    return {
      code: 'invalid_context_store_metadata',
      target: 'context_store.metadata',
      fix: 'Repair .openspec-store/store.yaml.',
    };
  }

  return {
    code: 'invalid_context_store_registry',
    target: 'context_store.registry',
    fix: 'Repair or remove the context-store registry file.',
  };
}

function invalidContextStoreStateError(label: string, message: string): ContextStoreError {
  const diagnostic = contextStoreStateDiagnostic(label);
  return new ContextStoreError(`Invalid ${label}: ${message}`, diagnostic.code, {
    target: diagnostic.target,
    fix: diagnostic.fix,
  });
}

function parseYamlObject(content: string, label: string): unknown {
  try {
    return parseYaml(content);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw invalidContextStoreStateError(label, message);
  }
}

function assertValidContextStoreIds(ids: string[], label: string): void {
  for (const id of ids) {
    try {
      validateContextStoreId(id);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw invalidContextStoreStateError(label, `'${id}': ${message}`);
    }
  }
}

export function parseContextStoreRegistryState(content: string): ContextStoreRegistryState {
  const raw = parseYamlObject(content, 'context store registry state');
  const result = RegistryStateSchema.safeParse(raw);

  if (!result.success) {
    throw invalidContextStoreStateError(
      'context store registry state',
      formatZodIssues(result.error)
    );
  }

  assertValidContextStoreIds(Object.keys(result.data.stores), 'context store id');

  return {
    version: 1,
    stores: result.data.stores,
  };
}

export function parseContextStoreMetadataState(content: string): ContextStoreMetadataState {
  const raw = parseYamlObject(content, 'context store metadata state');
  const result = MetadataStateSchema.safeParse(raw);

  if (!result.success) {
    throw invalidContextStoreStateError(
      'context store metadata state',
      formatZodIssues(result.error)
    );
  }

  validateContextStoreId(result.data.id);

  return {
    version: 1,
    id: result.data.id,
  };
}

export function serializeContextStoreRegistryState(state: ContextStoreRegistryState): string {
  const result = RegistryStateSchema.safeParse(state);

  if (!result.success) {
    throw invalidContextStoreStateError(
      'context store registry state',
      formatZodIssues(result.error)
    );
  }

  assertValidContextStoreIds(Object.keys(result.data.stores), 'context store id');

  return stringifyYaml({
    version: 1,
    stores: result.data.stores,
  });
}

export function serializeContextStoreMetadataState(state: ContextStoreMetadataState): string {
  const result = MetadataStateSchema.safeParse(state);

  if (!result.success) {
    throw invalidContextStoreStateError(
      'context store metadata state',
      formatZodIssues(result.error)
    );
  }

  validateContextStoreId(result.data.id);

  return stringifyYaml({
    version: 1,
    id: result.data.id,
  });
}

export function listContextStoreRegistryEntries(
  registry: ContextStoreRegistryState
): ContextStoreRegistryEntry[] {
  return Object.entries(registry.stores)
    .map(([id, store]) => ({ id, backend: store.backend }))
    .sort((a, b) => a.id.localeCompare(b.id));
}

export async function isContextStoreRoot(candidateRoot: string): Promise<boolean> {
  return pathIsFile(getContextStoreMetadataPath(candidateRoot));
}

export async function readContextStoreRegistryState(
  options: ContextStorePathOptions = {}
): Promise<ContextStoreRegistryState | null> {
  const registryPath = getContextStoreRegistryPath(options);

  if (!(await pathIsFile(registryPath))) {
    return null;
  }

  return parseContextStoreRegistryState(await fs.readFile(registryPath, 'utf-8'));
}

export async function writeContextStoreRegistryState(
  state: ContextStoreRegistryState,
  options: ContextStorePathOptions = {}
): Promise<void> {
  await writeFileAtomically(
    getContextStoreRegistryPath(options),
    serializeContextStoreRegistryState(state)
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

async function acquireContextStoreRegistryLock(
  options: ContextStorePathOptions
): Promise<nodeFs.promises.FileHandle> {
  const registryPath = getContextStoreRegistryPath(options);
  const lockPath = `${registryPath}.lock`;
  await FileSystemUtils.createDirectory(path.dirname(registryPath));
  const deadline = Date.now() + 5000;

  while (true) {
    try {
      return await fs.open(lockPath, 'wx');
    } catch (error) {
      if (!isNodeErrorCode(error, 'EEXIST') || Date.now() >= deadline) {
        throw new ContextStoreError('Context store registry is busy.', 'context_store_registry_busy', {
          target: 'context_store.registry',
          fix: 'Retry the command after the current registry update finishes.',
        });
      }

      await sleep(25);
    }
  }
}

export async function updateContextStoreRegistryState(
  updater: (
    state: ContextStoreRegistryState | null
  ) => ContextStoreRegistryState | Promise<ContextStoreRegistryState>,
  options: ContextStorePathOptions = {}
): Promise<ContextStoreRegistryState> {
  const registryPath = getContextStoreRegistryPath(options);
  const lockPath = `${registryPath}.lock`;
  const lock = await acquireContextStoreRegistryLock(options);

  try {
    const next = await updater(await readContextStoreRegistryState(options));
    await writeContextStoreRegistryState(next, options);
    return next;
  } finally {
    await lock.close().catch(() => undefined);
    await fs.rm(lockPath, { force: true }).catch(() => undefined);
  }
}

export async function readContextStoreMetadataState(
  storeRoot: string
): Promise<ContextStoreMetadataState> {
  return parseContextStoreMetadataState(
    await fs.readFile(getContextStoreMetadataPath(storeRoot), 'utf-8')
  );
}

export async function readOptionalContextStoreMetadataState(
  storeRoot: string
): Promise<ContextStoreMetadataState | null> {
  try {
    return await readContextStoreMetadataState(storeRoot);
  } catch (error) {
    if (isFileNotFoundError(error)) {
      return null;
    }

    throw error;
  }
}

export async function writeContextStoreMetadataState(
  storeRoot: string,
  state: ContextStoreMetadataState
): Promise<void> {
  await FileSystemUtils.writeFile(
    getContextStoreMetadataPath(storeRoot),
    serializeContextStoreMetadataState(state)
  );
}

export async function resolveGitContextStoreBackendConfig(
  input: ResolveGitContextStoreBackendInput,
  cwd = process.cwd()
): Promise<ContextStoreGitBackendConfig> {
  if (input.localPath.length === 0) {
    throw new Error('Context store local path must not be empty.');
  }

  const resolvedPath = path.isAbsolute(input.localPath)
    ? path.resolve(input.localPath)
    : path.resolve(cwd, input.localPath);

  if (!(await pathIsDirectory(resolvedPath))) {
    throw new Error(`Context store local path does not exist: ${input.localPath}`);
  }

  if (input.remote !== undefined && input.remote.length === 0) {
    throw new Error('Context store remote must not be empty when provided.');
  }

  if (input.branch !== undefined && input.branch.length === 0) {
    throw new Error('Context store branch must not be empty when provided.');
  }

  return {
    type: 'git',
    local_path: normalizeExistingPathForStorage(resolvedPath),
    ...(input.remote ? { remote: input.remote } : {}),
    ...(input.branch ? { branch: input.branch } : {}),
  };
}
