import path from 'path';
import { promises as fs } from 'fs';
import { discoverSpecFiles } from '../utils/spec-discovery.js';
import { compareCodePoints } from '../utils/compare.js';
import {
  parseDeltaSpec,
  normalizeRequirementName,
  extractRequirementsSection,
} from './parsers/requirement-blocks.js';

/**
 * Cross-change overlap detection.
 *
 * The validator already refuses a MODIFIED block that would drop scenarios the
 * live spec still has, and archive refuses the same write. Both compare one
 * change against the *current* main spec, so neither can see two open changes
 * converging on the same requirement: each is individually consistent with a
 * spec that neither has landed in yet. The collision only becomes visible when
 * the first one archives and the second starts failing, by which point the
 * second author has already implemented against a base that moved.
 *
 * This module reports that overlap up front. It is deliberately read-only and
 * advisory: two changes touching one requirement is often intentional
 * (sequenced work, a stacked pair), so the finding is information for the
 * author, not a verdict on the change.
 *
 * It reports what each change claims and whether the requirement exists today,
 * and stops there. Ranking overlaps by how badly they collide would mean
 * predicting whether a given archive order aborts, and the preconditions that
 * decide that live in specs-apply.ts alongside several cases it deliberately
 * treats as already-synced rather than as collisions. A second model of those
 * rules here would be free to disagree with the code that does the writing,
 * and a wrong severity is worse than none: it would tell an author to rewrite
 * a change that archives cleanly. That needs one applicability check archive
 * and validate both call, not a copy of one.
 */

/** How a change claims a requirement. */
export type OverlapOperation =
  | 'ADDED'
  | 'MODIFIED'
  | 'REMOVED'
  | 'RENAMED_FROM'
  | 'RENAMED_TO';

/** A single (change, spec, requirement) claim parsed out of one delta file. */
export interface RequirementClaim {
  changeId: string;
  /** Spec id relative to the change's specs/ root, e.g. "tools". */
  specId: string;
  /** Requirement name as written in the delta, for display. */
  requirement: string;
  /** Normalized name used for matching; agrees with validator and archive. */
  key: string;
  operation: OverlapOperation;
}

export interface OverlapClaimant {
  changeId: string;
  operation: OverlapOperation;
  /** The spelling this change used, which may differ in surrounding whitespace. */
  requirement: string;
}

/** One requirement claimed by two or more active changes. */
export interface RequirementOverlap {
  specId: string;
  /** Display name, taken from the first claimant in id order. */
  requirement: string;
  /**
   * Whether the main spec holds this requirement today. A requirement no
   * change has landed yet reads differently from one they are all editing:
   * those changes are not converging on shared text, they are each proposing
   * it, and only one of them can be the one that introduces it.
   */
  inMainSpec: boolean;
  claimants: OverlapClaimant[];
}

/** Where to look for delta specs, and which changes to look at. */
export interface OverlapScanInput {
  /**
   * Resolved changes directory - `root.changesDir`, never a path rebuilt from
   * the project root. A store-selected root does not live under
   * `<root>/openspec/changes`, so rebuilding the path here would silently scan
   * the wrong tree (or nothing) for every `--store` invocation.
   */
  changesDir: string;
  /** Resolved main specs directory - `root.specsDir`, for the same reason. */
  specsDir: string;
  /**
   * Active change ids to scan. Supplied by the caller so this module never has
   * to re-derive what "active" means; callers already exclude `archive/`.
   */
  changeIds: readonly string[];
}

/**
 * Parse one delta spec file into the claims it makes.
 *
 * RENAMED contributes two claims. The FROM side collides with anyone editing
 * the requirement under its old name, and the TO side collides with an ADDED
 * of that name in another change - archive applies RENAMED before MODIFIED, so
 * both ends are real contention points, not bookkeeping.
 */
export function claimsFromDelta(
  content: string,
  changeId: string,
  specId: string
): RequirementClaim[] {
  const plan = parseDeltaSpec(content);
  const claims: RequirementClaim[] = [];

  const push = (name: string, operation: OverlapOperation): void => {
    const key = normalizeRequirementName(name);
    // A delta that names the same requirement twice in one section is already
    // a validator error ("Duplicate requirement in ..."); dropping the repeat
    // here keeps one change from being reported as overlapping with itself.
    if (claims.some((claim) => claim.key === key && claim.operation === operation)) {
      return;
    }
    claims.push({ changeId, specId, requirement: name, key, operation });
  };

  for (const block of plan.added) push(block.name, 'ADDED');
  for (const block of plan.modified) push(block.name, 'MODIFIED');
  for (const name of plan.removed) push(name, 'REMOVED');
  for (const { from, to } of plan.renamed) {
    push(from, 'RENAMED_FROM');
    push(to, 'RENAMED_TO');
  }

  return claims;
}

