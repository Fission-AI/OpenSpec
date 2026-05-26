import * as nodeFs from 'node:fs';
import * as path from 'node:path';
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';
import { z } from 'zod';

import {
  normalizeContextStoreBinding,
  type ContextStoreBinding,
  type ContextStoreSelector,
} from '../context-store/index.js';
import { getGlobalDataDir } from '../global-config.js';
import { FileSystemUtils } from '../../utils/file-system.js';

const fs = nodeFs.promises;

export const WORKSPACE_METADATA_DIR_NAME = '.openspec-workspace';
export const WORKSPACE_VIEW_STATE_FILE_NAME = 'workspace.yaml';
export const WORKSPACE_SHARED_STATE_FILE_NAME = WORKSPACE_VIEW_STATE_FILE_NAME;
export const WORKSPACE_LOCAL_STATE_FILE_NAME = 'local.yaml';
export const WORKSPACE_LEGACY_LOCAL_STATE_FILE_NAME = 'local.yaml';
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

export interface WorkspaceContextState {
  kind: 'initiative';
  store: ContextStoreBinding;
  initiative: {
    id: string;
  };
}

export interface WorkspaceViewState {
  version: 1;
  name: string;
  context: WorkspaceContextState | null;
  links: Record<string, string | null>;
  preferred_opener?: WorkspacePreferredOpener;
  tools?: string[];
  workspace_skills?: WorkspaceSkillState;
}

export interface WorkspaceSharedState {
  version: 1;
  name: string;
  context: WorkspaceContextState | null;
  links: Record<string, WorkspaceLinkState>;
}

export type WorkspaceLinkState = Record<string, unknown>;

export interface WorkspaceLocalState {
  version: 1;
  paths: Record<string, string>;
  preferred_opener?: WorkspacePreferredOpener;
  tools?: string[];
  workspace_skills?: WorkspaceSkillState;
}

