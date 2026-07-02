/**
 * `openspec doctor` (slice 3.6): the root-scoped relationship-health
 * report. Read-only — it answers "are the roots this work relates to
 * available on this machine?" and never clones, syncs, or repairs.
 */
import { Command, Option } from 'commander';

import {
  resolveRootForCommand,
  type ResolvedOpenSpecRoot,
} from '../core/root-selection.js';
import { readOptionalStoreMetadataState } from '../core/store/foundation.js';
import { gitOriginUrl, isGitRepositoryAtRoot } from '../core/store/git.js';
import {
  classifyOpenSpecDir,
  readProjectConfig,
  resolveConfigFilePath,
} from '../core/project-config.js';
import { findRepoPlanningRootSync } from '../core/planning-home.js';
import { gatherRelationshipData } from './shared-gather.js';
import {
  inspectRelationships,
  type InspectRelationshipsInput,
  type RelationshipHealth,
} from '../core/relationship-health.js';
import { COMMAND_REGISTRY } from '../core/completions/command-registry.js';
import { COMMON_FLAGS } from '../core/completions/shared-flags.js';
import { emitFailure, printJson } from './shared-output.js';
import * as path from 'node:path';

const FAILURE_PAYLOAD = { root: null, store: null, references: [] };

async function gatherHealth(
  root: ResolvedOpenSpecRoot
): Promise<{ health: RelationshipHealth; declaredReferenceCount: number }> {
  const data = await gatherRelationshipData(root);
  const {
    registrySnapshot,
    projectConfig,
    referenceEntries,
    rootInspection,
  } = data;
  const registryUnreadable = registrySnapshot.unreadable;

  const input: InspectRelationshipsInput = {
    root,
    rootHealthy: rootInspection.healthy,
    rootStatus: rootInspection.diagnostics,
    referenceEntries,
    registryUnreadable,
  };

  // Store facts for store-backed roots (explicit --store or declared).
  // Missing/invalid metadata never reaches here: store resolution
  // verifies identity first and fails with the existing taxonomy
  // (recorded amendment - corrupt store.yaml is an exit-1 resolution
  // failure, not a health finding).
  if (root.storeId) {
    const metadata = await readOptionalStoreMetadataState(root.path).catch(() => null);
    // git -C walks UP the tree: probing a non-repo store nested inside
    // another repo would record the ENCLOSING repo's origin.
    const originUrl = (await isGitRepositoryAtRoot(root.path)) ? await gitOriginUrl(root.path) : null;
    input.storeFacts = {
      id: root.storeId,
      metadataPresent: metadata !== null,
      metadataValid: metadata !== null,
      ...(metadata?.remote ? { canonicalRemote: metadata.remote } : {}),
      ...(originUrl ? { originUrl } : {}),
    };
  }

  // The 3.2 both-shapes wrong turn, structured — including a malformed
  // pointer value, which the resolver is silent about on planning-shaped
  // roots.
  if (root.source === 'nearest') {
    const { hasPlanningShape, pointer } = classifyOpenSpecDir(root.path);
    if (hasPlanningShape && pointer.filePath) {
      if (pointer.value !== undefined) {
        input.bothShapesPointer = { value: pointer.value, filePath: pointer.filePath };
      } else if (pointer.malformed) {
        input.malformedPointer = { filePath: pointer.filePath, reason: pointer.malformed };
      }
    }
  }

  // The 3.4-recorded inert-pointer wrong turn: the resolved root is the
  // STORE; re-walk to the pointer directory and read ITS config.
  if (root.source === 'declared') {
    const pointerRoot = findRepoPlanningRootSync(process.cwd());
    if (pointerRoot) {
      const pointerConfig = readProjectConfig(pointerRoot);
      const fields: string[] = [];
      if (pointerConfig?.references?.length) fields.push('references');
      if (fields.length > 0) {
        const filePath =
          resolveConfigFilePath(pointerRoot) ??
          path.join(pointerRoot, 'openspec', 'config.yaml');
        input.inertPointerDeclarations = { filePath, fields };
      }
    }
  }

  return {
    health: inspectRelationships(input),
    declaredReferenceCount: projectConfig?.references?.length ?? 0,
  };
}

function printDiagnosticLines(prefix: string, status: { message: string; fix?: string }[]): void {
  for (const entry of status) {
    console.log(`${prefix}- ${entry.message}`);
    if (entry.fix) {
      console.log(`${prefix}  Fix: ${entry.fix}`);
    }
  }
}

function printEntrySection<T extends { status: { message: string; fix?: string }[] }>(
  title: string,
  entries: T[],
  emptyLine: string,
  okLine: (entry: T) => string,
  idOf: (entry: T) => string
): void {
  console.log('');
  console.log(title);
  if (entries.length === 0) {
    console.log(`  ${emptyLine}`);
    return;
  }
  for (const entry of entries) {
    if (entry.status.length === 0) {
      console.log(`  - ${okLine(entry)}`);
      continue;
    }
    for (const diagnostic of entry.status) {
      console.log(`  - ${idOf(entry)}: ${diagnostic.message}`);
      if (diagnostic.fix) {
        console.log(`    Fix: ${diagnostic.fix}`);
      }
    }
  }
}

function printHumanHealth(health: RelationshipHealth, declaredReferenceCount: number): void {
  console.log('Doctor');
  console.log('');
  console.log('Root');
  console.log(`  Location: ${health.root.path}`);
  console.log(`  OpenSpec root: ${health.root.healthy ? 'ok' : 'unhealthy'}`);
  if (health.store) {
    const metadataNote = health.store.metadata.valid ? 'metadata ok' : 'metadata invalid';
    console.log(`  Store: ${health.store.id} (${metadataNote})`);
  }
  printDiagnosticLines('  ', [...health.root.status, ...(health.store?.status ?? [])]);

  // "(none declared)" must never lie: self-references are omitted from
  // the index, so an emptied-by-omission list gets its own line.
  const referencesEmptyLine =
    health.references.length === 0 && declaredReferenceCount > 0
      ? '(declared references all resolve to this root)'
      : '(none declared)';
  printEntrySection(
    'References',
    health.references,
    referencesEmptyLine,
    (entry) => `${entry.store_id}: ok${entry.root ? ` (${entry.root})` : ''}`,
    (entry) => entry.store_id
  );

  for (const entry of health.status) {
    console.log('');
    console.log(`Note: ${entry.message}`);
    if (entry.fix) {
      console.log(`Fix: ${entry.fix}`);
    }
  }
}

export function registerDoctorCommand(program: Command): void {
  const description =
    COMMAND_REGISTRY.find((entry) => entry.name === 'doctor')?.description ??
    'Report relationship health for the resolved OpenSpec root';

  program
    .command('doctor')
    .description(description)
    .option('--store <id>', COMMON_FLAGS.store.description)
    .addOption(
      new Option('--store-path <path>', 'Removed; register the store and use --store').hideHelp()
    )
    .option('--json', 'Output as JSON')
    .action(async (options: { store?: string; storePath?: string; json?: boolean }) => {
      try {
        const root = await resolveRootForCommand(
          { store: options.store, storePath: options.storePath },
          { json: options.json, failurePayload: FAILURE_PAYLOAD, allowImplicitRoot: false }
        );
        if (!root) {
          return;
        }

        const { health, declaredReferenceCount } = await gatherHealth(root);

        if (options.json) {
          printJson(health);
          return;
        }
        printHumanHealth(health, declaredReferenceCount);
      } catch (error) {
        emitFailure(options.json, FAILURE_PAYLOAD, error, 'doctor_failed');
      }
    });
}
