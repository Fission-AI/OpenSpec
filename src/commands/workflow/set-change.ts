/**
 * Set Change Command
 *
 * Mutates checked-in repo-local change metadata.
 */

import path from 'node:path';
import {
  getChangeDir,
  resolveCurrentPlanningHomeSync,
} from '../../core/planning-home.js';
import {
  readChangeMetadata,
  resolveSchemaForChange,
  writeChangeMetadata,
} from '../../utils/change-metadata.js';
import { validateChangeExists } from './shared.js';
import {
  resolveInitiativeLinkReference,
  type InitiativeLinkReference,
} from '../../core/collections/initiatives/index.js';
import {
  assertInitiativeReference,
  assertRepoLocalInitiativeLinkPlanningHome,
  formatInitiativeLink,
  printJson,
  sameInitiativeLink,
  statusFromError,
} from './initiative-link.js';

export interface SetChangeOptions {
  initiative?: string;
  store?: string;
  storePath?: string;
  json?: boolean;
}

interface SetChangeOutput {
  change: {
    id: string;
    path: string;
    metadataPath: string;
    schema: string;
  };
  initiative?: InitiativeLinkReference;
  updated?: boolean;
}

function outputForSetChange(
  id: string,
  changeDir: string,
  schema: string,
  initiative: InitiativeLinkReference,
  updated: boolean
): SetChangeOutput {
  return {
    change: {
      id,
      path: changeDir,
      metadataPath: path.join(changeDir, '.openspec.yaml'),
      schema,
    },
    initiative,
    updated,
  };
}

function printSetChangeHuman(payload: SetChangeOutput): void {
  if (!payload.change || !payload.initiative) {
    return;
  }

  const verb = payload.updated ? 'Linked' : 'Change already linked';
  console.log(`${verb}: ${payload.change.id}`);
  console.log(`Initiative: ${formatInitiativeLink(payload.initiative)}`);
  console.log(`Metadata: ${payload.change.metadataPath}`);
}

export async function setChangeCommand(
  name: string | undefined,
  options: SetChangeOptions
): Promise<void> {
  try {
    if (!name) {
      throw new Error('Missing required argument <name>');
    }

    assertInitiativeReference(options.initiative);

    const planningHome = resolveCurrentPlanningHomeSync();
    assertRepoLocalInitiativeLinkPlanningHome(planningHome);

    const projectRoot = planningHome.root;
    const changeName = await validateChangeExists(name, projectRoot, planningHome.changesDir);
    const changeDir = getChangeDir(planningHome, changeName);

    const initiative = await resolveInitiativeLinkReference(options.initiative, {
      store: options.store,
      storePath: options.storePath,
    });

    const existingMetadata = readChangeMetadata(changeDir, projectRoot);
    const metadata = existingMetadata ?? {
      schema: resolveSchemaForChange(changeDir, undefined, projectRoot, { metadata: null }),
    };

    if (sameInitiativeLink(metadata.initiative, initiative)) {
      const payload = outputForSetChange(changeName, changeDir, metadata.schema, initiative, false);
      if (options.json) {
        printJson(payload);
        return;
      }

      printSetChangeHuman(payload);
      return;
    }

    if (metadata.initiative) {
      throw new Error(
        `Change '${changeName}' is already linked to initiative ${formatInitiativeLink(metadata.initiative)}.`
      );
    }

    writeChangeMetadata(changeDir, {
      ...metadata,
      initiative,
    }, projectRoot);

    const payload = outputForSetChange(changeName, changeDir, metadata.schema, initiative, true);
    if (options.json) {
      printJson(payload);
      return;
    }

    printSetChangeHuman(payload);
  } catch (error) {
    if (options.json) {
      printJson({
        change: null,
        status: [statusFromError(error)],
      });
      process.exitCode = 1;
      return;
    }

    throw error;
  }
}
