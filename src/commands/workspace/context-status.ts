import {
  mountInitiativesCollection,
  readInitiative,
} from '../../core/collections/initiatives/index.js';
import {
  resolveRegisteredContextStore,
} from '../../core/context-store/index.js';
import type { WorkspaceContextState } from '../../core/workspace/index.js';
import { WorkspaceStatus, asErrorMessage, makeStatus } from './types.js';

export async function collectWorkspaceContextStatuses(
  context: WorkspaceContextState | null
): Promise<WorkspaceStatus[]> {
  if (!context) {
    return [];
  }

  try {
    const resolvedStore = await resolveRegisteredContextStore({ id: context.store });
    const initiative = await readInitiative({
      collection: mountInitiativesCollection(resolvedStore.storeRoot),
      id: context.initiative,
    });

    if (!initiative) {
      return [
        makeStatus(
          'error',
          'workspace_initiative_missing',
          `Workspace initiative '${context.store}/${context.initiative}' was not found.`,
          {
            target: 'workspace.context.initiative',
            fix: `openspec initiative show ${context.initiative} --store ${context.store}`,
          }
        ),
      ];
    }

    return [];
  } catch (error) {
    return [
      makeStatus(
        'error',
        'workspace_context_store_unavailable',
        `Workspace context store '${context.store}' could not be read: ${asErrorMessage(error)}`,
        {
          target: 'workspace.context.store',
          fix: 'openspec context-store doctor',
        }
      ),
    ];
  }
}
