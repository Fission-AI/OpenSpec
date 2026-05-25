import * as nodeFs from 'node:fs';
import * as path from 'node:path';
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';
import { z } from 'zod';

import { getGlobalDataDir } from '../global-config.js';
import { FileSystemUtils } from '../../utils/file-system.js';

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
  validateFolderStyleName(id, 'Context store id');

  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(id)) {
    throw new Error(
      'Context store id must be kebab-case with lowercase letters, numbers, and single hyphen separators'
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
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as NodeJS.ErrnoException).code === 'ENOENT'
  );
}

function normalizeExistingPathForStorage(existingPath: string): string {
  return process.platform === 'win32'
    ? FileSystemUtils.canonicalizeExistingPath(existingPath)
    : existingPath;
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

function parseYamlObject(content: string, label: string): unknown {
  try {
    return parseYaml(content);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Invalid ${label}: ${message}`);
  }
}

function assertValidContextStoreIds(ids: string[], label: string): void {
  for (const id of ids) {
    try {
      validateContextStoreId(id);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Invalid ${label} '${id}': ${message}`);
    }
  }
}

export function parseContextStoreRegistryState(content: string): ContextStoreRegistryState {
  const raw = parseYamlObject(content, 'context store registry state');
  const result = RegistryStateSchema.safeParse(raw);

  if (!result.success) {
    throw new Error(`Invalid context store registry state: ${formatZodIssues(result.error)}`);
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
    throw new Error(`Invalid context store metadata state: ${formatZodIssues(result.error)}`);
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
    throw new Error(`Invalid context store registry state: ${formatZodIssues(result.error)}`);
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
    throw new Error(`Invalid context store metadata state: ${formatZodIssues(result.error)}`);
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
  await FileSystemUtils.writeFile(
    getContextStoreRegistryPath(options),
    serializeContextStoreRegistryState(state)
  );
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
