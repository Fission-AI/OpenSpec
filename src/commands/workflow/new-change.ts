/**
 * New Change Command
 *
 * Creates a new change directory with optional description and schema.
 */

import ora from 'ora';
import path from 'path';
import { createChange, validateChangeName } from '../../utils/change-utils.js';
import {
  formatChangeLocation,
  resolveCurrentPlanningHomeSync,
  type PlanningHome,
} from '../../core/planning-home.js';
import { validateSchemaExists } from './shared.js';
import {
  resolveInitiativeLinkReference,
  type InitiativeLinkReference,
} from '../../core/collections/initiatives/index.js';
import {
  assertInitiativeSelectorsHaveReference,
  assertRepoLocalInitiativeLinkPlanningHome,
  formatInitiativeLink,
  printJson,
  statusFromError,
} from './initiative-link.js';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export interface NewChangeOptions {
  description?: string;
  goal?: string;
  areas?: string;
  schema?: string;
  initiative?: string;
  store?: string;
  storePath?: string;
  json?: boolean;
}

interface NewChangeOutput {
  change: {
    id: string;
    path: string;
    metadataPath: string;
    schema: string;
  };
  initiative?: InitiativeLinkReference;
}

// -----------------------------------------------------------------------------
// Command Implementation
// -----------------------------------------------------------------------------

function parseAffectedAreas(value: string | undefined): string[] {
  return (value ?? '')
    .split(',')
    .map((area) => area.trim())
    .filter((area) => area.length > 0);
}

function validateWorkspaceAffectedAreas(planningHome: PlanningHome, affectedAreas: string[]): void {
  if (affectedAreas.length === 0) {
    return;
  }

  if (planningHome.kind !== 'workspace') {
    throw new Error('--areas can only be used when creating a workspace-scoped change');
  }

  const validAreas = new Set(planningHome.workspace?.links ?? []);
  const invalidAreas = affectedAreas.filter((area) => !validAreas.has(area));

  if (invalidAreas.length > 0) {
    const validList = [...validAreas].sort((a, b) => a.localeCompare(b));
    const validMessage = validList.length > 0 ? validList.join(', ') : '(no registered links)';
    throw new Error(
      `Invalid affected area${invalidAreas.length === 1 ? '' : 's'}: ${invalidAreas.join(', ')}. ` +
        `Valid workspace link names: ${validMessage}`
    );
  }
}

function outputForCreatedChange(
  id: string,
  changeDir: string,
  schema: string,
  initiative: InitiativeLinkReference | undefined
): NewChangeOutput {
  return {
    change: {
      id,
      path: changeDir,
      metadataPath: path.join(changeDir, '.openspec.yaml'),
      schema,
    },
    ...(initiative ? { initiative } : {}),
  };
}

function printCreatedChangeHuman(payload: NewChangeOutput, planningHome: PlanningHome): void {
  if (!payload.change) {
    return;
  }

  const location = formatChangeLocation(planningHome, payload.change.id);
  const scope = planningHome.kind === 'workspace' ? 'workspace change' : 'change';
  console.log(`Created ${scope} '${payload.change.id}' at ${location}/`);
  console.log(`Schema: ${payload.change.schema}`);
  if (payload.initiative) {
    console.log(`Initiative: ${formatInitiativeLink(payload.initiative)}`);
  }
}

export async function newChangeCommand(name: string | undefined, options: NewChangeOptions): Promise<void> {
  const spinner = options.json ? undefined : ora();

  try {
    if (!name) {
      throw new Error('Missing required argument <name>');
    }

    const validation = validateChangeName(name);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    assertInitiativeSelectorsHaveReference(options);

    const planningHome = resolveCurrentPlanningHomeSync();
    const projectRoot = planningHome.root;
    const affectedAreas = parseAffectedAreas(options.areas);
    validateWorkspaceAffectedAreas(planningHome, affectedAreas);

    let initiative: InitiativeLinkReference | undefined;
    if (options.initiative !== undefined) {
      assertRepoLocalInitiativeLinkPlanningHome(planningHome);

      initiative = await resolveInitiativeLinkReference(options.initiative, {
        store: options.store,
        storePath: options.storePath,
      });
    }

    // Validate schema if provided
    if (options.schema) {
      validateSchemaExists(options.schema, projectRoot);
    }

    const resolvedSchema = options.schema ?? planningHome.defaultSchema;
    if (spinner) {
      spinner.start(`Creating change '${name}' with schema '${resolvedSchema}'...`);
    }

    const workspaceGoal = planningHome.kind === 'workspace'
      ? options.goal ?? options.description
      : options.goal;
    const result = await createChange(projectRoot, name, {
      schema: options.schema,
      defaultSchema: planningHome.defaultSchema,
      changesDir: planningHome.changesDir,
      metadata: {
        ...(workspaceGoal ? { goal: workspaceGoal } : {}),
        ...(affectedAreas.length > 0 ? { affected_areas: affectedAreas } : {}),
        ...(initiative ? { initiative } : {}),
      },
    });

    // If description provided, create README.md with description
    if (options.description) {
      const { promises: fs } = await import('fs');
      const readmePath = path.join(result.changeDir, 'README.md');
      await fs.writeFile(readmePath, `# ${name}\n\n${options.description}\n`, 'utf-8');
    }

    const payload = outputForCreatedChange(name, result.changeDir, result.schema, initiative);

    if (options.json) {
      printJson(payload);
      return;
    }

    spinner?.stop();
    printCreatedChangeHuman(payload, planningHome);

    if (planningHome.kind === 'workspace' && !initiative) {
      if (affectedAreas.length > 0) {
        console.log(`Affected areas: ${affectedAreas.join(', ')}`);
      } else {
        console.log('Affected areas: unresolved; identify them in change metadata or coordination tasks as planning continues.');
      }
      console.log('Next: run openspec status --change "' + name + '" to inspect workspace planning artifacts.');
    }
  } catch (error) {
    spinner?.stop();
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
