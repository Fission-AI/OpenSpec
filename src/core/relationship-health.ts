/**
 * Relationship health composition (slice 3.6).
 *
 * One read-only answer to "are the roots this work relates to available
 * on this machine?" — pure composition over inputs the doctor command
 * gathers. The lock's four categories stay separated: root health,
 * store metadata health, reference health, target checkout health.
 * Nothing here (or downstream) clones, syncs, or repairs.
 */
import { makeStoreDiagnostic, type StoreDiagnostic } from './store/errors.js';
import { isKebabId } from './id.js';
import type { ReferenceIndexEntry } from './references.js';
import type { EffectiveTargets, TargetRepoEntry } from './targets.js';
import type { DeclarationEntry } from './project-config.js';
import type { ResolvedOpenSpecRoot } from './root-selection.js';

export interface RelationshipHealth {
  root: {
    path: string;
    source: ResolvedOpenSpecRoot['source'];
    store_id?: string;
    healthy: boolean;
    status: StoreDiagnostic[];
  };
  store: {
    id: string;
    metadata: { present: boolean; valid: boolean; remote?: string };
    origin_url?: string;
    status: StoreDiagnostic[];
  } | null;
  references: ReferenceIndexEntry[];
  targets: HealthTargetEntry[];
  status: StoreDiagnostic[];
}

/** A target entry in the health report always carries its status. */
export type HealthTargetEntry = TargetRepoEntry & { status: StoreDiagnostic[] };

export interface InspectRelationshipsInput {
  root: ResolvedOpenSpecRoot;
  rootHealthy: boolean;
  rootStatus?: StoreDiagnostic[];
  /** Store facts for store-backed roots (explicit or declared). */
  storeFacts?: {
    id: string;
    metadataPresent: boolean;
    metadataValid: boolean;
    canonicalRemote?: string;
    originUrl?: string;
  };
  referenceEntries: ReferenceIndexEntry[];
  /** Null when neither level declares targets. */
  effectiveTargets: EffectiveTargets | null;
  /** Raw store-level declarations — invalid ids are re-derived from
   * here structurally (diagnostic messages are never parsed). */
  storeTargets?: DeclarationEntry[];
  registryUnreadable: boolean;
  /** A real root whose config also declares a store: pointer (3.2). */
  bothShapesPointer?: { value: string; filePath: string };
  /** Declarations in a pointer directory's own config (3.4 deferral). */
  inertPointerDeclarations?: { filePath: string; fields: string[] };
}

function warning(code: string, message: string, fix: string): StoreDiagnostic {
  return makeStoreDiagnostic('warning', code, message, { target: 'relationships', fix });
}

export function inspectRelationships(input: InspectRelationshipsInput): RelationshipHealth {
  const status: StoreDiagnostic[] = [];

  if (input.registryUnreadable) {
    status.push(
      warning(
        'relationship_registry_unreadable',
        'The store registry is unreadable; reference and target health cannot be checked.',
        'Run: openspec store doctor'
      )
    );
  }

  if (input.bothShapesPointer) {
    status.push(
      warning(
        'root_pointer_ignored',
        `${input.bothShapesPointer.filePath} declares store '${input.bothShapesPointer.value}', but this directory is a real OpenSpec root; the declaration is ignored.`,
        `Remove the store: line from ${input.bothShapesPointer.filePath}, or move the planning files into the store.`
      )
    );
  }

  if (input.inertPointerDeclarations && input.inertPointerDeclarations.fields.length > 0) {
    status.push(
      warning(
        'pointer_declarations_inert',
        `${input.inertPointerDeclarations.filePath} declares ${input.inertPointerDeclarations.fields.join(' and ')}, but commands read the resolved store's config — these declarations are inert.`,
        `Move the ${input.inertPointerDeclarations.fields.join('/')} declarations into the store's openspec/config.yaml.`
      )
    );
  }

  // Targets: effective entries enriched with the doctor-only
  // diagnostics, plus synthesized bare entries for grammar-invalid
  // declared ids (the assembler excludes them from repos).
  const targets: HealthTargetEntry[] = [];
  for (const entry of input.effectiveTargets?.repos ?? []) {
    if (entry.path === undefined && !input.registryUnreadable) {
      targets.push({
        ...entry,
        status: [
          warning(
            'target_unmapped',
            `Target repo '${entry.id}' is not mapped on this machine.`,
            `Run: openspec repo register <path> --id ${entry.id}`
          ),
        ],
      });
      continue;
    }
    targets.push({ ...entry, status: [] });
  }
  for (const declaration of input.storeTargets ?? []) {
    if (!isKebabId(declaration.id)) {
      targets.push({
        id: declaration.id,
        status: [
          warning(
            'target_invalid_id',
            `Target '${declaration.id}' is not a valid repo id.`,
            'Use kebab-case repo ids in the targets list.'
          ),
        ],
      });
    }
  }

  // Store section: metadata facts + the divergence info note.
  let store: RelationshipHealth['store'] = null;
  if (input.storeFacts) {
    const storeStatus: StoreDiagnostic[] = [];
    if (
      input.storeFacts.canonicalRemote &&
      input.storeFacts.originUrl &&
      input.storeFacts.canonicalRemote !== input.storeFacts.originUrl
    ) {
      storeStatus.push(
        makeStoreDiagnostic(
          'info',
          'store_remote_divergence',
          `The store.yaml remote (${input.storeFacts.canonicalRemote}) differs from the checkout's origin (${input.storeFacts.originUrl}).`,
          { target: 'store.metadata' }
        )
      );
    }
    store = {
      id: input.storeFacts.id,
      metadata: {
        present: input.storeFacts.metadataPresent,
        valid: input.storeFacts.metadataValid,
        ...(input.storeFacts.canonicalRemote
          ? { remote: input.storeFacts.canonicalRemote }
          : {}),
      },
      ...(input.storeFacts.originUrl ? { origin_url: input.storeFacts.originUrl } : {}),
      status: storeStatus,
    };
  }

  return {
    root: {
      path: input.root.path,
      source: input.root.source,
      ...(input.root.storeId ? { store_id: input.root.storeId } : {}),
      healthy: input.rootHealthy,
      status: input.rootStatus ?? [],
    },
    store,
    references: input.referenceEntries,
    targets,
    status,
  };
}
