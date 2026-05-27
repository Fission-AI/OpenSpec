import * as nodeFs from 'node:fs';
import * as path from 'node:path';

import {
  WorkspacePreferredOpener,
  WorkspaceRegistryEntry,
  WorkspaceContextState,
  WorkspaceViewState,
  getWorkspaceContextInitiativeId,
  getWorkspaceContextStoreId,
  getManagedWorkspaceRoot,
  hasWorkspaceSkillProfileDrift,
  getWorkspaceChangesDir,
  getWorkspaceViewStatePath,
  isWorkspaceRoot,
  listKnownWorkspaceEntries,
  parseWorkspaceSetupLinkInput,
  readWorkspaceViewState,
  syncWorkspaceOpenSurface,
  validateWorkspaceLinkName,
  validateWorkspaceName,
  writeWorkspaceViewState,
} from '../../core/workspace/index.js';
import {
  formatContextStoreBinding,
  sameContextStoreBinding,
} from '../../core/context-store/index.js';
import { FileSystemUtils } from '../../utils/file-system.js';
import {
  SelectedWorkspace,
  WorkspaceCliError,
  WorkspaceContextOutput,
  WorkspaceLinkMutationPayload,
  WorkspaceLinkOutput,
  WorkspaceListOutput,
  WorkspaceOutput,
  WorkspaceStatus,
  asErrorMessage,
  makeStatus,
} from './types.js';
import { collectWorkspaceContextStatuses } from './context-status.js';

const fs = nodeFs.promises;

export async function directoryExists(dirPath: string): Promise<boolean> {
  try {
    return (await fs.stat(dirPath)).isDirectory();
  } catch {
    return false;
  }
}

function normalizeExistingPathForStorage(existingPath: string): string {
  return FileSystemUtils.canonicalizeExistingPath(existingPath);
}

export async function resolveExistingDirectory(
  inputPath: string,
  cwd = process.cwd()
): Promise<string> {
  if (inputPath.length === 0) {
    throw new WorkspaceCliError('Repo or folder path must not be empty.', 'linked_path_empty', {
      target: 'link.path',
      fix: 'Choose an existing repo or folder path.',
    });
  }

  const resolvedPath = path.isAbsolute(inputPath)
    ? path.resolve(inputPath)
    : path.resolve(cwd, inputPath);

  if (!(await directoryExists(resolvedPath))) {
    throw new WorkspaceCliError(
      `Path '${inputPath}' is not an existing folder.`,
      'linked_path_missing',
      {
        target: 'link.path',
        fix: 'Choose an existing repo or folder path.',
      }
    );
  }

  return normalizeExistingPathForStorage(resolvedPath);
}

export function inferLinkName(absolutePath: string): string {
  return path.basename(absolutePath);
}

function normalizeLinksForOutput(
  viewState: WorkspaceViewState
): WorkspaceLinkOutput[] {
  return Object.keys(viewState.links)
    .sort((a, b) => a.localeCompare(b))
    .map((name) => ({
      name,
      path: viewState.links[name] ?? null,
      status: [],
    }));
}

function workspaceContextToOutput(
  context: WorkspaceContextState | null
): WorkspaceContextOutput | null {
  if (!context) {
    return null;
  }

  return {
    store: getWorkspaceContextStoreId(context),
    initiative: getWorkspaceContextInitiativeId(context),
    store_selector: context.store.selector,
  };
}

function formatDuplicateLinkMessage(
  linkName: string,
  existingPath: string | null,
  replacementPath: string
): string {
  return [
    `Cannot use link name '${linkName}' because another link already uses that name.`,
    'Existing link:',
    `  ${linkName} -> ${existingPath ?? '(no local path recorded)'}`,
    '',
    'Choose a different link name:',
    `  openspec workspace link archived-${linkName} ${replacementPath}`,
    '',
    'If you meant to change the existing link path:',
    `  openspec workspace relink ${linkName} ${replacementPath}`,
  ].join('\n');
}

