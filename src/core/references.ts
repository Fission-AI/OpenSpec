/**
 * Referenced-store index assembly (slice 3.1).
 *
 * A root's `openspec/config.yaml` may declare `references:` — store ids
 * whose specs the root's work draws on. Instructions output carries an
 * INDEX of those stores' specs (id, one-line summary, fetch recipe via
 * `--store`), built live from the registered checkouts at assembly time.
 * Content is never inlined; root resolution is never affected; problems
 * degrade to `warning` diagnostics instead of failing generation.
 */
import * as fs from 'node:fs/promises';
import * as path from 'node:path';

import { makeStoreDiagnostic, type StoreDiagnostic } from './store/errors.js';
import {
  isValidStoreId,
  listStoreRegistryEntries,
  readStoreRegistryState,
} from './store/foundation.js';
import { getStoreRootForBackend } from './store/registry.js';
import { inspectRegisteredStore, type ResolvedOpenSpecRoot } from './root-selection.js';
import { getSpecIds } from '../utils/item-discovery.js';
import { FileSystemUtils } from '../utils/file-system.js';

export interface ReferenceSpecEntry {
  id: string;
  summary: string;
}

export interface ReferenceIndexEntry {
  store_id: string;
  root?: string;
  specs?: ReferenceSpecEntry[];
  fetch?: string;
  status: StoreDiagnostic[];
}

/**
 * Shares the spirit of the 50KB project-context cap: the rendered index
 * is prompt material. Measured against the larger (XML) rendering.
 */
const MAX_RENDERED_INDEX_SIZE = 50 * 1024;

function warning(
  code: string,
  message: string,
  fix: string
): StoreDiagnostic {
  return makeStoreDiagnostic('warning', code, message, { target: 'references', fix });
}

function registerFix(id: string): string {
  return `Get a checkout from a teammate and run: openspec store register <path> --id ${id}`;
}

/**
 * Tolerant first-Purpose-line extraction. parseSpec() throws on specs
 * without Purpose/Requirements sections; the index must never fail on an
 * imperfect upstream spec, so this scans for the heading directly.
 */
