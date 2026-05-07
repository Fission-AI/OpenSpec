import * as nodeFs from 'node:fs';
import * as path from 'node:path';
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';
import { z } from 'zod';

import { getGlobalDataDir } from '../global-config.js';
import { FileSystemUtils } from '../../utils/file-system.js';

const fs = nodeFs.promises;

export const WORKSPACE_METADATA_DIR_NAME = '.openspec-workspace';
export const WORKSPACE_SHARED_STATE_FILE_NAME = 'workspace.yaml';
export const WORKSPACE_LOCAL_STATE_FILE_NAME = 'local.yaml';
export const WORKSPACE_CHANGES_DIR_NAME = 'changes';
export const MANAGED_WORKSPACES_DIR_NAME = 'workspaces';
export const WORKSPACE_REGISTRY_FILE_NAME = 'registry.yaml';
export const WORKSPACE_LOCAL_STATE_IGNORE_PATTERN = `${WORKSPACE_METADATA_DIR_NAME}/${WORKSPACE_LOCAL_STATE_FILE_NAME}`;
export const WORKSPACE_CODE_WORKSPACE_EXTENSION = '.code-workspace';

export const WORKSPACE_SUPPORTED_OPENER_VALUES = [
  'codex',
  'claude',
  'github-copilot',
  'editor',
] as const;

export const WORKSPACE_AGENT_OPENER_IDS = [
  'codex',
  'claude',
  'github-copilot',
] as const;

export const WORKSPACE_EDITOR_OPENER_IDS = ['vscode'] as const;

export type WorkspaceSupportedOpenerValue = typeof WORKSPACE_SUPPORTED_OPENER_VALUES[number];
export type WorkspaceAgentOpenerId = typeof WORKSPACE_AGENT_OPENER_IDS[number];
export type WorkspaceEditorOpenerId = typeof WORKSPACE_EDITOR_OPENER_IDS[number];

export type WorkspacePreferredOpener =
  | {
      kind: 'agent';
      id: WorkspaceAgentOpenerId;
    }
  | {
      kind: 'editor';
      id: WorkspaceEditorOpenerId;
    };

export interface WorkspaceSharedState {
  version: 1;
  name: string;
  links: Record<string, WorkspaceLinkState>;
}

export type WorkspaceLinkState = Record<string, unknown>;

export interface WorkspaceLocalState {
  version: 1;
  paths: Record<string, string>;
  preferred_opener?: WorkspacePreferredOpener;
}

export interface WorkspaceRegistryState {
  version: 1;
  workspaces: Record<string, string>;
}

export interface WorkspaceRegistryEntry {
  name: string;
  workspaceRoot: string;
}

export interface WorkspacePathOptions {
  globalDataDir?: string;
}

function joinWorkspacePath(basePath: string, ...segments: string[]): string {
  return FileSystemUtils.joinPath(basePath, ...segments);
}

export function getWorkspaceMetadataDir(workspaceRoot: string): string {
  return joinWorkspacePath(workspaceRoot, WORKSPACE_METADATA_DIR_NAME);
}

export function getWorkspaceSharedStatePath(workspaceRoot: string): string {
  return joinWorkspacePath(
    getWorkspaceMetadataDir(workspaceRoot),
    WORKSPACE_SHARED_STATE_FILE_NAME
  );
}

export function getWorkspaceLocalStatePath(workspaceRoot: string): string {
  return joinWorkspacePath(
    getWorkspaceMetadataDir(workspaceRoot),
    WORKSPACE_LOCAL_STATE_FILE_NAME
  );
}

export function getWorkspaceChangesDir(workspaceRoot: string): string {
  return joinWorkspacePath(workspaceRoot, WORKSPACE_CHANGES_DIR_NAME);
}

export function getManagedWorkspacesDir(options: WorkspacePathOptions = {}): string {
  return joinWorkspacePath(options.globalDataDir ?? getGlobalDataDir(), MANAGED_WORKSPACES_DIR_NAME);
}