function duplicateLinkError(
  linkName: string,
  existingPath: string | null,
  replacementPath: string
): WorkspaceCliError {
  return new WorkspaceCliError(
    formatDuplicateLinkMessage(linkName, existingPath, replacementPath),
    'duplicate_link_name',
    {
      target: `links.${linkName}`,
      fix: `Choose a different link name or run 'openspec workspace relink ${linkName} ${replacementPath}'.`,
    }
  );
}

function hasWorkspaceLink(
  links: Record<string, string | null>,
  linkName: string
): boolean {
  return Object.prototype.hasOwnProperty.call(links, linkName);
}

function duplicateSetupLinkError(
  linkName: string,
  existingPath: string,
  replacementPath: string
): WorkspaceCliError {
  return new WorkspaceCliError(
    [
      `Cannot use link name '${linkName}' because another setup link already uses that name.`,
      'Existing link:',
      `  ${linkName} -> ${existingPath}`,
      '',
      'Use explicit --link <name>=<path> values with different names.',
    ].join('\n'),
    'duplicate_link_name',
    {
      target: `links.${linkName}`,
      fix: `Use explicit --link ${linkName}-alt=${replacementPath} with a different link name.`,
    }
  );
}

export function validateWorkspaceNameForSetup(name: string): string {
  try {
    return validateWorkspaceName(name);
  } catch {
    throw new WorkspaceCliError(
      'Workspace name must be kebab-case with lowercase letters, numbers, and single hyphen separators.',
      'invalid_workspace_name',
      {
        target: 'workspace.name',
      }
    );
  }
}

export function validateLinkNameForCommand(name: string): string {
  try {
    return validateWorkspaceLinkName(name);
  } catch (error) {
    throw new WorkspaceCliError(asErrorMessage(error), 'invalid_link_name', {
      target: 'link.name',
    });
  }
}

function localStateInvalidStatus(error: unknown): WorkspaceStatus {
  return makeStatus(
    'error',
    'workspace_local_state_invalid',
    `Machine-local paths could not be read: ${asErrorMessage(error)}`,
    {
      target: 'workspace.local_state',
      fix: 'Repair workspace.yaml, then run openspec workspace relink <name> <path> for affected links.',
    }
  );
}

function workspaceSkillDriftStatus(workspaceName: string): WorkspaceStatus {
  return makeStatus(
    'warning',
    'workspace_skills_out_of_sync',
    'Workspace-local agent skills are out of sync with the active global profile.',
    {
      target: 'workspace.skills',
      fix: `openspec workspace update --workspace ${workspaceName}`,
    }
  );
}

function appendWorkspaceSkillDriftStatus(
  statuses: WorkspaceStatus[],
  workspaceName: string,
  viewState: WorkspaceViewState | null
): void {
  if (hasWorkspaceSkillProfileDrift(viewState)) {
    statuses.push(workspaceSkillDriftStatus(workspaceName));
  }
}

export async function createManagedWorkspace(
  name: string,
  links: Record<string, string>,
  preferredOpener?: WorkspacePreferredOpener,
  context: WorkspaceContextState | null = null,
  tools?: string[]
): Promise<WorkspaceOutput> {
  const workspaceName = validateWorkspaceNameForSetup(name);
  const targetWorkspaceRoot = getManagedWorkspaceRoot(workspaceName);
  let workspaceRoot = targetWorkspaceRoot;

  if (await directoryExists(targetWorkspaceRoot)) {
    throw new WorkspaceCliError(
      `Workspace '${workspaceName}' already exists at ${targetWorkspaceRoot}.`,
      'workspace_already_exists',
      {
        target: 'workspace.name',
      }
    );
  }

  let createdWorkspaceRoot = false;

  try {
    await FileSystemUtils.createDirectory(path.dirname(targetWorkspaceRoot));
    await fs.mkdir(targetWorkspaceRoot);
    createdWorkspaceRoot = true;
    workspaceRoot = FileSystemUtils.canonicalizeExistingPath(targetWorkspaceRoot);
    await FileSystemUtils.createDirectory(getWorkspaceChangesDir(workspaceRoot));
    const viewState: WorkspaceViewState = {
      version: 1,
      name: workspaceName,
      context,
      links,
      ...(preferredOpener ? { preferred_opener: preferredOpener } : {}),
      ...(tools ? { tools } : {}),
    };
    await writeWorkspaceViewState(workspaceRoot, viewState);
    await syncWorkspaceOpenSurface(workspaceRoot, viewState);
  } catch (error) {
    if (createdWorkspaceRoot) {
      try {
        await fs.rm(targetWorkspaceRoot, { recursive: true, force: true });
      } catch {
        // Preserve the original creation failure; callers can retry or inspect the path.
      }
    }

    throw new WorkspaceCliError(
      `Could not create workspace '${workspaceName}': ${asErrorMessage(error)}`,
      'workspace_create_failed',
      {
        target: 'workspace.root',
      }
    );
  }

  return {
    name: workspaceName,
    root: workspaceRoot,
    planning_path: getWorkspaceChangesDir(workspaceRoot),
    state_path: getWorkspaceViewStatePath(workspaceRoot),
    context: workspaceContextToOutput(context),
    links: Object.entries(links)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([linkName, linkPath]) => ({
        name: linkName,
        path: linkPath,
        status: [],
      })),
    status: [],
  };
}