export interface WorkspaceSkillState {
  selected_agents: string[];
  last_applied_profile?: 'core' | 'custom';
  last_applied_delivery?: 'both' | 'skills' | 'commands';
  last_applied_workflow_ids?: string[];
  last_applied_at?: string;
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

export function getWorkspaceViewStatePath(workspaceRoot: string): string {
  return joinWorkspacePath(workspaceRoot, WORKSPACE_VIEW_STATE_FILE_NAME);
}

export function getWorkspaceLegacySharedStatePath(workspaceRoot: string): string {
  return joinWorkspacePath(
    getWorkspaceMetadataDir(workspaceRoot),
    WORKSPACE_VIEW_STATE_FILE_NAME
  );
}

export function getWorkspaceLegacyLocalStatePath(workspaceRoot: string): string {
  return joinWorkspacePath(
    getWorkspaceMetadataDir(workspaceRoot),
    WORKSPACE_LEGACY_LOCAL_STATE_FILE_NAME
  );
}

export function getWorkspaceSharedStatePath(workspaceRoot: string): string {
  return getWorkspaceViewStatePath(workspaceRoot);
}

export function getWorkspaceLocalStatePath(workspaceRoot: string): string {
  return getWorkspaceViewStatePath(workspaceRoot);
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
  return workspaceName ? [getWorkspaceCodeWorkspaceFileName(workspaceName)] : [];
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
  return (
    (await pathIsFile(getWorkspaceViewStatePath(candidateRoot))) ||
    (await pathIsFile(getWorkspaceLegacySharedStatePath(candidateRoot)))
  );
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

const ContextStoreSelectorSchema = z.union([
  z
    .object({
      kind: z.literal('registry'),
      id: z.string(),
    })
    .strict(),
  z
    .object({
      kind: z.literal('path'),
      path: z.string(),
      observed_id: z.string().optional(),
    })
    .strict(),
]);

const ContextStoreBindingSchema = z
  .object({
    id: z.string(),
    selector: ContextStoreSelectorSchema,
  })
  .strict();

const WorkspaceInitiativeContextSchema = z
  .object({
    kind: z.literal('initiative'),
    store: ContextStoreBindingSchema,
    initiative: z
      .object({
        id: z.string(),
      })
      .strict(),
  })
  .strict();

const WorkspaceContextSchema = WorkspaceInitiativeContextSchema;

const WorkspaceSkillStateSchema = z
  .object({
    selected_agents: z.array(z.string()),
    last_applied_profile: z.enum(['core', 'custom']).optional(),
    last_applied_delivery: z.enum(['both', 'skills', 'commands']).optional(),
    last_applied_workflow_ids: z.array(z.string()).optional(),
    last_applied_at: z.string().optional(),
  })
  .strict();

const PreferredOpenerSchema = z
  .object({
    kind: z.enum(['agent', 'editor']),
    id: z.string(),
  })
  .strict();

const ViewStateSchema = z
  .object({
    version: z.literal(1),
    name: z.string(),
    context: WorkspaceContextSchema.nullable(),
    links: z.record(z.string(), z.string().nullable()),
    preferred_opener: PreferredOpenerSchema.optional(),
    tools: z.array(z.string()).optional(),
    workspace_skills: WorkspaceSkillStateSchema.optional(),
  })
  .strict();

const SharedStateSchema = z.object({
  version: z.literal(1),
  name: z.string(),
  context: WorkspaceContextSchema.nullable().optional(),
  links: z.record(z.string(), PlainObjectSchema),
}).strict();

const LocalStateSchema = z.object({
  version: z.literal(1),
  paths: z.record(z.string(), z.string()),
  preferred_opener: PreferredOpenerSchema.optional(),
  tools: z.array(z.string()).optional(),
  workspace_skills: WorkspaceSkillStateSchema.optional(),
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

function normalizeWorkspaceContextState(
  context: z.infer<typeof WorkspaceContextSchema>
): WorkspaceContextState {
  return createWorkspaceInitiativeContext(
    normalizeContextStoreBinding(context.store as ContextStoreBinding),
    context.initiative.id
  );
}

function normalizeOptionalWorkspaceContextState(
  context: z.infer<typeof WorkspaceContextSchema> | null | undefined
): WorkspaceContextState | null {
  return context ? normalizeWorkspaceContextState(context) : null;
}

export function createWorkspaceInitiativeContext(
  store: ContextStoreBinding,
  initiativeId: string
): WorkspaceContextState {
  if (initiativeId.length === 0) {
    throw new Error('Workspace initiative id must not be empty.');
  }

  return {
    kind: 'initiative',
    store: normalizeContextStoreBinding(store),
    initiative: {
      id: initiativeId,
    },
  };
}

export function getWorkspaceContextStoreId(context: WorkspaceContextState): string {
  return context.store.id;
}

export function getWorkspaceContextStoreSelector(
  context: WorkspaceContextState
): ContextStoreSelector {
  return context.store.selector;
}

export function getWorkspaceContextInitiativeId(context: WorkspaceContextState): string {
  return context.initiative.id;
}

export function workspaceViewToSharedState(state: WorkspaceViewState): WorkspaceSharedState {
  return {
    version: 1,
    name: state.name,
    context: state.context,
    links: Object.fromEntries(Object.keys(state.links).map((linkName) => [linkName, {}])),
  };
}

export function workspaceViewToLocalState(state: WorkspaceViewState): WorkspaceLocalState {
  return {
    version: 1,
    paths: Object.fromEntries(
      Object.entries(state.links).filter((entry): entry is [string, string] =>
        typeof entry[1] === 'string'
      )
    ),
    ...(state.preferred_opener ? { preferred_opener: state.preferred_opener } : {}),
    ...(state.tools ? { tools: state.tools } : {}),
    ...(state.workspace_skills ? { workspace_skills: state.workspace_skills } : {}),
  };
}

export function workspaceStatePartsToViewState(
  sharedState: WorkspaceSharedState,
  localState: WorkspaceLocalState | null
): WorkspaceViewState {
  const linkNames = new Set([
    ...Object.keys(sharedState.links),
    ...Object.keys(localState?.paths ?? {}),
  ]);
  const links = Object.fromEntries(
    [...linkNames]
      .sort((a, b) => a.localeCompare(b))
      .map((linkName) => [linkName, localState?.paths[linkName] ?? null] as const)
  );

  return {
    version: 1,
    name: sharedState.name,
    context: sharedState.context,
    links,
    ...(localState?.preferred_opener ? { preferred_opener: localState.preferred_opener } : {}),
    ...(localState?.tools ? { tools: localState.tools } : {}),
    ...(localState?.workspace_skills ? { workspace_skills: localState.workspace_skills } : {}),
  };
}

export function parseWorkspaceViewState(content: string): WorkspaceViewState {
  const raw = parseYamlObject(content, 'workspace state');
  const result = ViewStateSchema.safeParse(raw);

  if (!result.success) {
    throw new Error(`Invalid workspace state: ${formatZodIssues(result.error)}`);
  }

  validateWorkspaceName(result.data.name);
  assertValidMapKeys(
    Object.keys(result.data.links),
    validateWorkspaceLinkName,
    'workspace link name'
  );

  const preferredOpener = result.data.preferred_opener
    ? validateWorkspacePreferredOpener(result.data.preferred_opener as WorkspacePreferredOpener)
    : undefined;

  return {
    version: 1,
    name: result.data.name,
    context: normalizeOptionalWorkspaceContextState(result.data.context),
    links: result.data.links,
    ...(preferredOpener ? { preferred_opener: preferredOpener } : {}),
    ...(result.data.tools ? { tools: result.data.tools } : {}),
    ...(result.data.workspace_skills
      ? { workspace_skills: result.data.workspace_skills }
      : {}),
  };
}

export function parseWorkspaceSharedState(content: string): WorkspaceSharedState {
  const raw = parseYamlObject(content, 'workspace shared state');
  const viewResult = ViewStateSchema.safeParse(raw);

  if (viewResult.success) {
    return workspaceViewToSharedState(parseWorkspaceViewState(content));
  }

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
    context: normalizeOptionalWorkspaceContextState(result.data.context),
    links: result.data.links,
  };
}

export function parseWorkspaceLocalState(content: string): WorkspaceLocalState {
  const raw = parseYamlObject(content, 'workspace local state');
  const viewResult = ViewStateSchema.safeParse(raw);

  if (viewResult.success) {
    return workspaceViewToLocalState(parseWorkspaceViewState(content));
  }

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
    ...(result.data.tools ? { tools: result.data.tools } : {}),
    ...(result.data.workspace_skills ? { workspace_skills: result.data.workspace_skills } : {}),
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

export function serializeWorkspaceViewState(state: WorkspaceViewState): string {
  validateWorkspaceName(state.name);
  assertValidMapKeys(Object.keys(state.links), validateWorkspaceLinkName, 'workspace link name');

  for (const [linkName, localPath] of Object.entries(state.links)) {
    if (localPath !== null && typeof localPath !== 'string') {
      throw new Error(`Invalid workspace link '${linkName}': path must be a string or null`);
    }
  }

  const preferredOpener = state.preferred_opener
    ? validateWorkspacePreferredOpener(state.preferred_opener)
    : undefined;

  return stringifyYaml({
    version: 1,
    name: state.name,
    context: state.context ? normalizeWorkspaceContextState(state.context) : null,
    links: state.links,
    ...(preferredOpener ? { preferred_opener: preferredOpener } : {}),
    ...(state.tools ? { tools: state.tools } : {}),
    ...(state.workspace_skills ? { workspace_skills: state.workspace_skills } : {}),
  });
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
    context: state.context ? normalizeWorkspaceContextState(state.context) : null,
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
    ...(state.tools ? { tools: state.tools } : {}),
    ...(state.workspace_skills ? { workspace_skills: state.workspace_skills } : {}),
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

export async function listKnownWorkspaceEntries(
  options: WorkspacePathOptions = {}
): Promise<WorkspaceRegistryEntry[]> {
  const legacyRegistry = await readWorkspaceRegistryState(options);
  const workspaces = new Map<string, string>(Object.entries(legacyRegistry?.workspaces ?? {}));

  for (const entry of await listManagedWorkspaceEntries(options)) {
    workspaces.set(entry.name, entry.workspaceRoot);
  }

  return [...workspaces.entries()]
    .map(([name, workspaceRoot]) => ({ name, workspaceRoot }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function listManagedWorkspaceEntries(
  options: WorkspacePathOptions = {}
): Promise<WorkspaceRegistryEntry[]> {
  const workspacesDir = getManagedWorkspacesDir(options);

  if (!(await pathIsDirectory(workspacesDir))) {
    return [];
  }

  const entries = await fs.readdir(workspacesDir, { withFileTypes: true });
  const workspaces: WorkspaceRegistryEntry[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }

    const workspaceRoot = joinWorkspacePath(workspacesDir, entry.name);
    if (!(await isWorkspaceRoot(workspaceRoot))) {
      continue;
    }

    try {
      const state = await readWorkspaceViewState(workspaceRoot);
      workspaces.push({ name: state.name, workspaceRoot });
    } catch {
      workspaces.push({ name: entry.name, workspaceRoot });
    }
  }

  return workspaces.sort((a, b) => a.name.localeCompare(b.name));
}

export async function readWorkspaceSharedState(workspaceRoot: string): Promise<WorkspaceSharedState> {
  return workspaceViewToSharedState(await readWorkspaceViewState(workspaceRoot));
}

export async function readWorkspaceLocalState(workspaceRoot: string): Promise<WorkspaceLocalState> {
  return workspaceViewToLocalState(await readWorkspaceViewState(workspaceRoot));
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

export async function readWorkspaceViewState(workspaceRoot: string): Promise<WorkspaceViewState> {
  const viewStatePath = getWorkspaceViewStatePath(workspaceRoot);

  if (await pathIsFile(viewStatePath)) {
    return parseWorkspaceViewState(await fs.readFile(viewStatePath, 'utf-8'));
  }

  const legacySharedState = parseWorkspaceSharedState(
    await fs.readFile(getWorkspaceLegacySharedStatePath(workspaceRoot), 'utf-8')
  );
  let legacyLocalState: WorkspaceLocalState | null = null;

  try {
    legacyLocalState = parseWorkspaceLocalState(
      await fs.readFile(getWorkspaceLegacyLocalStatePath(workspaceRoot), 'utf-8')
    );
  } catch (error) {
    if (!isFileNotFoundError(error)) {
      throw error;
    }
  }

  return workspaceStatePartsToViewState(legacySharedState, legacyLocalState);
}

export async function readOptionalWorkspaceViewState(
  workspaceRoot: string
): Promise<WorkspaceViewState | null> {
  try {
    return await readWorkspaceViewState(workspaceRoot);
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
  const existing = await readOptionalWorkspaceViewState(workspaceRoot);
  await writeWorkspaceViewState(
    workspaceRoot,
    workspaceStatePartsToViewState(state, existing ? workspaceViewToLocalState(existing) : null)
  );
}

export async function writeWorkspaceLocalState(
  workspaceRoot: string,
  state: WorkspaceLocalState
): Promise<void> {
  const existing = await readOptionalWorkspaceViewState(workspaceRoot);
  const sharedState = existing
    ? workspaceViewToSharedState(existing)
    : {
        version: 1 as const,
        name: validateWorkspaceName(path.basename(workspaceRoot)),
        context: null,
        links: {},
      };

  await writeWorkspaceViewState(workspaceRoot, workspaceStatePartsToViewState(sharedState, state));
}

export async function writeWorkspaceViewState(
  workspaceRoot: string,
  state: WorkspaceViewState
): Promise<void> {
  await FileSystemUtils.writeFile(
    getWorkspaceViewStatePath(workspaceRoot),
    serializeWorkspaceViewState(state)
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
