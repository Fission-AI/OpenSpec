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
 * Shares the 50KB project-context cap: the rendered index is prompt
 * material. Measured in UTF-8 bytes against the XML rendering (the
 * larger of the two), entries and diagnostics included; only the
 * truncation warning itself is exempt (no oscillation).
 */
const MAX_RENDERED_INDEX_SIZE = 50 * 1024;

function warning(code: string, message: string, fix: string): StoreDiagnostic {
  return makeStoreDiagnostic('warning', code, message, { target: 'references', fix });
}

function registerFix(id: string): string {
  return `Get a checkout from a teammate and run: openspec store register <path> --id ${id}`;
}

/**
 * Tolerant first-Purpose-line extraction. parseSpec() throws on specs
 * without Purpose/Requirements sections; the index must never fail on an
 * imperfect upstream spec, so this scans for the heading directly —
 * fence-aware, so `## Purpose` inside a code block never matches, and
 * tolerant of CommonMark closing hashes (`## Purpose ##`).
 */
export function extractFirstPurposeLine(markdown: string): string {
  const lines = markdown.split('\n');
  let inPurpose = false;
  let inFence = false;

  for (const line of lines) {
    if (/^\s*(```|~~~)/.test(line)) {
      inFence = !inFence;
      continue;
    }
    if (inFence) {
      continue;
    }

    const heading = line.match(/^(#{1,6})\s+(.*)$/);
    if (heading) {
      if (inPurpose) {
        return '';
      }
      const title = heading[2].replace(/\s+#+\s*$/, '').trim();
      inPurpose = title.toLowerCase() === 'purpose';
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

  return Promise.all(
    specIds.map(async (specId) => {
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
      return { id: specId, summary };
    })
  );
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
    // Diagnostics on a resolved entry (e.g. truncation) render message
    // AND fix — an orphan fix line would hide that the list is partial.
    for (const diagnostic of entry.status) {
      lines.push(`  Note: ${diagnostic.message}`);
      if (diagnostic.fix) {
        lines.push(`  Fix: ${diagnostic.fix}`);
      }
    }
  } else {
    for (const diagnostic of entry.status) {
      lines.push(`Store ${entry.store_id}: ${diagnostic.message}`);
      if (diagnostic.fix) {
        lines.push(`  Fix: ${diagnostic.fix}`);
      }
    }
  }

  return lines;
}

function renderedByteSize(entries: ReferenceIndexEntry[]): number {
  return Buffer.byteLength(renderReferencedStoresBlock(entries), 'utf-8');
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

  for (const id of ids) {
    // Registry-independent checks come first: an invalid id is an
    // invalid id (and a self-reference is omittable) even when the
    // registry is corrupt.
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

    let inspection;
    try {
      const storeRoot = getStoreRootForBackend(registryEntry.backend);
      inspection = await inspectRegisteredStore(id, storeRoot);
    } catch (error) {
      inspection = { kind: 'inspection_error' as const, error };
    }

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

    // Budget the real rendering: keep the longest spec-list prefix whose
    // full rendered index stays under the cap. The truncation warning
    // itself is exempt (added after the size decision — no oscillation).
    entries.push(entry);
    if (renderedByteSize(entries) > MAX_RENDERED_INDEX_SIZE) {
      let low = 0;
      let high = specs.length;
      while (low < high) {
        const mid = Math.ceil((low + high) / 2);
        entry.specs = specs.slice(0, mid);
        if (renderedByteSize(entries) > MAX_RENDERED_INDEX_SIZE) {
          high = mid - 1;
        } else {
          low = mid;
        }
      }
      entry.specs = specs.slice(0, low);
      entry.status.push(
        warning(
          'reference_index_truncated',
          `Referenced store '${id}' index truncated at the 50KB budget (${low} of ${specs.length} specs listed).`,
          `List the rest directly: openspec list --specs --store ${id}`
        )
      );
    }
  }

  return entries;
}

function canonicalize(candidate: string): string {
  try {
    return FileSystemUtils.canonicalizeExistingPath(candidate);
  } catch {
    return candidate;
  }
}