export async function parseSetupLinks(
  linkInputs: string[] | undefined
): Promise<Record<string, string>> {
  const links: Record<string, string> = {};

  for (const rawLink of linkInputs ?? []) {
    const parsed = await parseWorkspaceSetupLinkInput(rawLink);
    const resolvedPath = await resolveExistingDirectory(parsed.pathInput);
    const linkName = validateLinkNameForCommand(parsed.name ?? inferLinkName(resolvedPath));

    if (links[linkName]) {
      throw duplicateSetupLinkError(linkName, links[linkName], resolvedPath);
    }

    links[linkName] = resolvedPath;
  }

  return links;
}

export async function loadWorkspaceForList(
  entry: WorkspaceRegistryEntry
): Promise<WorkspaceListOutput> {
  const workspaceStatus: WorkspaceStatus[] = [];

  if (!(await directoryExists(entry.workspaceRoot)) || !(await isWorkspaceRoot(entry.workspaceRoot))) {
    return {
      name: entry.name,
      root: entry.workspaceRoot,
      context: null,
      links: [],
      status: [
        makeStatus('error', 'workspace_root_missing', 'Workspace location does not exist.', {
          target: 'workspace.root',
          fix: 'Remove or repair the local workspace view.',
        }),
      ],
    };
  }

  let viewState: WorkspaceViewState;

  try {
    viewState = await readWorkspaceViewState(entry.workspaceRoot);
  } catch (error) {
    return {
      name: entry.name,
      root: entry.workspaceRoot,
      context: null,
      links: [],
      status: [
        makeStatus(
          'error',
          'workspace_state_invalid',
          `Workspace state could not be read: ${asErrorMessage(error)}`,
          {
            target: 'workspace.root',
            fix: 'Repair the workspace state files before using this workspace.',
          }
        ),
      ],
    };
  }

  appendWorkspaceSkillDriftStatus(workspaceStatus, viewState.name, viewState);
  workspaceStatus.push(...(await collectWorkspaceContextStatuses(viewState.context)));

  return {
    name: viewState.name,
    root: entry.workspaceRoot,
    context: workspaceContextToOutput(viewState.context),
    links: normalizeLinksForOutput(viewState),
    status: workspaceStatus,
  };
}

