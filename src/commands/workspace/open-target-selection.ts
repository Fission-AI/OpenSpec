import {
  InitiativeResolutionError,
  type InitiativeDiagnostic,
  type InitiativeViewReference,
  initiativeDiagnosticFromError,
  listInitiativeViewReferences,
} from '../../core/collections/initiatives/index.js';
import {
  createRegisteredContextStoreBinding,
  sameContextStoreBinding,
} from '../../core/context-store/index.js';
import {
  findWorkspaceRoot,
  getWorkspaceContextInitiativeId,
  listKnownWorkspaceEntries,
  readWorkspaceViewState,
  type WorkspaceContextState,
  type WorkspaceRegistryEntry,
} from '../../core/workspace/index.js';
import { isInteractive, resolveNoInteractive } from '../../utils/interactive.js';
import {
  selectWorkspaceForCommand,
  selectedWorkspaceFromEntry,
  selectedWorkspaceFromRoot,
} from './selection.js';
import {
  WorkspaceCliError,
  type SelectedWorkspace,
  type WorkspaceOpenOptions,
  type WorkspaceStatus,
} from './types.js';

export type WorkspaceOpenTarget =
  | {
      kind: 'workspace';
      selected: SelectedWorkspace;
      status: WorkspaceStatus[];
    }
  | {
      kind: 'initiative';
      initiative: InitiativeViewReference;
      status: WorkspaceStatus[];
    };

type WorkspaceOpenChoice =
  | {
      kind: 'workspace';
      entry: WorkspaceRegistryEntry;
    }
  | {
      kind: 'initiative';
      initiative: InitiativeViewReference;
    };

type OpenableInitiatives =
  | {
      kind: 'listed';
      initiatives: InitiativeViewReference[];
      status: WorkspaceStatus[];
    }
  | {
      kind: 'unavailable';
      initiatives: [];
      status: WorkspaceStatus[];
      error: WorkspaceCliError;
    };

async function readKnownWorkspaceContexts(
  entries: WorkspaceRegistryEntry[]
): Promise<Array<WorkspaceContextState | null>> {
  return Promise.all(entries.map(async (entry) => {
    try {
      return (await readWorkspaceViewState(entry.workspaceRoot)).context;
    } catch {
      // Broken workspaces are surfaced by list/doctor; open target selection
      // should not hide otherwise openable initiatives behind unreadable views.
      return null;
    }
  }));
}

function workspaceContextMatchesInitiative(
  context: WorkspaceContextState | null,
  initiative: InitiativeViewReference
): boolean {
  return (
    context !== null &&
    sameContextStoreBinding(context.store, createRegisteredContextStoreBinding(initiative.store)) &&
    getWorkspaceContextInitiativeId(context) === initiative.id
  );
}

function initiativeHasKnownWorkspace(
  contexts: Array<WorkspaceContextState | null>,
  initiative: InitiativeViewReference
): boolean {
  return contexts.some((context) => workspaceContextMatchesInitiative(context, initiative));
}

function initiativeDiagnosticToWorkspaceStatus(
  diagnostic: InitiativeDiagnostic
): WorkspaceStatus {
  return {
    severity: diagnostic.severity,
    code: diagnostic.code,
    message: diagnostic.message,
    target: diagnostic.target,
    fix: diagnostic.fix,
    details: diagnostic.details,
  };
}

async function listOpenableInitiatives(
  entries: WorkspaceRegistryEntry[]
): Promise<OpenableInitiatives> {
  try {
    const [result, contexts] = await Promise.all([
      listInitiativeViewReferences(),
      readKnownWorkspaceContexts(entries),
    ]);
    const initiatives: InitiativeViewReference[] = [];

    for (const initiative of result.initiatives) {
      if (!initiativeHasKnownWorkspace(contexts, initiative)) {
        initiatives.push(initiative);
      }
    }

    return {
      kind: 'listed',
      initiatives,
      status: result.status.map(initiativeDiagnosticToWorkspaceStatus),
    };
  } catch (error) {
    const diagnostic: InitiativeDiagnostic = error instanceof InitiativeResolutionError
      ? initiativeDiagnosticFromError(error)
      : {
          severity: 'error' as const,
          code: 'initiative_discovery_failed',
          message: error instanceof Error ? error.message : String(error),
          target: 'initiative',
          fix: 'openspec context-store doctor',
        };

    return {
      kind: 'unavailable',
      initiatives: [],
      status: [initiativeDiagnosticToWorkspaceStatus(diagnostic)],
      error: new WorkspaceCliError(diagnostic.message, diagnostic.code, {
        target: diagnostic.target,
        fix: diagnostic.fix,
        details: diagnostic.details,
      }),
    };
  }
}

export async function selectWorkspaceOpenTarget(
  workspaceName: string | undefined,
  options: WorkspaceOpenOptions
): Promise<WorkspaceOpenTarget> {
  if (
    workspaceName ||
    options.json ||
    resolveNoInteractive(options) ||
    !isInteractive(options)
  ) {
    return {
      kind: 'workspace',
      selected: await selectWorkspaceForCommand(
        {
          ...options,
          workspace: workspaceName,
        },
        'open',
        { preferPositionalName: true }
      ),
      status: [],
    };
  }

  const entries = await listKnownWorkspaceEntries();
  const currentWorkspaceRoot = await findWorkspaceRoot(process.cwd());

  if (currentWorkspaceRoot) {
    return {
      kind: 'workspace',
      selected: await selectedWorkspaceFromRoot(currentWorkspaceRoot, entries),
      status: [],
    };
  }

  const listed = await listOpenableInitiatives(entries);

  if (listed.initiatives.length === 0) {
    if (listed.kind === 'unavailable' && entries.length === 0) {
      throw listed.error;
    }

    return {
      kind: 'workspace',
      selected: await selectWorkspaceForCommand(options, 'open', {
        preferPositionalName: true,
      }),
      status: listed.status,
    };
  }

  const { select } = await import('@inquirer/prompts');
  const selected = await select<WorkspaceOpenChoice>({
    message: 'Select workspace or initiative:',
    choices: [
      ...entries.map((entry) => ({
        name: `Workspace: ${entry.name} (${entry.workspaceRoot})`,
        value: {
          kind: 'workspace' as const,
          entry,
        },
      })),
      ...listed.initiatives.map((initiative) => ({
        name: `Initiative: ${initiative.store}/${initiative.id} - ${initiative.title} (create local workspace view)`,
        value: {
          kind: 'initiative' as const,
          initiative,
        },
      })),
    ],
  });

  if (selected.kind === 'workspace') {
    return {
      kind: 'workspace',
      selected: selectedWorkspaceFromEntry(selected.entry),
      status: listed.status,
    };
  }

  return {
    kind: 'initiative',
    initiative: selected.initiative,
    status: listed.status,
  };
}
