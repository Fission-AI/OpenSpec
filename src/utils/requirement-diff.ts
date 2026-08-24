import { structuredPatch } from 'diff';
import {
  extractRequirementsSection,
  foldRequirementName,
  normalizeRequirementName,
} from '../core/parsers/requirement-blocks.js';

/** A main-spec requirement block, and how its header matched the delta's. */
export interface MatchedRequirementBlock {
  raw: string;
  /** The header name as the main spec spells it. */
  name: string;
  /**
   * False when the two headers differ only in case or interior spacing. Archive
   * matches names exactly, so an inexact match is a real problem to report even
   * though the diff below it is still the one the author meant.
   */
  exact: boolean;
}

/**
 * Find the raw markdown block for a requirement by name in a spec file.
 *
 * Delegates to extractRequirementsSection() which already handles code fences,
 * section boundaries, and requirement header parsing. We just look up by name:
 * exactly first, then falling back to the shared case/whitespace fold so a
 * header that differs only in spelling still shows its diff, flagged inexact.
 *
 * Returns null if no requirement header matches either way.
 */
export function extractRequirementBlock(
  specContent: string,
  requirementName: string
): MatchedRequirementBlock | null {
  const parts = extractRequirementsSection(specContent);
  const targetName = normalizeRequirementName(requirementName);
  const foldedTarget = foldRequirementName(targetName);
  let folded: MatchedRequirementBlock | null = null;

  for (const block of parts.bodyBlocks) {
    const name = normalizeRequirementName(block.name);
    if (name === targetName) {
      return { raw: block.raw, name, exact: true };
    }
    if (!folded && foldRequirementName(name) === foldedTarget) {
      folded = { raw: block.raw, name, exact: false };
    }
  }

  return folded;
}

/**
 * Compute a unified diff between a main-spec requirement block and the delta
 * block that replaces it. A null main block (new capability) diffs against the
 * empty string, so every line reads as an addition.
 *
 * Uses structuredPatch to get only the hunk content lines (context/add/remove)
 * without any header matter, since the caller provides its own labeling.
 */
export function diffRequirementBlock(baseBlock: string | null, deltaBlock: string, label: string): string {
  const base = ensureTrailingNewline(baseBlock ?? '');
  const delta = ensureTrailingNewline(deltaBlock);
  const patch = structuredPatch(label, label, base, delta);

  return patch.hunks.flatMap(h => h.lines).join('\n').trimEnd();
}

function ensureTrailingNewline(s: string): string {
  return s.endsWith('\n') ? s : s + '\n';
}

/**
 * Build a map from folded RENAMED TO name to the original main-spec name.
 * Renames apply in source order, so a chain such as A -> B -> C maps C back to
 * A. That is the block a later MODIFIED C replaces.
 */
export function buildRenameMap(renames: Array<{ from: string; to: string }>): Map<string, string> {
  const map = new Map<string, string>();
  for (const r of renames) {
    const from = foldRequirementName(r.from);
    const original = map.get(from) ?? normalizeRequirementName(r.from);
    map.delete(from);
    map.set(foldRequirementName(r.to), original);
  }
  return map;
}
