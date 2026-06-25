import {
  mountInitiativesCollection,
  readInitiative,
} from '../../core/collections/initiatives/index.js';
import {
  formatContextStoreBinding,
  formatContextStoreBindingSelector,
  resolveContextStoreBinding,
  type ContextStoreBindingWarning,
} from '../../core/context-store/index.js';
import {
  getWorkspaceContextInitiativeId,
  type WorkspaceContextState,
} from '../../core/workspace/index.js';
import { WorkspaceStatus, asErrorMessage, makeStatus } from './types.js';

function contextStoreBindingWarningToStatus(
  warning: ContextStoreBindingWarning
): WorkspaceStatus {
  return makeStatus('warning', warning.code, warning.message, {
    target: warning.target ? `workspace.context.store.${warning.target}` : 'workspace.context.store',
    ...(warning.fix ? { fix: warning.fix } : {}),
  });
}

export async function collectWorkspaceContextStatuses(
  context: WorkspaceContextState | null
): Promise<WorkspaceStatus[]> {
  if (!context) {
    return [];
  }

  const initiativeId = getWorkspaceContextInitiativeId(context);
  const contextStoreLabel = formatContextStoreBinding(context.store);
  const selector = formatContextStoreBindingSelector(context.store);
  let resolvedStore: Awaited<ReturnType<typeof resolveContextStoreBinding>>;
  try {
    resolvedStore = await resolveContextStoreBinding(context.store);
  } catch (error) {
    return [
      makeStatus(
        'error',
        'workspace_context_store_unavailable',
        `Workspace context store '${contextStoreLabel}' could not be read: ${asErrorMessage(error)}`,
        {
          target: 'workspace.context.store',
          fix: context.store.selector.kind === 'registry'
            ? 'openspec context-store doctor'
            : `Check the path in .openspec-workspace/view.yaml or run openspec initiative show ${initiativeId} ${selector}`,
        }
      ),
    ];
  }

  const statuses = resolvedStore.warnings.map(contextStoreBindingWarningToStatus);

  try {
    const initiative = await readInitiative({
      collection: mountInitiativesCollection(resolvedStore.root),
      id: initiativeId,
    });

    if (!initiative) {
      return [
        ...statuses,
        makeStatus(
          'error',
          'workspace_initiative_missing',
          `Workspace initiative '${contextStoreLabel}/${initiativeId}' was not found.`,
          {
            target: 'workspace.context.initiative',
            fix: `openspec initiative show ${initiativeId} ${selector}`,
          }
        ),
      ];
    }

    return statuses;
  } catch (error) {
    return [
      ...statuses,
      makeStatus(
        'error',
        'workspace_initiative_unavailable',
        `Workspace initiative '${contextStoreLabel}/${initiativeId}' could not be read: ${asErrorMessage(error)}`,
        {
          target: 'workspace.context.initiative',
          fix: `openspec initiative show ${initiativeId} ${selector}`,
        }
      ),
    ];
  }
}
