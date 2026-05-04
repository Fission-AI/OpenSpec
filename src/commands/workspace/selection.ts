import {
  findWorkspaceRoot,
  listWorkspaceRegistryEntries,
  readWorkspaceSharedState,
} from '../../core/workspace/index.js';
import { isInteractive, resolveNoInteractive } from '../../utils/interactive.js';
import { readRegistry, validateWorkspaceNameForSetup } from './operations.js';
import {
  SelectedWorkspace,
  WorkspaceCliError,
  WorkspaceSelectionOptions,
  makeStatus,
} from './types.js';

export async function selectWorkspaceForCommand(
  options: WorkspaceSelectionOptions,
  commandName: string
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
    const sharedState = await readWorkspaceSharedState(currentWorkspaceRoot);
    const registeredRoot = registry.workspaces[sharedState.name];
    const isRegistered = registeredRoot === currentWorkspaceRoot;
    const warning = makeStatus(
      'warning',
      'workspace_not_in_local_registry',
      'This workspace is not recorded in the local workspace registry.',
      {
        target: 'workspace.root',
        fix: 'Run a mutating workspace command from this workspace, such as workspace link or workspace relink, to record it locally.',
      }
    );

    return {
      name: sharedState.name,
      root: currentWorkspaceRoot,
      status: isRegistered ? [] : [warning],
      unregisteredCurrentWorkspace: !isRegistered,
    };
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
    throw new WorkspaceCliError(
      'Multiple OpenSpec workspaces are known. Pass --workspace <name>.',
      'workspace_selection_ambiguous',
      {
        target: 'workspace.name',
        fix: `openspec workspace ${commandName} --workspace <name>`,
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
