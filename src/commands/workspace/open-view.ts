import {
  InitiativeResolutionError,
  InitiativeViewReference,
  resolveInitiativeViewReference,
  resolveSelectedInitiativeViewReference,
} from '../../core/collections/initiatives/index.js';
import {
  createPathContextStoreBinding,
  createRegisteredContextStoreBinding,
  formatContextStoreBinding,
  resolveContextStoreBinding,
  type ContextStoreBinding,
  type ContextStoreBindingWarning,
} from '../../core/context-store/index.js';
import {
  WorkspaceContextState,
  WorkspacePreferredOpener,
  WorkspaceOpenResolvedContext,
  createWorkspaceInitiativeContext,
  getWorkspaceContextInitiativeId,
  getWorkspaceOpenerLabel,
} from '../../core/workspace/index.js';
import { isInteractive, resolveNoInteractive } from '../../utils/interactive.js';
import {
  assertWorkspaceOpenerAvailable,
  buildWorkspaceOpenCommandForState,
  readWorkspaceOpenState,
  type WorkspaceOpenCommandBuildResult,
} from './open.js';
import {
  selectOrCreateWorkspaceForInitiativeOpen,
} from './operations.js';
import { selectWorkspaceOpenTarget } from './open-target-selection.js';
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
import { promptSetupLinks } from './setup-prompts.js';

export interface PreparedWorkspaceOpen extends WorkspaceOpenCommandBuildResult {
  selected: SelectedWorkspace;
  opener: WorkspacePreferredOpener;
  initiative: InitiativeViewReference | null;
  workspaceContext: WorkspaceContextState | null;
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
      selector?: ContextStoreBinding['selector'];
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
  context: WorkspaceContextState
): Promise<{ initiative: InitiativeViewReference; warnings: WorkspaceStatus[] }> {
  const initiativeId = getWorkspaceContextInitiativeId(context);

  try {
    const resolvedStore = await resolveContextStoreBinding(context.store);
    const selected = {
      id: resolvedStore.id,
      root: resolvedStore.root,
      source: resolvedStore.source,
    };
    const initiative = await resolveSelectedInitiativeViewReference(selected, initiativeId);

    return {
      initiative,
      warnings: resolvedStore.warnings.map(contextStoreBindingWarningToStatus),
    };
  } catch (error) {
    if (error instanceof InitiativeResolutionError) {
      throw initiativeErrorAsWorkspaceError(error);
    }

    throw new WorkspaceCliError(
      `Workspace context store '${formatContextStoreBinding(context.store)}' could not be read: ${asErrorMessage(error)}`,
      'workspace_context_store_unavailable',
      {
        target: 'workspace.context.store',
        fix: context.store.selector.kind === 'registry'
          ? 'openspec context-store doctor'
          : 'Check the path in .openspec-workspace/view.yaml.',
      }
    );
  }
}

function contextStoreBindingWarningToStatus(
  warning: ContextStoreBindingWarning
): WorkspaceStatus {
  return {
    severity: 'warning',
    code: warning.code,
    message: warning.message,
    target: warning.target ? `workspace.context.store.${warning.target}` : 'workspace.context.store',
    ...(warning.fix ? { fix: warning.fix } : {}),
  };
}

function contextStoreBindingFromInitiative(
  initiative: InitiativeViewReference
): ContextStoreBinding {
  return initiative.storeSource === 'path'
    ? createPathContextStoreBinding({
        id: initiative.store,
        path: initiative.storeRoot,
      })
    : createRegisteredContextStoreBinding(initiative.store);
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
  const openerOverride = resolveWorkspaceOpenOpenerOverride(options);
  const requestedInitiative = await resolveWorkspaceOpenInitiative(options);
  const target = requestedInitiative
    ? { kind: 'initiative' as const, initiative: requestedInitiative, status: [] }
    : await selectWorkspaceOpenTarget(workspaceName, options);
  const interactiveCreate = target.kind === 'initiative'
    && !options.json
    && !resolveNoInteractive(options)
    && isInteractive(options);

  const baseSelected = target.kind === 'initiative'
    ? (
        await selectOrCreateWorkspaceForInitiativeOpen({
          workspaceName,
          context: createWorkspaceInitiativeContext(
            contextStoreBindingFromInitiative(target.initiative),
            target.initiative.id
          ),
          preferredOpener: openerOverride,
          linksForNewWorkspace: interactiveCreate
            ? () => promptSetupLinks({
                heading: 'Link repos or folders for this workspace',
                intro: 'Choose local repos or folders to include when opening this initiative, or create the view without links for now.',
                allowEmpty: true,
                emptyName: 'Create without linked repos',
                emptyShort: 'Create without links',
                emptyDescription: 'Create the local workspace view and add repos or folders later',
                finishName: 'Create and open workspace',
                finishShort: 'Create and open',
                finishDescription: 'Create the local workspace view and continue opening it',
              })
            : undefined,
        })
      ).selected
    : target.selected;
  const selected: SelectedWorkspace = {
    ...baseSelected,
    status: [...baseSelected.status, ...target.status],
  };

  const state = await readWorkspaceOpenState(selected);
  const stored = target.kind === 'workspace' && state.viewState.context
    ? await resolveStoredWorkspaceInitiative(state.viewState.context)
    : null;
  const initiative = target.kind === 'initiative' ? target.initiative : stored?.initiative ?? null;
  const resolvedContext = initiative ? toWorkspaceOpenResolvedContext(initiative) : null;
  const opener = await resolveWorkspaceOpenOpener(state.viewState, options);

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
    workspaceContext: state.viewState.context,
    warnings: [
      ...selected.status,
      ...(stored?.warnings ?? []),
      ...buildSkippedRootWarnings(buildResult.skipped),
    ],
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
            ...(prepared.workspaceContext
              ? { selector: prepared.workspaceContext.store.selector }
              : {}),
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