export function getManagedWorkspaceRoot(
  workspaceName: string,
  options: WorkspacePathOptions = {}
): string {
  validateWorkspaceName(workspaceName);
  return joinWorkspacePath(getManagedWorkspacesDir(options), workspaceName);
}

export function getWorkspaceRegistryPath(options: WorkspacePathOptions = {}): string {
  return joinWorkspacePath(getManagedWorkspacesDir(options), WORKSPACE_REGISTRY_FILE_NAME);
}

export function getWorkspaceCodeWorkspaceFileName(workspaceName: string): string {
  validateWorkspaceName(workspaceName);
  return `${workspaceName}${WORKSPACE_CODE_WORKSPACE_EXTENSION}`;
}

export function getWorkspaceCodeWorkspacePath(workspaceRoot: string, workspaceName: string): string {
  return joinWorkspacePath(workspaceRoot, getWorkspaceCodeWorkspaceFileName(workspaceName));
}

export function getWorkspacePortableIgnorePatterns(workspaceName?: string): string[] {
  return workspaceName
    ? [WORKSPACE_LOCAL_STATE_IGNORE_PATTERN, getWorkspaceCodeWorkspaceFileName(workspaceName)]
    : [WORKSPACE_LOCAL_STATE_IGNORE_PATTERN];
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

export function validateWorkspaceName(name: string): string {
  validateFolderStyleName(name, 'Workspace name');

  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(name)) {
    throw new Error(
      'Workspace name must be kebab-case with lowercase letters, numbers, and single hyphen separators'
    );
  }

  return name;
}

export function validateWorkspaceLinkName(name: string): string {
  return validateFolderStyleName(name, 'Workspace link name');
}

export function isValidWorkspaceName(name: string): boolean {
  try {
    validateWorkspaceName(name);
    return true;
  } catch {
    return false;
  }
}