export async function loadWorkspaceForDoctor(
  selected: SelectedWorkspace
): Promise<{ workspace: WorkspaceOutput; status: WorkspaceStatus[] }> {
  const commandStatus = [...selected.status];
  const workspaceStatus: WorkspaceStatus[] = [];
  const planningPath = getWorkspaceChangesDir(selected.root);

  if (!(await directoryExists(selected.root)) || !(await isWorkspaceRoot(selected.root))) {
    return {
      workspace: {
        name: selected.name,
        root: selected.root,
        planning_path: planningPath,
        state_path: getWorkspaceViewStatePath(selected.root),
        context: null,
        links: [],
        status: [
          makeStatus(
            'error',
            'selected_workspace_root_missing',
            'Selected workspace location does not exist or is not a valid workspace.',
            {
              target: 'workspace.root',
              fix: 'Repair the local workspace view or choose another workspace.',
            }
          ),
        ],
      },
      status: commandStatus,
    };
  }

  let viewState: WorkspaceViewState;

  try {
    viewState = await readWorkspaceViewState(selected.root);
  } catch (error) {
    return {
      workspace: {
        name: selected.name,
        root: selected.root,
        planning_path: planningPath,
        state_path: getWorkspaceViewStatePath(selected.root),
        context: null,
        links: [],
        status: [
          makeStatus(
            'error',
            'workspace_state_invalid',
            `Workspace state could not be read: ${asErrorMessage(error)}`,
            {
              target: 'workspace.root',
              fix: 'Repair .openspec-workspace/workspace.yaml before using this workspace.',
            }
          ),
        ],
      },
      status: commandStatus,
    };
  }

  appendWorkspaceSkillDriftStatus(workspaceStatus, viewState.name, viewState);
  workspaceStatus.push(...(await collectWorkspaceContextStatuses(viewState.context)));

  const linkNames = Object.keys(viewState.links).sort((a, b) => a.localeCompare(b));
  const links: WorkspaceLinkOutput[] = [];

  for (const linkName of linkNames) {
    const linkStatus: WorkspaceStatus[] = [];
    const localPath = viewState.links[linkName] ?? null;
    let repoSpecsPath: string | null = null;

    if (!localPath) {
      linkStatus.push(
        makeStatus(
          'error',
          'linked_path_missing_from_local_state',
          'Shared link does not have a local path on this machine.',
          {
            target: `links.${linkName}.path`,
            fix: `openspec workspace relink ${linkName} /path/to/${linkName}`,
          }
        )
      );
    }

    if (localPath) {
      if (await directoryExists(localPath)) {
        const candidateSpecsPath = path.join(localPath, 'openspec', 'specs');
        repoSpecsPath = (await directoryExists(candidateSpecsPath)) ? candidateSpecsPath : null;
      } else {
        linkStatus.push(
          makeStatus('error', 'linked_path_missing', 'Linked path does not exist.', {
            target: `links.${linkName}.path`,
            fix: `openspec workspace relink ${linkName} /path/to/${linkName}`,
          })
        );
      }
    }

    links.push({
      name: linkName,
      path: localPath,
      repo_specs_path: repoSpecsPath,
      status: linkStatus,
    });
  }

  return {
    workspace: {
      name: viewState.name,
      root: selected.root,
      planning_path: planningPath,
      state_path: getWorkspaceViewStatePath(selected.root),
      context: workspaceContextToOutput(viewState.context),
      links,
      status: workspaceStatus,
    },
    status: commandStatus,
  };
}

async function readWorkspaceViewForMutation(selected: SelectedWorkspace): Promise<WorkspaceViewState> {
  if (!(await directoryExists(selected.root)) || !(await isWorkspaceRoot(selected.root))) {
    throw new WorkspaceCliError(
      `Workspace location does not exist for '${selected.name}': ${selected.root}`,
      'selected_workspace_root_missing',
      {
        target: 'workspace.root',
        fix: 'Run openspec workspace list to inspect known workspaces.',
      }
    );
  }

  try {
    return await readWorkspaceViewState(selected.root);
  } catch (error) {
    throw new WorkspaceCliError(
      `Workspace state could not be read: ${asErrorMessage(error)}`,
      'workspace_state_invalid',
      {
        target: 'workspace.state',
        fix: 'Repair workspace.yaml before using this workspace.',
      }
    );
  }
}

export async function readWorkspaceForMutation(
  selected: SelectedWorkspace
): Promise<WorkspaceViewState> {
  return readWorkspaceViewForMutation(selected);
}

function buildLinkMutationPayload(
  selected: SelectedWorkspace,
  viewState: WorkspaceViewState,
  linkName: string,
  linkPath: string
): WorkspaceLinkMutationPayload {
  return {
    workspace: {
      name: viewState.name,
      root: selected.root,
      planning_path: getWorkspaceChangesDir(selected.root),
      state_path: getWorkspaceViewStatePath(selected.root),
      context: workspaceContextToOutput(viewState.context),
      links: normalizeLinksForOutput(viewState),
      status: [],
    },
    link: {
      name: linkName,
      path: linkPath,
      status: [],
    },
    status: selected.status,
  };
}

