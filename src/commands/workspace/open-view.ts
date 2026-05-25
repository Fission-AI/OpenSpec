import {
  InitiativeResolutionError,
  InitiativeViewReference,
  resolveInitiativeViewReference,
} from '../../core/collections/initiatives/index.js';
import {
  WorkspacePreferredOpener,
  WorkspaceOpenResolvedContext,
  getWorkspaceOpenerLabel,
} from '../../core/workspace/index.js';
import {
  assertWorkspaceOpenerAvailable,
  buildWorkspaceOpenCommandForState,
  readWorkspaceOpenState,
  type WorkspaceOpenCommandBuildResult,
} from './open.js';
import {
  selectOrCreateWorkspaceForInitiativeOpen,
} from './operations.js';
import {
  selectWorkspaceForCommand,
} from './selection.js';
import {
  SelectedWorkspace,
  WorkspaceCliError,
  WorkspaceOpenOptions,
  WorkspaceStatus,
  asErrorMessage,
} from './types.js';
import {
  resolveWorkspaceOpenOpener,
  resolveWorkspaceOpenOpenerOverride,
} from './opener-selection.js';

export interface PreparedWorkspaceOpen extends WorkspaceOpenCommandBuildResult {
  selected: SelectedWorkspace;
  opener: WorkspacePreferredOpener;
  initiative: InitiativeViewReference | null;
  warnings: WorkspaceStatus[];
}

export interface WorkspaceOpenJsonPayload {
  schema_version: 1;
  workspace: {
    name: string;
    root: string;
  };
  context: {
    context_store: {
      id: string;
      root: string;
    };
    initiative: {
      id: string;
      title: string;
      root: string;
      metadata_path: string;
      store_path: string;
    };
  } | null;
  generated_files: {
    agents: string;
    code_workspace: string;
  };
  opened_roots: PreparedWorkspaceOpen['openedRoots'];
  skipped_roots: Array<{
    kind: 'link';
    name: string;
    path: string | null;
    reason: PreparedWorkspaceOpen['skipped'][number]['reason'];
  }>;
  advisory_edit_boundaries: {
    allowed_edit_roots: string[];
    coordination_roots: string[];
    enforcement: 'advisory';
  };
  opener: PreparedWorkspaceOpen['opener'] & {
    label: string;
  };
  launch: {
    attempted: true;
    status: 'succeeded';
  };
  warnings: WorkspaceStatus[];
  status: WorkspaceStatus[];
}

export function assertWorkspaceOpenSupportedOptions(options: WorkspaceOpenOptions): void {
  if (!options.initiative && (options.store || options.storePath)) {
    throw new WorkspaceCliError(
      'workspace open accepts --store or --store-path only with --initiative.',
      'workspace_open_store_without_initiative',
      {
        target: 'workspace.initiative',
        fix: 'Use openspec workspace open --initiative <id> --store <store>.',
      }
    );
  }

  if (options.prepareOnly) {
    throw new WorkspaceCliError(
      'workspace open supports launching through a selected opener; preview output is reserved for a future context/query surface.',
      'workspace_open_prepare_only_unsupported',
      {
        target: 'workspace.open',
        fix: 'Run openspec workspace open with --agent <tool> or --editor.',
      }
    );
  }

  if (options.change) {
    throw new WorkspaceCliError(
      'workspace open currently supports root workspace open only; change-scoped open belongs to future workspace change planning.',
      'workspace_open_change_unsupported',
      {
        target: 'workspace.change',
        fix: 'Open the root workspace, then start implementation from an explicit change workflow.',
      }
    );
  }
}

function resolveOpenWorkspaceName(
  positionalName: string | undefined,
  options: WorkspaceOpenOptions
): string | undefined {
  if (positionalName && options.workspace && positionalName !== options.workspace) {
    throw new WorkspaceCliError(
      `Conflicting workspace selectors: positional '${positionalName}' and --workspace '${options.workspace}'.`,
      'workspace_selection_conflict',
      {
        target: 'workspace.name',
        fix: 'Use either the positional workspace name or --workspace with the same value.',
      }
    );
  }

  return positionalName ?? options.workspace;
}

function initiativeErrorAsWorkspaceError(error: unknown): WorkspaceCliError {
  if (error instanceof InitiativeResolutionError) {
    return new WorkspaceCliError(error.message, error.code, {
      target: error.target,
      fix: error.fix,
      details: error.details,
    });
  }

  return new WorkspaceCliError(asErrorMessage(error), 'initiative_error');
}

async function resolveWorkspaceOpenInitiative(
  options: WorkspaceOpenOptions
): Promise<InitiativeViewReference | null> {
  if (!options.initiative) {
    return null;
  }

  try {
    return await resolveInitiativeViewReference(options.initiative, {
      store: options.store,
      storePath: options.storePath,
    });
  } catch (error) {
    throw initiativeErrorAsWorkspaceError(error);
  }
}

