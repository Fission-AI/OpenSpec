/**
 * `openspec doctor` (slice 3.6): the root-scoped relationship-health
 * report. Read-only — it answers "are the roots this work relates to
 * available on this machine?" and never clones, syncs, or repairs.
 */
import { Command } from 'commander';

import {
  resolveRootForCommand,
  type ResolvedOpenSpecRoot,
} from '../core/root-selection.js';
import {
  listStoreRegistryEntries,
  readOptionalStoreMetadataState,
  readStoreRegistryState,
  type StoreRegistryState,
} from '../core/store/foundation.js';
import { listRepoEntries } from '../core/store/registry.js';
import { gitOriginUrl } from '../core/store/git.js';
import { inspectOpenSpecRoot } from '../core/openspec-root.js';
import {
  classifyOpenSpecDir,
  readProjectConfig,
  resolveConfigFilePath,
} from '../core/project-config.js';
import { findRepoPlanningRootSync } from '../core/planning-home.js';
import { assembleReferenceIndex } from '../core/references.js';
import { assembleTargets } from '../core/targets.js';
import {
  inspectRelationships,
  type InspectRelationshipsInput,
  type RelationshipHealth,
} from '../core/relationship-health.js';
import { COMMAND_REGISTRY } from '../core/completions/command-registry.js';
import { COMMON_FLAGS } from '../core/completions/shared-flags.js';
import { printJson } from './shared-output.js';
import * as path from 'node:path';

const FAILURE_PAYLOAD = { root: null, store: null, references: [], targets: [] };

async function gatherHealth(root: ResolvedOpenSpecRoot): Promise<RelationshipHealth> {
  // One registry read feeds references, targets, and the unreadable
  // signal coherently. Success-null = absent = empty; throw = unreadable.
  let registry: StoreRegistryState | null = null;
  let registryUnreadable = false;
  try {
    registry = await readStoreRegistryState();
  } catch {
    registryUnreadable = true;
  }
  const registryEntries = registryUnreadable
    ? null
    : registry
      ? listStoreRegistryEntries(registry)
      : [];
  const repoPaths = registryUnreadable
    ? undefined
    : new Map(listRepoEntries(registry).map((entry) => [entry.id, entry.path]));

  const projectConfig = readProjectConfig(root.path);
  const storeConfigPath =
    resolveConfigFilePath(root.path) ?? path.join(root.path, 'openspec', 'config.yaml');

  const referenceEntries = await assembleReferenceIndex({
    references: projectConfig?.references ?? [],
    resolvedRoot: root,
    includeSpecs: false,
    registryEntries,
  });

  const effectiveTargets = assembleTargets({
    storeTargets: projectConfig?.targets,
    storeConfigPath,
    ...(repoPaths ? { repoPaths } : {}),
  });

  const rootInspection = await inspectOpenSpecRoot(root.path);

  const input: InspectRelationshipsInput = {
    root,
    rootHealthy: rootInspection.healthy,
    rootStatus: rootInspection.diagnostics,
    referenceEntries,
    effectiveTargets,
    storeTargets: projectConfig?.targets,
    registryUnreadable,
  };

  // Store facts for store-backed roots (explicit --store or declared).
  if (root.storeId) {
    const metadata = await readOptionalStoreMetadataState(root.path).catch(() => null);
    const originUrl = await gitOriginUrl(root.path);
    input.storeFacts = {
      id: root.storeId,
      metadataPresent: metadata !== null,
      metadataValid: metadata !== null,
      ...(metadata?.remote ? { canonicalRemote: metadata.remote } : {}),
      ...(originUrl ? { originUrl } : {}),
    };
  }

  // The 3.2 both-shapes wrong turn, structured.
  if (root.source === 'nearest') {
    const { hasPlanningShape, pointer } = classifyOpenSpecDir(root.path);
    if (hasPlanningShape && pointer.value !== undefined && pointer.filePath) {
      input.bothShapesPointer = { value: pointer.value, filePath: pointer.filePath };
    }
  }

  // The 3.4-recorded inert-pointer wrong turn: the resolved root is the
  // STORE; re-walk to the pointer directory and read ITS config.
  if (root.source === 'declared') {
    const pointerRoot = findRepoPlanningRootSync(process.cwd());
    if (pointerRoot) {
      const pointerConfig = readProjectConfig(pointerRoot);
      const fields: string[] = [];
      if (pointerConfig?.targets?.length) fields.push('targets');
      if (pointerConfig?.references?.length) fields.push('references');
      if (fields.length > 0) {
        const filePath =
          resolveConfigFilePath(pointerRoot) ??
          path.join(pointerRoot, 'openspec', 'config.yaml');
        input.inertPointerDeclarations = { filePath, fields };
      }
    }
  }

  return inspectRelationships(input);
}

function printHumanHealth(health: RelationshipHealth): void {
  console.log('Doctor');
  console.log('');
  console.log('Root');
  console.log(`  Location: ${health.root.path}`);
  console.log(`  OpenSpec root: ${health.root.healthy ? 'ok' : 'unhealthy'}`);
  if (health.store) {
    const metadataNote = health.store.metadata.valid ? 'metadata ok' : 'metadata invalid';
    console.log(`  Store: ${health.store.id} (${metadataNote})`);
  }
  for (const sectionStatus of [health.root.status, health.store?.status ?? []]) {
    for (const entry of sectionStatus) {
      console.log(`  - ${entry.message}`);
      if (entry.fix) {
        console.log(`    Fix: ${entry.fix}`);
      }
    }
  }

  console.log('');
  console.log('References');
  if (health.references.length === 0) {
    console.log('  (none declared)');
  }
  for (const entry of health.references) {
    if (entry.status.length === 0) {
      console.log(`  - ${entry.store_id}: ok${entry.root ? ` (${entry.root})` : ''}`);
      continue;
    }
    for (const diagnostic of entry.status) {
      console.log(`  - ${entry.store_id}: ${diagnostic.message}`);
      if (diagnostic.fix) {
        console.log(`    Fix: ${diagnostic.fix}`);
      }
    }
  }

  console.log('');
  console.log('Targets');
  if (health.targets.length === 0) {
    console.log('  (none declared)');
  }
  for (const entry of health.targets) {
    if (entry.status.length === 0) {
      console.log(`  - ${entry.id}: ${entry.path ? `mapped (${entry.path})` : 'declared'}`);
      continue;
    }
    for (const diagnostic of entry.status) {
      console.log(`  - ${entry.id}: ${diagnostic.message}`);
      if (diagnostic.fix) {
        console.log(`    Fix: ${diagnostic.fix}`);
      }
    }
  }

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
    .option('--json', 'Output as JSON')
    .action(async (options: { store?: string; json?: boolean }) => {
      const root = await resolveRootForCommand(
        { store: options.store },
        { json: options.json, failurePayload: FAILURE_PAYLOAD, allowImplicitRoot: false }
      );
      if (!root) {
        return;
      }

      const health = await gatherHealth(root);

      if (options.json) {
        printJson(health);
        return;
      }
      printHumanHealth(health);
    });
}
