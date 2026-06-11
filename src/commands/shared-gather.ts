/**
 * The relationship-data gather shared by doctor and context (4.1): one
 * registry snapshot, the health-mode reference index, store-level
 * targets, the root inspection, and the stale-path stat sweep both
 * surfaces classify with. Doctor layers its health-only inputs (store
 * facts, wrong-turn detection) on top.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';

import { readRegistrySnapshot, type RegistrySnapshot } from '../core/store/registry.js';
import {
  readProjectConfig,
  resolveConfigFilePath,
  type DeclarationEntry,
  type ProjectConfig,
} from '../core/project-config.js';
import { assembleReferenceIndex, type ReferenceIndexEntry } from '../core/references.js';
import { assembleTargets, type EffectiveTargets } from '../core/targets.js';
import { inspectOpenSpecRoot, type OpenSpecRootInspection } from '../core/openspec-root.js';
import type { ResolvedOpenSpecRoot } from '../core/root-selection.js';

export interface RelationshipData {
  registrySnapshot: RegistrySnapshot;
  projectConfig: ProjectConfig | null;
  storeConfigPath: string;
  referenceEntries: ReferenceIndexEntry[];
  effectiveTargets: EffectiveTargets | null;
  storeTargets: DeclarationEntry[] | undefined;
  rootInspection: OpenSpecRootInspection;
}

export async function gatherRelationshipData(
  root: ResolvedOpenSpecRoot
): Promise<RelationshipData> {
  const registrySnapshot = await readRegistrySnapshot();

  const projectConfig = readProjectConfig(root.path);
  const storeConfigPath =
    resolveConfigFilePath(root.path) ?? path.join(root.path, 'openspec', 'config.yaml');

  const referenceEntries = await assembleReferenceIndex({
    references: projectConfig?.references ?? [],
    resolvedRoot: root,
    includeSpecs: false,
    registryEntries: registrySnapshot.entries,
  });

  const effectiveTargets = assembleTargets({
    storeTargets: projectConfig?.targets,
    storeConfigPath,
    ...(registrySnapshot.repoPaths ? { repoPaths: registrySnapshot.repoPaths } : {}),
  });

  const rootInspection = await inspectOpenSpecRoot(root.path);

  return {
    registrySnapshot,
    projectConfig,
    storeConfigPath,
    referenceEntries,
    effectiveTargets,
    storeTargets: projectConfig?.targets,
    rootInspection,
  };
}

/**
 * Mapped target ids whose checkout path no longer exists — a stale
 * mapping must never present as available. Stats only the declared
 * targets, never the whole registry.
 */
export function missingDeclaredRepoPaths(
  effectiveTargets: EffectiveTargets | null
): Set<string> | undefined {
  if (!effectiveTargets) {
    return undefined;
  }
  return new Set(
    effectiveTargets.repos
      .filter((entry) => entry.path !== undefined && !fs.existsSync(entry.path))
      .map((entry) => entry.id)
  );
}