async function resolveStoredWorkspaceInitiative(
  store: string,
  initiative: string
): Promise<InitiativeViewReference> {
  try {
    return await resolveInitiativeViewReference(initiative, { store });
  } catch (error) {
    throw initiativeErrorAsWorkspaceError(error);
  }
}

function toWorkspaceOpenResolvedContext(
  initiative: InitiativeViewReference
): WorkspaceOpenResolvedContext {
  return {
    contextStore: {
      id: initiative.store,
      root: initiative.storeRoot,
    },
    initiative: {
      id: initiative.id,
      title: initiative.title,
      root: initiative.root,
      metadataPath: initiative.metadataPath,
      storePath: initiative.storePath,
    },
  };
}

function buildSkippedRootWarnings(
  skipped: PreparedWorkspaceOpen['skipped']
): WorkspaceStatus[] {
  return skipped.map((link) => {
    const location = link.path ?? '(no local path recorded)';
    return {
      severity: 'warning',
      code: 'workspace_open_link_skipped',
      message: `Skipped linked repo or folder '${link.name}' because ${location} is not available.`,
      target: `links.${link.name}.path`,
      fix: `openspec workspace relink ${link.name} /path/to/${link.name}`,
    };
  });
}

export async function prepareWorkspaceOpen(
  positionalName: string | undefined,
  options: WorkspaceOpenOptions
): Promise<PreparedWorkspaceOpen> {
  assertWorkspaceOpenSupportedOptions(options);

  const workspaceName = resolveOpenWorkspaceName(positionalName, options);
  const requestedInitiative = await resolveWorkspaceOpenInitiative(options);
  const selected = requestedInitiative
    ? (
        await selectOrCreateWorkspaceForInitiativeOpen({
          workspaceName,
          context: {
            store: requestedInitiative.store,
            initiative: requestedInitiative.id,
          },
          preferredOpener: resolveWorkspaceOpenOpenerOverride(options),
        })
      ).selected
    : await selectWorkspaceForCommand(
        {
          ...options,
          workspace: workspaceName,
        },
        'open',
        { preferPositionalName: true }
      );
  const state = await readWorkspaceOpenState(selected);
  const storedInitiative = !requestedInitiative && state.sharedState.context
    ? await resolveStoredWorkspaceInitiative(
        state.sharedState.context.store,
        state.sharedState.context.initiative
      )
    : null;
  const initiative = requestedInitiative ?? storedInitiative;
  const resolvedContext = initiative ? toWorkspaceOpenResolvedContext(initiative) : null;
  const opener = await resolveWorkspaceOpenOpener(state.localState, options);

  assertWorkspaceOpenerAvailable(opener, state.codeWorkspacePath);

  const buildResult = await buildWorkspaceOpenCommandForState(
    opener,
    selected.root,
    state,
    resolvedContext
  );

  return {
    ...buildResult,
    selected,
    opener,
    initiative,
    warnings: [...selected.status, ...buildSkippedRootWarnings(buildResult.skipped)],
  };
}

export function buildWorkspaceOpenJsonPayload(
  prepared: PreparedWorkspaceOpen
): WorkspaceOpenJsonPayload {
  const linkedEditRoots = prepared.openedRoots
    .filter((root) => root.kind === 'link')
    .map((root) => root.path);

  return {
    schema_version: 1,
    workspace: {
      name: prepared.selected.name,
      root: prepared.selected.root,
    },
    context: prepared.initiative
      ? {
          context_store: {
            id: prepared.initiative.store,
            root: prepared.initiative.storeRoot,
          },
          initiative: {
            id: prepared.initiative.id,
            title: prepared.initiative.title,
            root: prepared.initiative.root,
            metadata_path: prepared.initiative.metadataPath,
            store_path: prepared.initiative.storePath,
          },
        }
      : null,
    generated_files: {
      agents: prepared.generated.agentsPath,
      code_workspace: prepared.generated.codeWorkspacePath,
    },
    opened_roots: prepared.openedRoots,
    skipped_roots: prepared.skipped.map((link) => ({
      kind: 'link',
      name: link.name,
      path: link.path,
      reason: link.reason,
    })),
    advisory_edit_boundaries: {
      allowed_edit_roots: linkedEditRoots,
      coordination_roots: prepared.initiative ? [prepared.initiative.root] : [],
      enforcement: 'advisory',
    },
    opener: {
      ...prepared.opener,
      label: getWorkspaceOpenerLabel(prepared.opener),
    },
    launch: {
      attempted: true,
      status: 'succeeded',
    },
    warnings: prepared.warnings,
    status: [],
  };
}
