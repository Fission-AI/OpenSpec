/**
 * Deterministic extraction of the capabilities a change declares in its
 * proposal's `## Capabilities` section.
 *
 * This is a pure function of the proposal text — no filesystem access — and is
 * the single place capability declarations are read. A future structured
 * source (e.g. `provides` markers from change-stacking metadata) can augment or
 * replace this without changing the coverage rule that consumes it.
 *
 * Contract:
 *  - Scope to the top-level `## Capabilities` section (bounded by the next `## `).
 *  - Within it, the New/Modified Capabilities subsections — in either heading
 *    form (`### New Capabilities`) or bold-label form (`**New Capabilities**:`).
 *  - A capability id is the first inline-code span (`` `id` ``) of a list item.
 *  - Kebab-case ids (`^[a-z0-9]+(?:-[a-z0-9]+)*$`) are declared capabilities;
 *    a non-kebab inline-code id is reported as `malformed` (not silently dropped).
 *  - `None` / `_None_` / HTML-comment / empty subsections declare nothing.
 *  - Removed Capabilities are not required to have a delta and are ignored here.
 */

const KEBAB = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export interface DeclaredCapabilities {
  /** Whether a `## Capabilities` section is present at all. */
  hasSection: boolean;
  /** Declared, well-formed (kebab-case) capability ids, deduped and sorted. */
  capabilities: string[];
  /** Inline-code ids found under a capability subsection that are not kebab-case. */
  malformed: string[];
}

type Subsection = 'new' | 'modified' | 'removed' | 'other' | null;

function buildFenceMask(lines: string[]): boolean[] {
  const mask = new Array(lines.length).fill(false);
  let active: { marker: string; length: number } | null = null;
  for (let i = 0; i < lines.length; i++) {
    const open = lines[i].match(/^\s*(`{3,}|~{3,})/);
    if (!active) {
      if (open) {
        active = { marker: open[1][0], length: open[1].length };
        mask[i] = true;
      }
      continue;
    }
    mask[i] = true;
    const close = lines[i].match(/^\s*(`{3,}|~{3,})\s*$/);
    if (close && close[1][0] === active.marker && close[1].length >= active.length) {
      active = null;
    }
  }
  return mask;
}

function classifyCapabilityLabel(text: string): Subsection {
  // Accepts `### New Capabilities`, `**New Capabilities**:`, `- **Modified Capabilities**`
  const m = text.match(/(?:^|\b)(New|Modified|Removed)\s+Capabilities\b/i);
  if (!m) return null;
  const kind = m[1].toLowerCase();
  return kind === 'new' ? 'new' : kind === 'modified' ? 'modified' : 'removed';
}

export function extractDeclaredCapabilities(proposalMarkdown: string): DeclaredCapabilities {
  const lines = proposalMarkdown.replace(/\r\n?/g, '\n').split('\n');
  const fence = buildFenceMask(lines);

  // Locate the `## Capabilities` section bounds (until the next `## ` header).
  let start = -1;
  for (let i = 0; i < lines.length; i++) {
    if (fence[i]) continue;
    if (/^##\s+Capabilities\s*$/i.test(lines[i])) {
      start = i;
      break;
    }
  }
  if (start === -1) {
    return { hasSection: false, capabilities: [], malformed: [] };
  }
  let end = lines.length;
  for (let i = start + 1; i < lines.length; i++) {
    if (fence[i]) continue;
    if (/^##\s+(?!#)/.test(lines[i])) {
      end = i;
      break;
    }
  }

  const capabilities = new Set<string>();
  const malformed = new Set<string>();
  let sub: Subsection = null;

  for (let i = start + 1; i < end; i++) {
    if (fence[i]) continue;
    const line = lines[i];

    // Subsection boundary via `###` heading.
    const heading = line.match(/^###\s+(.+)$/);
    if (heading) {
      sub = classifyCapabilityLabel(heading[1]);
      continue;
    }

    const bulletMatch = line.match(/^\s*[-*]\s+(.*)$/);
    if (!bulletMatch) continue;
    const rest = bulletMatch[1];

    // Subsection boundary via bold-label bullet (`- **New Capabilities**: ...`).
    if (/^\*\*\s*(New|Modified|Removed)\s+Capabilities\s*\*\*/i.test(rest)) {
      sub = classifyCapabilityLabel(rest);
      continue;
    }

    if (sub !== 'new' && sub !== 'modified') continue;

    // `None` / `_None_` markers declare nothing.
    if (/^_?None_?\.?$/i.test(rest.trim())) continue;

    const code = rest.match(/`([^`]+)`/);
    if (!code) continue;
    const id = code[1].trim();
    if (KEBAB.test(id)) {
      capabilities.add(id);
    } else {
      malformed.add(id);
    }
  }

  return {
    hasSection: true,
    capabilities: [...capabilities].sort(),
    malformed: [...malformed].sort(),
  };
}