export function isValidWorkspaceLinkName(name: string): boolean {
  try {
    validateWorkspaceLinkName(name);
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

export async function isWorkspaceRoot(candidateRoot: string): Promise<boolean> {
  return pathIsFile(getWorkspaceSharedStatePath(candidateRoot));
}

async function getSearchStartDirectory(startPath: string): Promise<string> {
  const resolvedStart = path.resolve(startPath);

  try {
    const stats = await fs.stat(resolvedStart);
    return stats.isDirectory() ? resolvedStart : path.dirname(resolvedStart);
  } catch {
    return resolvedStart;
  }
}

export async function findWorkspaceRoot(startPath = process.cwd()): Promise<string | null> {
  let currentDir = await getSearchStartDirectory(startPath);

  while (true) {
    if (await isWorkspaceRoot(currentDir)) {
      return process.platform === 'win32'
        ? FileSystemUtils.canonicalizeExistingPath(currentDir)
        : currentDir;
    }

    const parentDir = path.dirname(currentDir);
    if (parentDir === currentDir) {
      return null;
    }

    currentDir = parentDir;
  }
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

const PlainObjectSchema = z.custom<Record<string, unknown>>(isPlainObject, {
  message: 'must be an object',
});

const SharedStateSchema = z.object({
  version: z.literal(1),
  name: z.string(),
  links: z.record(z.string(), PlainObjectSchema),
}).strict();

const LocalStateSchema = z.object({
  version: z.literal(1),
  paths: z.record(z.string(), z.string()),
  preferred_opener: z
    .object({
      kind: z.enum(['agent', 'editor']),
      id: z.string(),
    })
    .strict()
    .optional(),
}).strict();

const RegistryStateSchema = z.object({
  version: z.literal(1),
  workspaces: z.record(z.string(), z.string()),
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

function assertValidMapKeys(
  keys: string[],
  validator: (name: string) => string,
  label: string
): void {
  for (const key of keys) {
    try {
      validator(key);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Invalid ${label} '${key}': ${message}`);
    }
  }
}

function formatSupportedOpenerValues(): string {
  return WORKSPACE_SUPPORTED_OPENER_VALUES.join(', ');
}

export function isWorkspaceAgentOpenerId(value: string): value is WorkspaceAgentOpenerId {
  return (WORKSPACE_AGENT_OPENER_IDS as readonly string[]).includes(value);
}

export function isWorkspaceSupportedOpenerValue(
  value: string
): value is WorkspaceSupportedOpenerValue {
  return (WORKSPACE_SUPPORTED_OPENER_VALUES as readonly string[]).includes(value);
}

export function parseWorkspacePreferredOpenerValue(value: string): WorkspacePreferredOpener {
  if (value === 'editor') {
    return {
      kind: 'editor',
      id: 'vscode',
    };
  }

  if (isWorkspaceAgentOpenerId(value)) {
    return {
      kind: 'agent',
      id: value,
    };
  }

  throw new Error(
    `Unsupported workspace opener '${value}'. Supported values: ${formatSupportedOpenerValues()}`
  );
}

export function validateWorkspacePreferredOpener(
  opener: WorkspacePreferredOpener
): WorkspacePreferredOpener {
  if (opener.kind === 'editor' && opener.id === 'vscode') {
    return opener;
  }

  if (opener.kind === 'agent' && isWorkspaceAgentOpenerId(opener.id)) {
    return opener;
  }

  throw new Error(
    `Unsupported workspace opener '${opener.kind}:${opener.id}'. Supported values: ${formatSupportedOpenerValues()}`
  );
}

export function parseWorkspaceSharedState(content: string): WorkspaceSharedState {
  const raw = parseYamlObject(content, 'workspace shared state');
  const result = SharedStateSchema.safeParse(raw);

  if (!result.success) {
    throw new Error(`Invalid workspace shared state: ${formatZodIssues(result.error)}`);
  }

  validateWorkspaceName(result.data.name);
  assertValidMapKeys(
    Object.keys(result.data.links),
    validateWorkspaceLinkName,
    'workspace link name'
  );

  return {
    version: 1,
    name: result.data.name,
    links: result.data.links,
  };
}

export function parseWorkspaceLocalState(content: string): WorkspaceLocalState {
  const raw = parseYamlObject(content, 'workspace local state');
  const result = LocalStateSchema.safeParse(raw);

  if (!result.success) {
    throw new Error(`Invalid workspace local state: ${formatZodIssues(result.error)}`);
  }

  assertValidMapKeys(
    Object.keys(result.data.paths),
    validateWorkspaceLinkName,
    'workspace local path name'
  );

  const preferredOpener = result.data.preferred_opener
    ? validateWorkspacePreferredOpener(result.data.preferred_opener as WorkspacePreferredOpener)
    : undefined;

  return {
    version: 1,
    paths: result.data.paths,
    ...(preferredOpener ? { preferred_opener: preferredOpener } : {}),
  };
}

export function parseWorkspaceRegistryState(content: string): WorkspaceRegistryState {
  const raw = parseYamlObject(content, 'workspace registry state');
  const result = RegistryStateSchema.safeParse(raw);

  if (!result.success) {
    throw new Error(`Invalid workspace registry state: ${formatZodIssues(result.error)}`);
  }

  assertValidMapKeys(
    Object.keys(result.data.workspaces),
    validateWorkspaceName,
    'workspace registry name'
  );

  return {
    version: 1,
    workspaces: result.data.workspaces,
  };
}

export function serializeWorkspaceSharedState(state: WorkspaceSharedState): string {
  validateWorkspaceName(state.name);
  assertValidMapKeys(Object.keys(state.links), validateWorkspaceLinkName, 'workspace link name');

  for (const [linkName, linkState] of Object.entries(state.links)) {
    if (!isPlainObject(linkState)) {
      throw new Error(`Invalid workspace link '${linkName}': link state must be an object`);
    }
  }

  return stringifyYaml({
    version: 1,
    name: state.name,
    links: state.links,
  });
}

export function serializeWorkspaceLocalState(state: WorkspaceLocalState): string {
  assertValidMapKeys(
    Object.keys(state.paths),
    validateWorkspaceLinkName,
    'workspace local path name'
  );

  for (const [linkName, localPath] of Object.entries(state.paths)) {
    if (typeof localPath !== 'string') {
      throw new Error(`Invalid workspace local path '${linkName}': path must be a string`);
    }
  }

  const preferredOpener = state.preferred_opener
    ? validateWorkspacePreferredOpener(state.preferred_opener)
    : undefined;

  return stringifyYaml({
    version: 1,
    paths: state.paths,
    ...(preferredOpener ? { preferred_opener: preferredOpener } : {}),
  });
}

export function serializeWorkspaceRegistryState(state: WorkspaceRegistryState): string {
  assertValidMapKeys(
    Object.keys(state.workspaces),
    validateWorkspaceName,
    'workspace registry name'
  );

  for (const [workspaceName, workspaceRoot] of Object.entries(state.workspaces)) {
    if (typeof workspaceRoot !== 'string') {
      throw new Error(`Invalid workspace registry entry '${workspaceName}': path must be a string`);
    }
  }

  return stringifyYaml({
    version: 1,
    workspaces: state.workspaces,
  });
}

export function listWorkspaceRegistryEntries(
  registry: WorkspaceRegistryState
): WorkspaceRegistryEntry[] {
  return Object.entries(registry.workspaces)
    .map(([name, workspaceRoot]) => ({ name, workspaceRoot }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function readWorkspaceSharedState(workspaceRoot: string): Promise<WorkspaceSharedState> {
  return parseWorkspaceSharedState(
    await fs.readFile(getWorkspaceSharedStatePath(workspaceRoot), 'utf-8')
  );
}

export async function readWorkspaceLocalState(workspaceRoot: string): Promise<WorkspaceLocalState> {
  return parseWorkspaceLocalState(
    await fs.readFile(getWorkspaceLocalStatePath(workspaceRoot), 'utf-8')
  );
}

function isFileNotFoundError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as NodeJS.ErrnoException).code === 'ENOENT'
  );
}

export async function readOptionalWorkspaceLocalState(
  workspaceRoot: string
): Promise<WorkspaceLocalState | null> {
  try {
    return await readWorkspaceLocalState(workspaceRoot);
  } catch (error) {
    if (isFileNotFoundError(error)) {
      return null;
    }

    throw error;
  }
}

export async function writeWorkspaceSharedState(
  workspaceRoot: string,
  state: WorkspaceSharedState
): Promise<void> {
  await FileSystemUtils.writeFile(
    getWorkspaceSharedStatePath(workspaceRoot),
    serializeWorkspaceSharedState(state)
  );
}

export async function writeWorkspaceLocalState(
  workspaceRoot: string,
  state: WorkspaceLocalState
): Promise<void> {
  await FileSystemUtils.writeFile(
    getWorkspaceLocalStatePath(workspaceRoot),
    serializeWorkspaceLocalState(state)
  );
}

export async function readWorkspaceRegistryState(
  options: WorkspacePathOptions = {}
): Promise<WorkspaceRegistryState | null> {
  const registryPath = getWorkspaceRegistryPath(options);

  if (!(await pathIsFile(registryPath))) {
    return null;
  }

  return parseWorkspaceRegistryState(await fs.readFile(registryPath, 'utf-8'));
}

export async function writeWorkspaceRegistryState(
  state: WorkspaceRegistryState,
  options: WorkspacePathOptions = {}
): Promise<void> {
  await FileSystemUtils.writeFile(
    getWorkspaceRegistryPath(options),
    serializeWorkspaceRegistryState(state)
  );
}

export async function workspaceChangesDirExists(workspaceRoot: string): Promise<boolean> {
  return pathIsDirectory(getWorkspaceChangesDir(workspaceRoot));
}