export async function addWorkspaceLink(
  selected: SelectedWorkspace,
  nameOrPath: string,
  linkPath?: string
): Promise<WorkspaceLinkMutationPayload> {
  const explicitName = linkPath ? nameOrPath : undefined;
  const pathInput = linkPath ?? nameOrPath;
  const resolvedPath = await resolveExistingDirectory(pathInput);
  const linkName = validateLinkNameForCommand(explicitName ?? inferLinkName(resolvedPath));
  const viewState = await readWorkspaceViewForMutation(selected);

  if (hasWorkspaceLink(viewState.links, linkName)) {
    throw duplicateLinkError(linkName, viewState.links[linkName] ?? null, resolvedPath);
  }

  const updatedViewState: WorkspaceViewState = {
    ...viewState,
    links: {
      ...viewState.links,
      [linkName]: resolvedPath,
    },
  };
  await writeWorkspaceViewState(selected.root, updatedViewState);
  await syncWorkspaceOpenSurface(selected.root, updatedViewState);

  return buildLinkMutationPayload(
    selected,
    updatedViewState,
    linkName,
    resolvedPath
  );
}

export async function updateWorkspaceLink(
  selected: SelectedWorkspace,
  linkNameInput: string,
  linkPath: string
): Promise<WorkspaceLinkMutationPayload> {
  const linkName = validateLinkNameForCommand(linkNameInput);
  const resolvedPath = await resolveExistingDirectory(linkPath);
  const viewState = await readWorkspaceViewForMutation(selected);

  if (!hasWorkspaceLink(viewState.links, linkName)) {
    throw new WorkspaceCliError(`Unknown workspace link '${linkName}'.`, 'unknown_link_name', {
      target: `links.${linkName}`,
      fix: 'Run openspec workspace doctor to see linked repos or folders.',
    });
  }

  const updatedViewState: WorkspaceViewState = {
    ...viewState,
    links: {
      ...viewState.links,
      [linkName]: resolvedPath,
    },
  };
  await writeWorkspaceViewState(selected.root, updatedViewState);
  await syncWorkspaceOpenSurface(selected.root, updatedViewState);

  return buildLinkMutationPayload(selected, updatedViewState, linkName, resolvedPath);
}

function sameWorkspaceContext(
  left: WorkspaceContextState | null,
  right: WorkspaceContextState
): boolean {
  return (
    left !== null &&
    sameContextStoreBinding(left.store, right.store) &&
    getWorkspaceContextInitiativeId(left) === getWorkspaceContextInitiativeId(right)
  );
}

function formatWorkspaceContext(context: WorkspaceContextState | null): string {
  return context
    ? `${formatContextStoreBinding(context.store)}/${getWorkspaceContextInitiativeId(context)}`
    : 'no initiative context';
}

export function deriveWorkspaceNameForInitiative(initiativeId: string): string {
  return validateWorkspaceNameForSetup(initiativeId);
}

async function readExistingManagedWorkspaceView(
  workspaceName: string
): Promise<{ root: string; state: WorkspaceViewState } | null> {
  const workspaceRoot = getManagedWorkspaceRoot(workspaceName);

  if (!(await directoryExists(workspaceRoot))) {
    return null;
  }

  if (!(await isWorkspaceRoot(workspaceRoot))) {
    throw new WorkspaceCliError(
      `Workspace name '${workspaceName}' collides with a non-workspace directory at ${workspaceRoot}.`,
      'workspace_name_collision',
      {
        target: 'workspace.name',
        fix: 'Choose an explicit unused workspace name.',
      }
    );
  }

  return {
    root: workspaceRoot,
    state: await readWorkspaceViewState(workspaceRoot),
  };
}

function selectedWorkspaceFromManagedView(
  root: string,
  state: WorkspaceViewState
): SelectedWorkspace {
  return {
    name: state.name,
    root,
    status: [],
    unregisteredCurrentWorkspace: false,
  };
}

