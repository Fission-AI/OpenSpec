import {
  mountInitiativesCollection,
  readInitiative,
} from '../../core/collections/initiatives/index.js';
import {
  formatStoreBinding,
  formatStoreBindingSelector,
  resolveStoreBinding,
  type StoreBindingWarning,
} from '../../core/store/index.js';
import {
  getWorkspaceContextInitiativeId,
  type WorkspaceContextState,
} from '../../core/workspace/index.js';
import { WorkspaceStatus, asErrorMessage, makeStatus } from './types.js';

function storeBindingWarningToStatus(
  warning: StoreBindingWarning
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
  const storeLabel = formatStoreBinding(context.store);
  const selector = formatStoreBindingSelector(context.store);
  let resolvedStore: Awaited<ReturnType<typeof resolveStoreBinding>>;
  try {
    resolvedStore = await resolveStoreBinding(context.store);
  } catch (error) {
    return [
      makeStatus(
        'error',
        'workspace_store_unavailable',
        `Workspace store '${storeLabel}' could not be read: ${asErrorMessage(error)}`,
        {
          target: 'workspace.context.store',
          fix: context.store.selector.kind === 'registry'
            ? 'openspec store doctor'
            : `Check the path in .openspec-workspace/view.yaml or run openspec initiative show ${initiativeId} ${selector}`,
        }
      ),
    ];
  }

  const statuses = resolvedStore.warnings.map(storeBindingWarningToStatus);

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
          `Workspace initiative '${storeLabel}/${initiativeId}' was not found.`,
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
        `Workspace initiative '${storeLabel}/${initiativeId}' could not be read: ${asErrorMessage(error)}`,
        {
          target: 'workspace.context.initiative',
          fix: `openspec initiative show ${initiativeId} ${selector}`,
        }
      ),
    ];
  }
}
