import {
  findWorkspaceRoot,
  listKnownWorkspaceEntries,
  readWorkspaceViewState,
  type WorkspaceRegistryEntry,
} from '../../core/workspace/index.js';
import { FileSystemUtils } from '../../utils/file-system.js';
import { isInteractive, resolveNoInteractive } from '../../utils/interactive.js';
import { validateWorkspaceNameForSetup } from './operations.js';
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

function workspaceNotInKnownViewsWarning(): WorkspaceStatus {
  return makeStatus(
    'warning',
    'workspace_not_in_known_views',
    'This workspace is not in the managed local workspace views list.',
    {
      target: 'workspace.root',
      fix: 'Use openspec workspace list to inspect managed workspace views.',
    }
  );
}

function sameWorkspaceRoot(
  knownRoot: string | undefined,
  currentWorkspaceRoot: string
): boolean {
  return (
    knownRoot !== undefined &&
    normalizeRegistryRootForComparison(knownRoot) ===
      normalizeRegistryRootForComparison(currentWorkspaceRoot)
  );
}

function findKnownWorkspaceByName(
  entries: WorkspaceRegistryEntry[],
  workspaceName: string
): WorkspaceRegistryEntry | undefined {
  return entries.find((entry) => entry.name === workspaceName);
}

export function selectedWorkspaceFromEntry(entry: WorkspaceRegistryEntry): SelectedWorkspace {
  return {
    name: entry.name,
    root: entry.workspaceRoot,
    status: [],
    unregisteredCurrentWorkspace: false,
  };
}

export async function selectedWorkspaceFromRoot(
  currentWorkspaceRoot: string,
  entries: WorkspaceRegistryEntry[]
): Promise<SelectedWorkspace> {
  const viewState = await readWorkspaceViewState(currentWorkspaceRoot);
  const knownRoot = findKnownWorkspaceByName(entries, viewState.name)?.workspaceRoot;
  const isKnown = sameWorkspaceRoot(knownRoot, currentWorkspaceRoot);

  return {
    name: viewState.name,
    root: currentWorkspaceRoot,
    status: isKnown ? [] : [workspaceNotInKnownViewsWarning()],
    unregisteredCurrentWorkspace: !isKnown,
  };
}

export async function selectWorkspaceRootForCommand(
  workspaceRoot: string
): Promise<SelectedWorkspace> {
  const entries = await listKnownWorkspaceEntries();
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

  return selectedWorkspaceFromRoot(currentWorkspaceRoot, entries);
}

export async function selectWorkspaceForCommand(
  options: WorkspaceSelectionOptions,
  commandName: string,
  selectionOptions: { preferPositionalName?: boolean } = {}
): Promise<SelectedWorkspace> {
  const entries = await listKnownWorkspaceEntries();

  if (options.workspace) {
    const workspaceName = validateWorkspaceNameForSetup(options.workspace);
    const entry = findKnownWorkspaceByName(entries, workspaceName);

    if (!entry) {
      throw new WorkspaceCliError(
        `Unknown OpenSpec workspace '${workspaceName}'.`,
        'workspace_not_found',
        {
          target: 'workspace.name',
          fix: 'Run openspec workspace list to see known workspaces.',
        }
      );
    }

    return selectedWorkspaceFromEntry(entry);
  }

  const currentWorkspaceRoot = await findWorkspaceRoot(process.cwd());

  if (currentWorkspaceRoot) {
    return selectedWorkspaceFromRoot(currentWorkspaceRoot, entries);
  }

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

    return selectedWorkspaceFromEntry(entry);
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
  const selectedEntry = findKnownWorkspaceByName(entries, selectedName);

  if (!selectedEntry) {
    throw new WorkspaceCliError(
      `Unknown OpenSpec workspace '${selectedName}'.`,
      'workspace_not_found',
      {
        target: 'workspace.name',
        fix: 'Run openspec workspace list to see known workspaces.',
      }
    );
  }

  return selectedWorkspaceFromEntry(selectedEntry);
}
