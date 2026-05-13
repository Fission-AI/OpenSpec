import {
  findWorkspaceRoot,
  listWorkspaceRegistryEntries,
  readWorkspaceSharedState,
} from '../../core/workspace/index.js';
import { FileSystemUtils } from '../../utils/file-system.js';
import { isInteractive, resolveNoInteractive } from '../../utils/interactive.js';
import { readRegistry, validateWorkspaceNameForSetup } from './operations.js';
import {
  SelectedWorkspace,
  WorkspaceCliError,
  WorkspaceSelectionOptions,
  WorkspaceStatus,
  makeStatus,
} from './types.js';

function normalizeRegistryRootForComparison(workspaceRoot: string): string {
  try {
    return FileSystemUtils.canonicalizeExistingPath(workspaceRoot);
  } catch {
    return workspaceRoot;
  }
}

function workspaceNotInRegistryWarning(): WorkspaceStatus {
  return makeStatus(
    'warning',
    'workspace_not_in_local_registry',
    'This workspace is not recorded in the local workspace registry.',
    {
      target: 'workspace.root',
      fix: 'Run a mutating workspace command from this workspace, such as workspace link or workspace relink, to record it locally.',
    }
  );
}

function isRegisteredWorkspaceRoot(
  registryRoot: string | undefined,
  currentWorkspaceRoot: string
): boolean {
  return (
    registryRoot !== undefined &&
    normalizeRegistryRootForComparison(registryRoot) ===
      normalizeRegistryRootForComparison(currentWorkspaceRoot)
  );
}

async function selectedWorkspaceFromRoot(
  currentWorkspaceRoot: string,
  registry: Awaited<ReturnType<typeof readRegistry>>
): Promise<SelectedWorkspace> {
  const sharedState = await readWorkspaceSharedState(currentWorkspaceRoot);
  const registeredRoot = registry.workspaces[sharedState.name];
  const isRegistered = isRegisteredWorkspaceRoot(registeredRoot, currentWorkspaceRoot);

  return {
    name: sharedState.name,
    root: currentWorkspaceRoot,
    status: isRegistered ? [] : [workspaceNotInRegistryWarning()],
    unregisteredCurrentWorkspace: !isRegistered,
  };
}

export async function selectWorkspaceRootForCommand(
  workspaceRoot: string
): Promise<SelectedWorkspace> {
  const registry = await readRegistry();
  const currentWorkspaceRoot = await findWorkspaceRoot(workspaceRoot);

  if (!currentWorkspaceRoot) {
    throw new WorkspaceCliError(
      `No OpenSpec workspace found at '${workspaceRoot}'.`,
      'workspace_not_found',
      {
        target: 'workspace.root',
        fix: 'Pass a path inside an OpenSpec workspace.',
      }
    );
  }

  return selectedWorkspaceFromRoot(currentWorkspaceRoot, registry);
}

export async function selectWorkspaceForCommand(
  options: WorkspaceSelectionOptions,
  commandName: string,
  selectionOptions: { preferPositionalName?: boolean } = {}
): Promise<SelectedWorkspace> {
  const registry = await readRegistry();

  if (options.workspace) {
    const workspaceName = validateWorkspaceNameForSetup(options.workspace);
    const registryRoot = registry.workspaces[workspaceName];

    if (!registryRoot) {
      throw new WorkspaceCliError(
        `Unknown OpenSpec workspace '${workspaceName}'.`,
        'workspace_not_found',
        {
          target: 'workspace.name',
          fix: 'Run openspec workspace list to see known workspaces.',
        }
      );
    }

    return {
      name: workspaceName,
      root: registryRoot,
      status: [],
      unregisteredCurrentWorkspace: false,
    };
  }

  const currentWorkspaceRoot = await findWorkspaceRoot(process.cwd());

  if (currentWorkspaceRoot) {
    return selectedWorkspaceFromRoot(currentWorkspaceRoot, registry);
  }

  const entries = listWorkspaceRegistryEntries(registry);

  if (entries.length === 0) {
    throw new WorkspaceCliError(
      "No known OpenSpec workspaces. Run 'openspec workspace setup' first.\nAfter at least one workspace is known locally, you can also pass --workspace <name>.",
      'no_known_workspaces',
      {
        target: 'workspace.name',
        fix: 'openspec workspace setup',
      }
    );
  }

  if (entries.length === 1) {
    const [entry] = entries;

    return {
      name: entry.name,
      root: entry.workspaceRoot,
      status: [],
      unregisteredCurrentWorkspace: false,
    };
  }

  if (options.json || resolveNoInteractive(options) || !isInteractive(options)) {
    const knownNames = entries.map((entry) => entry.name).join(', ');
    const usesPositionalName = selectionOptions.preferPositionalName;
    const fix = usesPositionalName
      ? `openspec workspace ${commandName} <name>`
      : `openspec workspace ${commandName} --workspace <name>`;

    throw new WorkspaceCliError(
      usesPositionalName
        ? `Multiple OpenSpec workspaces are known. Known workspaces: ${knownNames}. Pass a workspace name.`
        : `Multiple OpenSpec workspaces are known. Known workspaces: ${knownNames}. Pass --workspace <name>.`,
      'workspace_selection_ambiguous',
      {
        target: 'workspace.name',
        fix,
      }
    );
  }

  const { select } = await import('@inquirer/prompts');
  const selectedName = await select({
    message: 'Select workspace:',
    choices: entries.map((entry) => ({
      name: `${entry.name} (${entry.workspaceRoot})`,
      value: entry.name,
    })),
  });

  return {
    name: selectedName,
    root: registry.workspaces[selectedName],
    status: [],
    unregisteredCurrentWorkspace: false,
  };
}
