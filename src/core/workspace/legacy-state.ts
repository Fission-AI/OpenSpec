import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';
import { z } from 'zod';

import {
  WORKSPACE_METADATA_DIR_NAME,
  WORKSPACE_VIEW_STATE_FILE_NAME,
  getWorkspaceMetadataDir,
  parseWorkspaceViewState,
  validateWorkspaceLinkName,
  validateWorkspaceName,
  validateWorkspacePreferredOpener,
  type WorkspaceContextState,
  type WorkspacePreferredOpener,
  type WorkspaceSkillState,
  type WorkspaceViewState,
} from './foundation.js';
import { FileSystemUtils } from '../../utils/file-system.js';

export const WORKSPACE_LEGACY_SHARED_STATE_FILE_NAME = WORKSPACE_VIEW_STATE_FILE_NAME;
export const WORKSPACE_LEGACY_LOCAL_STATE_FILE_NAME = 'local.yaml';
export const WORKSPACE_LEGACY_LOCAL_STATE_IGNORE_PATTERN =
  `${WORKSPACE_METADATA_DIR_NAME}/${WORKSPACE_LEGACY_LOCAL_STATE_FILE_NAME}`;

export type WorkspaceLinkState = Record<string, unknown>;

export interface WorkspaceSharedState {
  version: 1;
  name: string;
  context: WorkspaceContextState | null;
  links: Record<string, WorkspaceLinkState>;
}

export interface WorkspaceLocalState {
  version: 1;
  paths: Record<string, string>;
  preferred_opener?: WorkspacePreferredOpener;
  tools?: string[];
  workspace_skills?: WorkspaceSkillState;
}

function joinWorkspacePath(basePath: string, ...segments: string[]): string {
  return FileSystemUtils.joinPath(basePath, ...segments);
}

export function getWorkspaceLegacySharedStatePath(workspaceRoot: string): string {
  return joinWorkspacePath(
    getWorkspaceMetadataDir(workspaceRoot),
    WORKSPACE_LEGACY_SHARED_STATE_FILE_NAME
  );
}

export function getWorkspaceLegacyLocalStatePath(workspaceRoot: string): string {
  return joinWorkspacePath(
    getWorkspaceMetadataDir(workspaceRoot),
    WORKSPACE_LEGACY_LOCAL_STATE_FILE_NAME
  );
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

const PlainObjectSchema = z.custom<Record<string, unknown>>(isPlainObject, {
  message: 'must be an object',
});

const PreferredOpenerSchema = z
  .object({
    kind: z.enum(['agent', 'editor']),
    id: z.string(),
  })
  .strict();

const WorkspaceSkillStateSchema = z
  .object({
    selected_agents: z.array(z.string()),
    last_applied_profile: z.enum(['core', 'custom']).optional(),
    last_applied_delivery: z.enum(['both', 'skills', 'commands']).optional(),
    last_applied_workflow_ids: z.array(z.string()).optional(),
    last_applied_at: z.string().optional(),
  })
  .strict();

const SharedStateSchema = z.object({
  version: z.literal(1),
  name: z.string(),
  context: z.unknown().optional(),
  links: z.record(z.string(), PlainObjectSchema),
}).strict();

const LocalStateSchema = z.object({
  version: z.literal(1),
  paths: z.record(z.string(), z.string()),
  preferred_opener: PreferredOpenerSchema.optional(),
  tools: z.array(z.string()).optional(),
  workspace_skills: WorkspaceSkillStateSchema.optional(),
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

function normalizeLegacyWorkspaceContext(
  name: string,
  context: unknown
): WorkspaceContextState | null {
  return parseWorkspaceViewState(stringifyYaml({
    version: 1,
    name,
    context: context ?? null,
    links: {},
  })).context;
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

export function parseWorkspaceSharedState(content: string): WorkspaceSharedState {
  const raw = parseYamlObject(content, 'workspace shared state');

  try {
    return workspaceViewToSharedState(parseWorkspaceViewState(content));
  } catch {
    // Fall through to the legacy shared schema.
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
    context: normalizeLegacyWorkspaceContext(result.data.name, result.data.context),
    links: result.data.links,
  };
}

export function parseWorkspaceLocalState(content: string): WorkspaceLocalState {
  const raw = parseYamlObject(content, 'workspace local state');

  try {
    return workspaceViewToLocalState(parseWorkspaceViewState(content));
  } catch {
    // Fall through to the legacy local schema.
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
    context: state.context,
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