export function extractFirstPurposeLine(markdown: string): string {
  const lines = markdown.split('\n');
  let inPurpose = false;

  for (const line of lines) {
    const heading = line.match(/^(#{1,6})\s+(.*)$/);
    if (heading) {
      if (inPurpose) {
        return '';
      }
      inPurpose = heading[2].trim().toLowerCase() === 'purpose';
      continue;
    }
    if (inPurpose && line.trim().length > 0) {
      return line.trim();
    }
  }

  return '';
}

async function collectSpecEntries(referencedRoot: string): Promise<ReferenceSpecEntry[]> {
  const specIds = await getSpecIds(referencedRoot);
  const entries: ReferenceSpecEntry[] = [];

  for (const specId of specIds) {
    let summary = '';
    try {
      const content = await fs.readFile(
        path.join(referencedRoot, 'openspec', 'specs', specId, 'spec.md'),
        'utf-8'
      );
      summary = extractFirstPurposeLine(content);
    } catch {
      // Unreadable spec file: index the id with an empty summary.
    }
    entries.push({ id: specId, summary });
  }

  return entries;
}

function fetchRecipe(storeId: string): string {
  return `openspec show <spec-id> --type spec --store ${storeId}`;
}

function specLine(spec: ReferenceSpecEntry): string {
  return spec.summary ? `  - ${spec.id}: ${spec.summary}` : `  - ${spec.id}`;
}

/**
 * Pure renderer for the artifact-instructions XML block. Also the byte
 * budget's measuring stick (it is the larger rendering).
 */
export function renderReferencedStoresBlock(entries: ReferenceIndexEntry[]): string {
  const lines: string[] = [
    '<referenced_stores>',
    '<!-- Read-only upstream context. Fetch what you need; cite what you use. -->',
  ];

  for (const entry of entries) {
    lines.push(...renderEntryLines(entry));
  }

  lines.push('</referenced_stores>');
  return lines.join('\n');
}

/** Pure renderer for the apply-instructions markdown section. */
export function renderReferencedStoresSection(entries: ReferenceIndexEntry[]): string {
  const lines: string[] = [
    '### Referenced Stores',
    '',
    'Read-only upstream context. Fetch what you need; cite what you use.',
    '',
  ];

  for (const entry of entries) {
    lines.push(...renderEntryLines(entry));
  }

  return lines.join('\n');
}

function renderEntryLines(entry: ReferenceIndexEntry): string[] {
  const lines: string[] = [];

  if (entry.root !== undefined) {
    lines.push(`Store ${entry.store_id} (${entry.root}):`);
    for (const spec of entry.specs ?? []) {
      lines.push(specLine(spec));
    }
    if (entry.fetch) {
      lines.push(`  Fetch: ${entry.fetch}`);
    }
  } else {
    const problem = entry.status[0];
    lines.push(`Store ${entry.store_id}: ${problem?.message ?? 'unavailable.'}`);
  }

  for (const diagnostic of entry.status) {
    if (diagnostic.fix) {
      lines.push(`  Fix: ${diagnostic.fix}`);
    }
  }

  return lines;
}

export interface AssembleReferenceIndexInput {
  references: string[];
  resolvedRoot: ResolvedOpenSpecRoot;
  globalDataDir?: string;
}

/**
 * Builds the referenced-store index. One registry read per call; one
 * level deep (a referenced store's own references are never followed);
 * self-references omitted; every failure degrades to a warning entry.
 */
export async function assembleReferenceIndex(
  input: AssembleReferenceIndexInput
): Promise<ReferenceIndexEntry[]> {
  const ids = input.references;
  if (ids.length === 0) {
    return [];
  }

  let registryEntries: ReturnType<typeof listStoreRegistryEntries> | null = null;
  let registryUnreadable = false;
  try {
    const registry = await readStoreRegistryState(
      input.globalDataDir ? { globalDataDir: input.globalDataDir } : {}
    );
    registryEntries = registry ? listStoreRegistryEntries(registry) : [];
  } catch {
    registryUnreadable = true;
  }

  const resolvedRootPath = canonicalize(input.resolvedRoot.path);
  const entries: ReferenceIndexEntry[] = [];
  let renderedSize = renderReferencedStoresBlock([]).length;

  for (const id of ids) {
    if (registryUnreadable) {
      entries.push({
        store_id: id,
        status: [
          warning(
            'reference_registry_unreadable',
            `Referenced store '${id}' cannot be checked: the store registry is unreadable.`,
            'Run: openspec store doctor'
          ),
        ],
      });
      continue;
    }

    if (!isValidStoreId(id)) {
      entries.push({
        store_id: id,
        status: [
          warning(
            'reference_invalid_id',
            `Reference '${id}' is not a valid store id.`,
            'Use kebab-case store ids in the references list.'
          ),
        ],
      });
      continue;
    }

    if (input.resolvedRoot.storeId === id) {
      continue; // Self-reference: meaningless, silently omitted.
    }

    const registryEntry = registryEntries?.find((candidate) => candidate.id === id);
    if (!registryEntry) {
      entries.push({
        store_id: id,
        status: [
          warning(
            'reference_unresolved',
            `Referenced store '${id}' is not registered on this machine.`,
            registerFix(id)
          ),
        ],
      });
      continue;
    }

    const storeRoot = getStoreRootForBackend(registryEntry.backend);
    const inspection = await inspectRegisteredStore(id, storeRoot);

    if (inspection.kind !== 'ok') {
      entries.push({
        store_id: id,
        status: [
          warning(
            'reference_root_unhealthy',
            `Referenced store '${id}' is registered but not usable (${inspection.kind.replace(/_/g, ' ')}).`,
            `Run: openspec store doctor ${id}`
          ),
        ],
      });
      continue;
    }

    if (inspection.canonicalRoot === resolvedRootPath) {
      continue; // Self-reference by path: silently omitted.
    }

    const specs = await collectSpecEntries(inspection.canonicalRoot);
    const entry: ReferenceIndexEntry = {
      store_id: id,
      root: inspection.canonicalRoot,
      specs,
      fetch: fetchRecipe(id),
      status: [],
    };

    // Budget: stop appending spec lines once the next one would exceed
    // the cap; the truncation warning itself is exempt (no oscillation).
    const baseSize = renderedSize + renderEntryBaseSize(entry);
    let size = baseSize;
    const kept: ReferenceSpecEntry[] = [];
    let truncated = false;
    for (const spec of specs) {
      const lineSize = specLine(spec).length + 1;
      if (size + lineSize > MAX_RENDERED_INDEX_SIZE) {
        truncated = true;
        break;
      }
      kept.push(spec);
      size += lineSize;
    }

    if (truncated) {
      entry.specs = kept;
      entry.status.push(
        warning(
          'reference_index_truncated',
          `Referenced store '${id}' index truncated at the 50KB budget (${kept.length} of ${specs.length} specs listed).`,
          `List the rest directly: openspec list --specs --store ${id}`
        )
      );
    }

    renderedSize = size;
    entries.push(entry);
  }

  return entries;
}

function renderEntryBaseSize(entry: ReferenceIndexEntry): number {
  return (
    `Store ${entry.store_id} (${entry.root}):`.length +
    (entry.fetch ? `  Fetch: ${entry.fetch}`.length : 0) +
    2
  );
}

function canonicalize(candidate: string): string {
  try {
    return FileSystemUtils.canonicalizeExistingPath(candidate);
  } catch {
    return candidate;
  }
}
