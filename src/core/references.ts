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
import * as os from 'node:os';
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
import { MAX_CONTEXT_SIZE, type DeclarationEntry } from './project-config.js';

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
 * Shares the project-context cap: the rendered index is prompt material.
 * Measured in UTF-8 bytes against the XML rendering (the larger of the
 * two), entries and diagnostics included; only the truncation warning
 * itself is exempt (no oscillation).
 */
const MAX_RENDERED_INDEX_SIZE = MAX_CONTEXT_SIZE;

function warning(code: string, message: string, fix: string): StoreDiagnostic {
  return makeStoreDiagnostic('warning', code, message, { target: 'references', fix });
}

/**
 * A remote is rendered into the pasteable clone command only when it is
 * shell-inert: no whitespace, quotes, or metacharacters, and not
 * flag-like (a config-supplied `--upload-pack=...` must never reach a
 * command agents execute verbatim). Anything else falls back to the
 * teammate-checkout wording.
 */
function isShellSafeRemote(remote: string): boolean {
  return /^[A-Za-z0-9@:/._~+-]+$/.test(remote) && !remote.startsWith('-');
}

function registerFix(id: string, remote?: string): string {
  if (remote && isShellSafeRemote(remote)) {
    // Verbatim-pasteable: absolute home path because tilde never
    // expands outside a shell and agent JSON consumers execute argv.
    // The checkout is quoted (homedirs may contain spaces); the remote
    // is unquoted but gated by isShellSafeRemote above.
    const checkout = path.join(os.homedir(), 'openspec', id);
    // The fix renders on the machine that will paste it: POSIX shells
    // get single quotes; cmd/PowerShell treat single quotes as literal
    // characters, so win32 gets double quotes (valid everywhere).
    const quoted = process.platform === 'win32' ? `"${checkout}"` : `'${checkout}'`;
    return `git clone -- ${remote} ${quoted} && openspec store register ${quoted} --id ${id}`;
  }
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
  const lines = markdown.split(/\r?\n/);
  let inPurpose = false;
  let fenceMarker: string | null = null;

  for (const line of lines) {
    // CommonMark: a fence closes only with its own marker kind.
    const fence = line.match(/^\s*(```|~~~)/);
    if (fence) {
      if (fenceMarker === null) {
        fenceMarker = fence[1];
      } else if (fence[1] === fenceMarker) {
        fenceMarker = null;
      }
      continue;
    }
    if (fenceMarker !== null) {
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
        summary = sanitizeInline(extractFirstPurposeLine(content));
      } catch {
        // Unreadable spec file: index the id with an empty summary.
      }
      return { id: specId, summary };
    })
  );
}

export function fetchRecipe(storeId: string): string {
  return `openspec show <spec-id> --type spec --store ${storeId}`;
}

function specLine(spec: ReferenceSpecEntry): string {
  // Ids are raw directory names from cloned content; summaries are
  // sanitized at index time (collectSpecEntries).
  const id = sanitizeInline(spec.id, 100);
  return spec.summary ? `  - ${id}: ${spec.summary}` : `  - ${id}`;
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

/**
 * Strings rendered into agent guidance can come from cloned content
 * (spec directory names, Purpose lines, config-declared remotes). One
 * line in, one line out: control characters and newlines must never
 * let hostile content forge instruction lines (slice 6.1 hardening).
 */
export function sanitizeInline(value: string, maxLength = 300): string {
  // eslint-disable-next-line no-control-regex
  const flattened = value.replace(/[\u0000-\u001f\u007f]+/g, ' ').trim();
  return flattened.length > maxLength ? `${flattened.slice(0, maxLength)}…` : flattened;
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
  references: DeclarationEntry[];
  resolvedRoot: ResolvedOpenSpecRoot;
  globalDataDir?: string;
  /**
   * Health mode (3.6): false skips the spec-file reads AND the byte
   * budget — entries carry no `specs`/`fetch` keys at all, and the
   * content-only truncation diagnostic can never appear.
   */
  includeSpecs?: boolean;
  /**
   * Pre-read registry entries (3.6): `[]` = registry empty or absent,
   * `null` = unreadable, undefined = read internally as before.
   * (Mirrors the internal post-read variable — never inject a raw
   * read result: a healthy-absent registry reads as null.)
   */
  registryEntries?: ReturnType<typeof listStoreRegistryEntries> | null;
}

/**
 * Builds the referenced-store index. One registry read per call; one
 * level deep (a referenced store's own references are never followed);
 * self-references omitted; every failure degrades to a warning entry.
 */
export async function assembleReferenceIndex(
  input: AssembleReferenceIndexInput
): Promise<ReferenceIndexEntry[]> {
  const declarations = input.references;
  if (declarations.length === 0) {
    return [];
  }

  // null means the registry itself was unreadable (corrupt file).
  let registryEntries: ReturnType<typeof listStoreRegistryEntries> | null;
  if (input.registryEntries !== undefined) {
    registryEntries = input.registryEntries;
  } else {
    try {
      const registry = await readStoreRegistryState(
        input.globalDataDir ? { globalDataDir: input.globalDataDir } : {}
      );
      registryEntries = registry ? listStoreRegistryEntries(registry) : [];
    } catch {
      registryEntries = null;
    }
  }
  const includeSpecs = input.includeSpecs !== false;

  const resolvedRootPath = FileSystemUtils.canonicalizeExistingPath(input.resolvedRoot.path);
  const entries: ReferenceIndexEntry[] = [];

  for (const { id, remote } of declarations) {
    // Registry-independent checks come first: an invalid id is an
    // invalid id (and a self-reference is omittable) even when the
    // registry is corrupt. The declared remote is only consulted after
    // the id passes grammar.
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

    if (registryEntries === null) {
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

    const registryEntry = registryEntries.find((candidate) => candidate.id === id);
    if (!registryEntry) {
      entries.push({
        store_id: id,
        status: [
          warning(
            'reference_unresolved',
            `Referenced store '${id}' is not registered on this machine.`,
            registerFix(id, remote)
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

    if (!includeSpecs) {
      // Health mode: resolution facts only — no content, no budget.
      entries.push({ store_id: id, root: inspection.canonicalRoot, status: [] });
      continue;
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