/**
 * Collect every requirement claim made by the given active changes.
 *
 * Delta files are enumerated with the same discoverSpecFiles() walk archive and
 * specs-apply use, so this sees exactly the files that will be applied - a
 * nested capability layout is included, and nothing is matched that archive
 * would ignore. A change with no specs/ directory contributes nothing.
 */
export async function collectRequirementClaims(
  input: OverlapScanInput
): Promise<RequirementClaim[]> {
  const claims: RequirementClaim[] = [];

  for (const changeId of input.changeIds) {
    const changeSpecsDir = path.join(input.changesDir, changeId, 'specs');
    let discovered;
    try {
      discovered = await discoverSpecFiles(changeSpecsDir);
    } catch {
      // discoverSpecFiles throws on an unreadable capability so archive can
      // refuse to silently drop it. Overlap reporting is advisory and must
      // never be the thing that fails a run, so an unreadable change is
      // skipped: the validator and archive still report it on their own paths.
      continue;
    }

    for (const { id: specId, specFile } of discovered) {
      let content: string;
      try {
        content = await fs.readFile(specFile, 'utf-8');
      } catch {
        continue;
      }
      claims.push(...claimsFromDelta(content, changeId, specId));
    }
  }

  return claims;
}

/**
 * Requirement names the main specs currently hold, keyed by spec id. A spec
 * absent from this map - including one whose file does not exist yet - holds
 * nothing, which is how archive sees it too.
 */
export type BaseRequirements = ReadonlyMap<string, ReadonlySet<string>>;

/**
 * Read the requirement names each of the given specs currently holds.
 *
 * A spec that does not exist yet, or cannot be read, contributes an empty set
 * rather than an error: overlap reporting is advisory, and the per-change
 * validation running alongside it reports an unreadable spec on its own path.
 */
export async function loadBaseRequirements(
  specsDir: string,
  specIds: Iterable<string>
): Promise<BaseRequirements> {
  const base = new Map<string, ReadonlySet<string>>();

  for (const specId of new Set(specIds)) {
    let content: string;
    try {
      content = await fs.readFile(path.join(specsDir, ...specId.split('/'), 'spec.md'), 'utf-8');
    } catch {
      base.set(specId, new Set());
      continue;
    }
    const { bodyBlocks } = extractRequirementsSection(content);
    base.set(specId, new Set(bodyBlocks.map((block) => normalizeRequirementName(block.name))));
  }

  return base;
}

/**
 * Group claims into overlaps: one entry per (spec, requirement) claimed by more
 * than one change. Results are sorted by spec then requirement, and claimants
 * by change id, so output is stable enough to diff in CI. Ordering is by code
 * point rather than locale for the same reason discoverSpecFiles() is: spec
 * ids and requirement names are free-form text, and a locale-sensitive sort
 * would reorder non-ASCII names between one machine and the next.
 */
export function findOverlaps(
  claims: readonly RequirementClaim[],
  base: BaseRequirements
): RequirementOverlap[] {
  const grouped = new Map<string, RequirementClaim[]>();
  for (const claim of claims) {
    // Encoded rather than concatenated: a spec id and a requirement name can
    // both contain spaces, so a plain join lets two different pairs collide.
    const groupKey = JSON.stringify([claim.specId, claim.key]);
    const existing = grouped.get(groupKey);
    if (existing) existing.push(claim);
    else grouped.set(groupKey, [claim]);
  }

  const overlaps: RequirementOverlap[] = [];
  for (const group of grouped.values()) {
    const changeIds = new Set(group.map((claim) => claim.changeId));
    // Two claims from one change (e.g. a RENAMED pair) are not a collision.
    if (changeIds.size < 2) continue;

    const sorted = [...group].sort(
      (a, b) =>
        compareCodePoints(a.changeId, b.changeId) || compareCodePoints(a.operation, b.operation)
    );
    overlaps.push({
      specId: group[0].specId,
      requirement: sorted[0].requirement,
      inMainSpec: base.get(group[0].specId)?.has(group[0].key) ?? false,
      claimants: sorted.map(({ changeId, operation, requirement }) => ({
        changeId,
        operation,
        requirement,
      })),
    });
  }

  return overlaps.sort(
    (a, b) => compareCodePoints(a.specId, b.specId) || compareCodePoints(a.requirement, b.requirement)
  );
}

/**
 * Convenience wrapper: collect claims across active changes, read the main
 * specs those claims land in, and group them. Only specs some change actually
 * claims are read.
 */
export async function detectChangeOverlaps(
  input: OverlapScanInput
): Promise<RequirementOverlap[]> {
  const claims = await collectRequirementClaims(input);
  const base = await loadBaseRequirements(
    input.specsDir,
    claims.map((claim) => claim.specId)
  );
  return findOverlaps(claims, base);
}
