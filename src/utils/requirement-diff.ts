import { structuredPatch } from 'diff';
import {
  extractRequirementsSection,
  normalizeRequirementName,
} from '../core/parsers/requirement-blocks.js';

/**
 * Extract the raw markdown block for a requirement by name from a spec file.
 *
 * Delegates to extractRequirementsSection() which already handles code fences,
 * section boundaries, and requirement header parsing. We just look up by name.
 *
 * Returns null if no matching requirement header is found.
 */
export function extractRequirementBlock(specContent: string, requirementName: string): string | null {
  const parts = extractRequirementsSection(specContent);
  const targetName = normalizeRequirementName(requirementName).toLowerCase();

  for (const block of parts.bodyBlocks) {
    if (normalizeRequirementName(block.name).toLowerCase() === targetName) {
      return block.raw;
    }
  }

  return null;
}

/**
 * Compute a unified diff between a base requirement block and a delta requirement block.
 * When baseBlock is null, diffs against empty string (all additions).
 *
 * Uses structuredPatch to get only the hunk content lines (context/add/remove)
 * without any header matter, since the caller provides its own labeling.
 */
export function diffRequirementBlock(baseBlock: string | null, deltaBlock: string, label: string): string {
  const base = ensureTrailingNewline(baseBlock ?? '');
  const delta = ensureTrailingNewline(deltaBlock);
  const patch = structuredPatch(label, label, base, delta);

  return patch.hunks.flatMap(h => h.lines).join('\n').trim();
}

function ensureTrailingNewline(s: string): string {
  return s.endsWith('\n') ? s : s + '\n';
}

/**
 * Build a map from normalized RENAMED TO name -> normalized RENAMED FROM name.
 * Used to look up the base block under the old name when a requirement is both
 * renamed and modified.
 */
export function buildRenameMap(renames: Array<{ from: string; to: string }>): Map<string, string> {
  const map = new Map<string, string>();
  for (const r of renames) {
    map.set(normalizeRequirementName(r.to).toLowerCase(), normalizeRequirementName(r.from));
  }
  return map;
}