export async function selectOrCreateWorkspaceForInitiativeOpen(input: {
  workspaceName?: string;
  context: WorkspaceContextState;
  preferredOpener?: WorkspacePreferredOpener;
}): Promise<{ selected: SelectedWorkspace; created: boolean; state: WorkspaceViewState }> {
  if (input.workspaceName) {
    const workspaceName = validateWorkspaceNameForSetup(input.workspaceName);
    const existing = await readExistingManagedWorkspaceView(workspaceName);

    if (!existing) {
      const workspace = await createManagedWorkspace(
        workspaceName,
        {},
        input.preferredOpener,
        input.context
      );
      return {
        selected: {
          name: workspace.name,
          root: workspace.root,
          status: [],
          unregisteredCurrentWorkspace: false,
        },
        created: true,
        state: await readWorkspaceViewState(workspace.root),
      };
    }

    if (sameWorkspaceContext(existing.state.context, input.context)) {
      return {
        selected: selectedWorkspaceFromManagedView(existing.root, existing.state),
        created: false,
        state: existing.state,
      };
    }

    if (!existing.state.context) {
      throw new WorkspaceCliError(
        `Workspace '${workspaceName}' is not bound to an initiative.`,
        'workspace_context_bind_required',
        {
          target: 'workspace.context',
          fix: 'Choose a new workspace name for this initiative or use a future workspace rebind/update surface.',
        }
      );
    }

    throw new WorkspaceCliError(
      `Workspace '${workspaceName}' is already bound to ${formatWorkspaceContext(existing.state.context)}.`,
      'workspace_context_conflict',
      {
        target: 'workspace.context',
        fix: 'Choose a different workspace name or open the initiative already bound to this workspace.',
      }
    );
  }

  const matches: Array<{ root: string; state: WorkspaceViewState }> = [];

  for (const entry of await listKnownWorkspaceEntries()) {
    try {
      const state = await readWorkspaceViewState(entry.workspaceRoot);
      if (sameWorkspaceContext(state.context, input.context)) {
        matches.push({ root: entry.workspaceRoot, state });
      }
    } catch {
      // Broken workspaces are surfaced by list/doctor; initiative open should not
      // guess through unreadable local view records.
    }
  }

  if (matches.length === 1) {
    const [match] = matches;
    return {
      selected: selectedWorkspaceFromManagedView(match.root, match.state),
      created: false,
      state: match.state,
    };
  }

  if (matches.length > 1) {
    const names = matches.map((match) => match.state.name).sort((a, b) => a.localeCompare(b));
    throw new WorkspaceCliError(
      `Multiple workspaces are already bound to ${formatWorkspaceContext(input.context)}: ${names.join(', ')}.`,
      'workspace_initiative_selection_ambiguous',
      {
        target: 'workspace.name',
        fix: 'Retry with an explicit workspace name.',
      }
    );
  }

  const derivedName = deriveWorkspaceNameForInitiative(getWorkspaceContextInitiativeId(input.context));
  const existingDerived = await readExistingManagedWorkspaceView(derivedName);

  if (existingDerived) {
    if (sameWorkspaceContext(existingDerived.state.context, input.context)) {
      return {
        selected: selectedWorkspaceFromManagedView(existingDerived.root, existingDerived.state),
        created: false,
        state: existingDerived.state,
      };
    }

    throw new WorkspaceCliError(
      `Default workspace name '${derivedName}' is already used by a workspace with ${formatWorkspaceContext(existingDerived.state.context)}.`,
      'workspace_name_collision',
      {
        target: 'workspace.name',
        fix: `Retry with an explicit workspace name: openspec workspace open <name> --initiative ${getWorkspaceContextStoreId(input.context)}/${getWorkspaceContextInitiativeId(input.context)}`,
      }
    );
  }

  const workspace = await createManagedWorkspace(
    derivedName,
    {},
    input.preferredOpener,
    input.context
  );

  return {
    selected: {
      name: workspace.name,
      root: workspace.root,
      status: [],
      unregisteredCurrentWorkspace: false,
    },
    created: true,
    state: await readWorkspaceViewState(workspace.root),
  };
}
