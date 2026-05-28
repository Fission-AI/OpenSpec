import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';
import { z } from 'zod';

import {
  normalizeContextStoreBinding,
  type ContextStoreBinding,
  type ContextStoreSelector,
} from '../context-store/index.js';
import { FileSystemUtils } from '../../utils/file-system.js';

export const WORKSPACE_METADATA_DIR_NAME = '.openspec-workspace';
export const WORKSPACE_VIEW_STATE_FILE_NAME = 'workspace.yaml';
export const WORKSPACE_CHANGES_DIR_NAME = 'changes';
export const WORKSPACE_CODE_WORKSPACE_EXTENSION = '.code-workspace';

export const WORKSPACE_SUPPORTED_OPENER_VALUES = [
  'codex-cli',
  'claude',
  'github-copilot',
  'editor',
] as const;

export const WORKSPACE_AGENT_OPENER_IDS = [
  'codex-cli',
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

export interface WorkspaceSkillState {
  selected_agents: string[];
  last_applied_profile?: 'core' | 'custom';
  last_applied_delivery?: 'both' | 'skills' | 'commands';
  last_applied_workflow_ids?: string[];
  last_applied_at?: string;
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

export function getWorkspaceChangesDir(workspaceRoot: string): string {
  return joinWorkspacePath(workspaceRoot, WORKSPACE_CHANGES_DIR_NAME);
}

export function getWorkspaceCodeWorkspaceFileName(workspaceName: string): string {
  validateWorkspaceName(workspaceName);
  return `${workspaceName}${WORKSPACE_CODE_WORKSPACE_EXTENSION}`;
}

export function getWorkspaceCodeWorkspacePath(workspaceRoot: string, workspaceName: string): string {
  return joinWorkspacePath(workspaceRoot, getWorkspaceCodeWorkspaceFileName(workspaceName));
}

/**
 * @deprecated Managed workspaces no longer create portable ignore rules.
 * This compatibility shim remains for callers that still ask which ignore
 * patterns OpenSpec owns for workspace-local generated files.
 */
export function getWorkspacePortableIgnorePatterns(_workspaceName?: string): string[] {
  return [];
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

function normalizeWorkspaceAgentOpenerId(value: string): WorkspaceAgentOpenerId | null {
  if (value === 'codex') {
    return 'codex-cli';
  }

  if (isWorkspaceAgentOpenerId(value)) {
    return value;
  }

  return null;
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

  const agentId = normalizeWorkspaceAgentOpenerId(value);
  if (agentId) {
    return {
      kind: 'agent',
      id: agentId,
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

  if (opener.kind === 'agent') {
    const agentId = normalizeWorkspaceAgentOpenerId(opener.id);
    if (agentId) {
      return {
        kind: 'agent',
        id: agentId,
      };
    }
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
