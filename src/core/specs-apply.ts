/**
 * Spec Application Logic
 *
 * Extracted from ArchiveCommand to enable standalone spec application.
 * Applies delta specs from a change to main specs without archiving.
 */

import { promises as fs } from 'fs';
import { randomUUID } from 'crypto';
import path from 'path';
import chalk from 'chalk';
import {
  extractRequirementsSection,
  findMissingCurrentScenarios,
  foldRequirementName,
  parseDeltaSpec,
  normalizeRequirementName,
  type RequirementBlock,
  type RequirementsSectionParts,
} from './parsers/requirement-blocks.js';
import { findMainSpecStructureIssues } from './parsers/spec-structure.js';
import { buildCodeFenceMask } from './parsers/code-fence.js';
import { MarkdownParser } from './parsers/markdown-parser.js';
import { MIN_PURPOSE_LENGTH } from './validation/constants.js';
import { discoverSpecFiles } from '../utils/spec-discovery.js';
import { FileSystemUtils } from '../utils/file-system.js';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export interface SpecUpdate {
  /** Capability id relative to the specs root, forward-slash separated (e.g. "web" or "platform/session-layout"). */
  id: string;
  /** Allowed root for the delta source. */
  sourceRoot: string;
  source: string;
  /** Allowed root for the main-spec target. */
  targetRoot: string;
  target: string;
  exists: boolean;
}

function isLexicallyWithin(allowedDirectory: string, targetPath: string): boolean {
  const relative = path.relative(path.resolve(allowedDirectory), path.resolve(targetPath));
  return (
    relative === '' ||
    (relative !== '..' &&
      !relative.startsWith(`..${path.sep}`) &&
      !path.isAbsolute(relative))
  );
}

function resolveTrustedSpecPath(specsRoot: string, specPath: string): {
  root: string;
  file: string;
} {
  if (!isLexicallyWithin(specsRoot, specPath)) {
    throw new Error(`Path is outside the allowed directory: ${specPath}`);
  }

  try {
    // Preserve spec.md links that remain inside the overall specs tree.
    FileSystemUtils.assertPathWithin(specsRoot, specPath);
    const root = FileSystemUtils.canonicalizeExistingPath(specsRoot);
    return {
      root,
      // Rebase onto the canonical root so missing targets also work when the
      // project is reached through an OS path alias (for example /var on macOS).
      file: path.join(root, path.relative(path.resolve(specsRoot), path.resolve(specPath))),
    };
  } catch {
    // Direct capability directories may intentionally be monorepo symlinks.
    // Freeze their canonical location as the trust root so later swaps are
    // rejected while a nested spec.md link still cannot escape.
    const root = FileSystemUtils.canonicalizeExistingPath(path.dirname(specPath));
    const file = path.join(root, path.basename(specPath));
    FileSystemUtils.assertPathWithin(root, file);
    return { root, file };
  }
}

function assertTrustedSpecPath(root: string, specPath: string): void {
  if (FileSystemUtils.canonicalizeExistingPath(root) !== path.resolve(root)) {
    throw new Error(`Path is outside the allowed directory: ${specPath}`);
  }
  FileSystemUtils.assertPathWithin(root, specPath);
}

// -----------------------------------------------------------------------------
// Public API
// -----------------------------------------------------------------------------

/**
 * Find all delta spec files that need to be applied from a change.
 */
export async function findSpecUpdates(changeDir: string, mainSpecsDir: string): Promise<SpecUpdate[]> {
  const updates: SpecUpdate[] = [];
  const changeSpecsDir = path.join(changeDir, 'specs');

  // Discover delta specs recursively so nested layouts like
  // specs/<area>/<capability>/spec.md merge into the same relative path
  // under the main specs directory (#1353)
  const discovered = await discoverSpecFiles(changeSpecsDir);

  for (const { id, specFile } of discovered) {
    const targetFile = path.join(mainSpecsDir, ...id.split('/'), 'spec.md');
    const source = resolveTrustedSpecPath(changeSpecsDir, specFile);
    const target = resolveTrustedSpecPath(mainSpecsDir, targetFile);

    // Check if target exists
    let exists = false;
    try {
      await fs.access(target.file);
      exists = true;
    } catch {
      exists = false;
    }

    updates.push({
      id,
      sourceRoot: source.root,
      source: source.file,
      targetRoot: target.root,
      target: target.file,
      exists,
    });
  }

  return updates;
}

/**
 * Build an updated spec by applying delta operations.
 * Returns the rebuilt content and counts of operations.
 */
export async function buildUpdatedSpec(
  update: SpecUpdate,
  changeName: string,
  options: { silent?: boolean } = {}
): Promise<{
  rebuilt: string;
  counts: { added: number; modified: number; removed: number; renamed: number };
  warnings: string[];
  /**
   * Every canonical `### Requirement:` block the delta could act on is gone.
   * This is only a *candidate* signal for retirement (#1302): the validator, not
   * this count, decides whether `rebuilt` is actually unwritable - it recognises
   * requirement shapes this parser sweeps into the preamble, so a spec can be
   * blockless here and still validate. See `isRetirableSpec` in archive.ts.
   */
  noRequirementBlocks: boolean;
  /**
   * Every non-blank line of the spec this merge cannot name.
   *
   * Retirement deletes the whole file, so the only safe question is whether the
   * merge can account for all of it. `extractRequirementsSection` splits a spec
   * into five slices, and auditing a subset is how this guard kept failing: for
   * seven rounds it looked for requirement-SHAPED text and was beaten by a new
   * disguise each time, and when it started asking where content landed it
   * still read only the preamble and the tail - so content simply moved into a
   * slice nobody checked, and authored prose sitting inside a removed block's
   * raw was deleted while the report said only "Purpose" was lost.
   *
   * So this accounts for the whole file: the title, the `## Purpose` section,
   * the `## Requirements` header, and, inside each requirement block, the parts
   * that make up a requirement - its header, its statement, and its scenarios'
   * bullets. Every other non-blank line is reported and refuses the retirement.
   *
   * Fails safe in every direction: a line this cannot classify counts as
   * unaccounted, which refuses rather than deletes.
   */
  unaccountedContent: string[];
  /**
   * Authored `## ` sections other than Purpose and Requirements. Retirement
   * deletes the whole file, so callers name these rather than discarding
   * hand-written prose silently.
   */
}> {
  // Collected so silent (JSON) callers can surface them; printed live for
  // human callers at the point they occur.
  const warnings: string[] = [];
  const warn = (message: string): void => {
    warnings.push(message);
    if (!options.silent) {
      console.log(chalk.yellow(`⚠️  Warning: ${message}`));
    }
  };
  // Read change spec content (delta-format expected)
  assertTrustedSpecPath(update.sourceRoot, update.source);
  const changeContent = await fs.readFile(update.source, 'utf-8');

  // Parse deltas from the change spec file
  const plan = parseDeltaSpec(changeContent);
  const specName = update.id;

  // Pre-validate duplicates within sections
  const addedNames = new Set<string>();
  for (const add of plan.added) {
    const name = normalizeRequirementName(add.name);
    if (addedNames.has(name)) {
      throw new Error(
        `${specName} validation failed - duplicate requirement in ADDED for header "### Requirement: ${add.name}"`
      );
    }
    addedNames.add(name);
  }
  const modifiedNames = new Set<string>();
  for (const mod of plan.modified) {
    const name = normalizeRequirementName(mod.name);
    if (modifiedNames.has(name)) {
      throw new Error(
        `${specName} validation failed - duplicate requirement in MODIFIED for header "### Requirement: ${mod.name}"`
      );
    }
    modifiedNames.add(name);
  }
  const removedNamesSet = new Set<string>();
  for (const rem of plan.removed) {
    const name = normalizeRequirementName(rem);
    if (removedNamesSet.has(name)) {
      throw new Error(
        `${specName} validation failed - duplicate requirement in REMOVED for header "### Requirement: ${rem}"`
      );
    }
    removedNamesSet.add(name);
  }
  const renamedFromSet = new Set<string>();
  const renamedToSet = new Set<string>();
  for (const { from, to } of plan.renamed) {
    const fromNorm = normalizeRequirementName(from);
    const toNorm = normalizeRequirementName(to);
    if (renamedFromSet.has(fromNorm)) {
      throw new Error(
        `${specName} validation failed - duplicate FROM in RENAMED for header "### Requirement: ${from}"`
      );
    }
    if (renamedToSet.has(toNorm)) {
      throw new Error(
        `${specName} validation failed - duplicate TO in RENAMED for header "### Requirement: ${to}"`
      );
    }
    renamedFromSet.add(fromNorm);
    renamedToSet.add(toNorm);
  }

  // Pre-validate cross-section conflicts
  const conflicts: Array<{ name: string; a: string; b: string }> = [];
  for (const n of modifiedNames) {
    if (removedNamesSet.has(n)) conflicts.push({ name: n, a: 'MODIFIED', b: 'REMOVED' });
    if (addedNames.has(n)) conflicts.push({ name: n, a: 'MODIFIED', b: 'ADDED' });
  }
  for (const n of addedNames) {
    if (removedNamesSet.has(n)) conflicts.push({ name: n, a: 'ADDED', b: 'REMOVED' });
  }
  // Renamed interplay: MODIFIED must reference the NEW header, not FROM
  for (const { from, to } of plan.renamed) {
    const fromNorm = normalizeRequirementName(from);
    const toNorm = normalizeRequirementName(to);
    // A REMOVED naming the FROM side contradicts the rename. This used to
    // fail incidentally at apply time (the rename consumed the old header,
    // so REMOVED hit "not found"); now that a missing REMOVED target is a
    // no-op, the conflict must be rejected explicitly. Compared folded, so
    // a case/whitespace variant cannot slip past the guard and degrade
    // into a warned no-op.
    const removedFoldMatch = [...removedNamesSet].find(
      (r) => foldRequirementName(r) === foldRequirementName(fromNorm)
    );
    if (removedFoldMatch !== undefined) {
      throw new Error(
        `${specName} validation failed - requirement present in multiple sections (RENAMED and REMOVED) for header "### Requirement: ${from}"` +
          (removedFoldMatch === fromNorm ? '' : ` (REMOVED spells it "${removedFoldMatch}")`)
      );
    }
    if (modifiedNames.has(fromNorm)) {
      throw new Error(
        `${specName} validation failed - when a rename exists, MODIFIED must reference the NEW header "### Requirement: ${to}"`
      );
    }
    // Detect ADDED colliding with a RENAMED TO
    if (addedNames.has(toNorm)) {
      throw new Error(
        `${specName} validation failed - RENAMED TO header collides with ADDED for "### Requirement: ${to}"`
      );
    }
  }
  if (conflicts.length > 0) {
    const c = conflicts[0];
    throw new Error(
      `${specName} validation failed - requirement present in multiple sections (${c.a} and ${c.b}) for header "### Requirement: ${c.name}"`
    );
  }
  const hasAnyDelta = plan.added.length + plan.modified.length + plan.removed.length + plan.renamed.length > 0;
  if (!hasAnyDelta) {
    throw new Error(
      `Delta parsing found no operations for ${update.id}. ` +
        `Provide ADDED/MODIFIED/REMOVED/RENAMED sections in change spec.`
    );
  }

  // Load or create base target content
  const deltaPurpose = extractPurposeSection(changeContent);
  let targetContent: string;
  let isNewSpec = false;
  assertTrustedSpecPath(update.targetRoot, update.target);
  try {
    targetContent = await fs.readFile(update.target, 'utf-8');
    // A delta Purpose only seeds a spec that does not exist yet. Say so rather
    // than dropping it silently - the specs instruction tells authors to write
    // one for new capabilities, and the delta file looks identical either way.
    // Only when the spec really does have a different Purpose: claiming it
    // "already has one" would be false when it has none, and saying anything at
    // all is noise when the two bodies match.
    if (deltaPurpose) {
      const existingPurpose = extractPurposeSection(targetContent);
      if (existingPurpose && existingPurpose !== deltaPurpose) {
        warn(
          `${specName} - delta Purpose ignored; ${specName} already has one. ` +
            `Edit ${update.target} directly to change it.`
        );
      }
    }
  } catch {
    // Target spec does not exist; MODIFIED and RENAMED are not allowed for new specs
    // REMOVED will be ignored with a warning since there's nothing to remove
    if (plan.modified.length > 0 || plan.renamed.length > 0) {
      throw new Error(
        `${specName}: target spec does not exist; only ADDED requirements are allowed for new specs. MODIFIED and RENAMED operations require an existing spec.`
      );
    }
    // Warn about REMOVED requirements being ignored for new specs
    if (plan.removed.length > 0) {
      warn(
        `${specName} - ${plan.removed.length} REMOVED requirement(s) ignored for new spec (nothing to remove).`
      );
    }
    isNewSpec = true;
    targetContent = buildSpecSkeleton(specName, changeName, deltaPurpose);
    const overview = deltaPurpose ? readableOverview(targetContent, specName) : null;
    if (deltaPurpose && !overview) {
      // Keep the placeholder rather than turning this into a failure: these
      // deltas archived cleanly before the Purpose carry-over existed.
      targetContent = buildSpecSkeleton(specName, changeName);
      warn(
        `${specName} - delta Purpose ignored (it would leave the new spec unreadable); wrote the placeholder Purpose instead.`
      );
    } else if (overview && overview.length < MIN_PURPOSE_LENGTH) {
      // The placeholder always cleared this threshold, so a carried Purpose is
      // the first way archive can leave a spec that `validate --strict` fails.
      // Measured on the parsed overview, which is what the validator reads.
      warn(
        `${specName} - carried Purpose is under ${MIN_PURPOSE_LENGTH} characters; ` +
          `openspec validate --strict reports it as too brief.`
      );
    }
  }

  const structureIssues = findMainSpecStructureIssues(targetContent);
  if (structureIssues.length > 0) {
    const details = structureIssues
      .map(issue => `line ${issue.line}: ${issue.message}`)
      .join('\n');
    throw new Error(
      `${specName}: target spec is structurally invalid and cannot be updated until fixed:\n${details}`
    );
  }

  // Extract requirements section and build name->block map
  const parts = extractRequirementsSection(targetContent);
  const nameToBlock = new Map<string, RequirementBlock>();
  for (const block of parts.bodyBlocks) {
    nameToBlock.set(normalizeRequirementName(block.name), block);
  }

  // Apply operations in order: RENAMED → REMOVED → MODIFIED → ADDED
  // RENAMED
  let renamedApplied = 0;
  const renamedTargets = new Map<string, string>();
  for (const r of plan.renamed) {
    const from = normalizeRequirementName(r.from);
    const to = normalizeRequirementName(r.to);
    if (!nameToBlock.has(from)) {
      // Source gone but target present means the rename was already synced
      // to the baseline (early-sync pattern) — re-applying it is a no-op,
      // not a failure. Only a missing source AND target is a genuine error.
      if (nameToBlock.has(to)) {
        // Unless a case/whitespace variant of the source still exists (and is
        // not the target itself, as in a case-only rename): that is a typo'd
        // header, not an early-synced rename — same guard REMOVED applies.
        const nearMiss = [...nameToBlock.keys()].find(
          (k) => k !== to && foldRequirementName(k) === foldRequirementName(from)
        );
        if (nearMiss !== undefined) {
          throw new Error(
            `${specName} RENAMED failed for header "### Requirement: ${r.from}" - source not found, but "### Requirement: ${nameToBlock.get(nearMiss)!.name}" exists; fix the header to match it exactly`
          );
        }
        continue;
      }
      throw new Error(`${specName} RENAMED failed for header "### Requirement: ${r.from}" - source not found`);
    }
    if (nameToBlock.has(to)) {
      throw new Error(`${specName} RENAMED failed for header "### Requirement: ${r.to}" - target already exists`);
    }
    const block = nameToBlock.get(from)!;
    const newHeader = `### Requirement: ${to}`;
    const rawLines = block.raw.split('\n');
    rawLines[0] = newHeader;
    const renamedBlock: RequirementBlock = {
      headerLine: newHeader,
      name: to,
      raw: rawLines.join('\n'),
    };
    nameToBlock.delete(from);
    nameToBlock.set(to, renamedBlock);
    renamedTargets.set(from, to);
    renamedApplied++;
  }

  // REMOVED
  let removedApplied = 0;
  for (const name of plan.removed) {
    const key = normalizeRequirementName(name);
    if (!nameToBlock.has(key)) {
      // Requirement gone from the baseline means the removal was already
      // synced (early-sync pattern) — re-applying it is a no-op, not a
      // failure. One signal does separate that from a mistyped header: a
      // requirement that differs only in case or interior whitespace still
      // being present. That is a typo, and stays a hard abort.
      // For new specs the skip was already warned about above.
      if (!isNewSpec) {
        const nearMiss = [...nameToBlock.keys()].find((k) => foldRequirementName(k) === foldRequirementName(key));
        if (nearMiss !== undefined) {
          throw new Error(
            `${specName} REMOVED failed for header "### Requirement: ${name}" - not found, but "### Requirement: ${nameToBlock.get(nearMiss)!.name}" exists; fix the header to match it exactly`
          );
        }
        warn(
          `${specName} - REMOVED requirement "${name}" is not in the current spec; treating it as already removed.`
        );
      }
      continue;
    }
    nameToBlock.delete(key);
    removedApplied++;
  }

  // MODIFIED
  let modifiedApplied = 0;
  for (const mod of plan.modified) {
    const key = normalizeRequirementName(mod.name);
    const currentBlock = nameToBlock.get(key);
    if (!currentBlock) {
      throw new Error(`${specName} MODIFIED failed for header "### Requirement: ${mod.name}" - not found`);
    }
    // Replace block with provided raw (ensure header line matches key)
    const modHeaderMatch = mod.raw.split('\n')[0].match(/^###\s*Requirement:\s*(.+)\s*$/i);
    if (!modHeaderMatch || normalizeRequirementName(modHeaderMatch[1]) !== key) {
      throw new Error(
        `${specName} MODIFIED failed for header "### Requirement: ${mod.name}" - header mismatch in content`
      );
    }
    const missingScenarios = findMissingCurrentScenarios(currentBlock, mod);
    if (missingScenarios.length > 0) {
      throw new Error(
        `${specName} MODIFIED failed for header "### Requirement: ${mod.name}" - current spec contains scenario(s) not present in the modified block: ${missingScenarios.map(name => `"${name}"`).join(', ')}. Refresh the change spec before archiving to avoid dropping scenarios.`
      );
    }
    // Identical content means the modification was already synced to the
    // baseline (early-sync pattern) — count only real replacements, so a
    // fully synced change still takes the "already in sync" write skip
    // instead of churning normalization differences into the file.
    if (normalizeBlockRaw(currentBlock.raw) !== normalizeBlockRaw(mod.raw)) {
      modifiedApplied++;
    }
    nameToBlock.set(key, mod);
  }

  // ADDED
  let addedApplied = 0;
  for (const add of plan.added) {
    const key = normalizeRequirementName(add.name);
    const existing = nameToBlock.get(key);
    if (existing) {
      // Identical content means the requirement was already synced to the
      // baseline (early-sync pattern) — re-applying it is a no-op, not a
      // conflict. Only differing content is a genuine collision.
      if (normalizeBlockRaw(existing.raw) === normalizeBlockRaw(add.raw)) {
        continue;
      }
      throw new Error(`${specName} ADDED failed for header "### Requirement: ${add.name}" - already exists`);
    }
    nameToBlock.set(key, add);
    addedApplied++;
  }

  // Duplicates within resulting map are implicitly prevented by key uniqueness.

  // Recompose requirements section preserving original ordering where possible
  const keptOrder: RequirementBlock[] = [];
  const seen = new Set<string>();
  for (const block of parts.bodyBlocks) {
    const key = normalizeRequirementName(block.name);
    const replacement = nameToBlock.get(key);
    if (replacement) {
      keptOrder.push(replacement);
      seen.add(key);
    }
    // A block's raw runs to the next header the parser RECOGNISES, so a note
    // under an unrecognized heading can be absorbed into the requirement.
    // Warn only when the replacement from this same original block drops the
    // full absorbed suffix. RENAMED carries the original raw content under a
    // new map key, and MODIFIED may repeat the suffix deliberately; neither is
    // data loss.
    const renamedTarget = renamedTargets.get(key);
    const replacementFromOriginal =
      replacement ?? (renamedTarget ? nameToBlock.get(renamedTarget) : undefined);
    if (replacementFromOriginal !== block) {
      const foreign = firstForeignTail(block.raw);
      const replacementRaw = replacementFromOriginal?.raw;
      const normalizedForeign = foreign ? normalizeBlockRaw(foreign.raw) : '';
      const keepsForeignTail =
        foreign !== undefined &&
        replacementRaw !== undefined &&
        countOccurrences(normalizeBlockRaw(replacementRaw), normalizedForeign) >=
          countOccurrences(normalizeBlockRaw(block.raw), normalizedForeign);
      if (foreign && !keepsForeignTail) {
        warn(
          `${specName} - "${foreign.heading}" sits inside requirement "${block.name}" and goes with it. ` +
            'Move it under its own requirement, or above `## Requirements`, to keep it.'
        );
      }
    }
  }
  // Append any newly added that were not in original order
  for (const [key, block] of nameToBlock.entries()) {
    if (!seen.has(key)) {
      keptOrder.push(block);
    }
  }

  const reqBody = [parts.preamble && parts.preamble.trim() ? parts.preamble.trimEnd() : '']
    .filter(Boolean)
    .concat(keptOrder.map((b) => b.raw))
    .join('\n\n')
    .trimEnd();

  const rebuilt = [parts.before.trimEnd(), parts.headerLine, reqBody, parts.after]
    .filter((s, idx) => !(idx === 0 && s === ''))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n');

  return {
    rebuilt,
    counts: {
      added: addedApplied,
      modified: modifiedApplied,
      removed: removedApplied,
      renamed: renamedApplied,
    },
    warnings,
    noRequirementBlocks: keptOrder.length === 0,
    // Read off the ORIGINAL requirements section, not the rebuilt one. Anything
    // after the last `### Requirement:` header belongs to that block's raw and
    // is discarded with it, so a rebuilt-body scan only ever sees headings above
    // the first requirement - it would veto `### Notes` written before the
    // requirements and miss the identical heading written after them.
    unaccountedContent: contentTheMergeCannotName(parts),
  };
}

/**
 * The suffix of a requirement block that begins with content the requirement
 * parser did not recognize as a boundary: a `#`, `##`, or `###` heading after
 * the block's own header.
 *
 * `####` is excluded: a requirement's `#### Scenario:` headings are its own.
 * Fenced lines are skipped, so a heading inside an example does not count.
 *
 * Approximate on purpose, and only ever used to WARN. A `#` line inside a
 * scenario looks the same as a note written below the requirement, and no
 * line-based rule separates them; a wrong warning costs a line of output, while
 * acting on a wrong answer would rewrite the spec.
 */
function firstForeignTail(raw: string): { heading: string; raw: string } | undefined {
  const lines = raw.replace(/\r\n?/g, '\n').split('\n');
  const fenceMask = buildCodeFenceMask(lines);
  for (let index = 1; index < lines.length; index++) {
    if (fenceMask[index]) continue;
    if (/^ {0,3}#{1,3}(?:[ \t]|$)/.test(lines[index])) {
      return {
        heading: lines[index].trim(),
        raw: lines.slice(index).join('\n').trimEnd(),
      };
    }
  }
  return undefined;
}

/**
 * The non-blank lines of a spec that are not part of what a retirement is able
 * to name: the title, the `## Purpose` section, the `## Requirements` header,
 * and each requirement block's own header, statement and scenario bullets.
 *
 * Deliberately whole-file. Auditing a subset of the slices is what let authored
 * prose inside a removed block, and content above the requirements section, be
 * deleted unmentioned.
 */
function contentTheMergeCannotName(parts: RequirementsSectionParts): string[] {
  const leftovers: string[] = [];

  // Above the requirements section: the title and the Purpose section are
  // expected; anything else is authored content the deletion would take.
  const beforeLines = parts.before.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n').split('\n');
  const beforeMask = buildCodeFenceMask(beforeLines);
  let inPurpose = false;
  let titleSeen = false;
  let previousLine = '';
  for (let index = 0; index < beforeLines.length; index++) {
    const line = beforeLines[index];
    if (!line.trim()) {
      previousLine = '';
      continue;
    }
    if (!beforeMask[index]) {
      const section = line.match(/^ {0,3}##\s+(.+?)\s*$/);
      if (section) {
        inPurpose = /^purpose$/i.test(section[1].trim());
        if (!inPurpose) leftovers.push(line.trim());
        previousLine = line;
        continue;
      }
      // `##` is not the only way to open a section. A setext underline turns
      // the line above it into a heading, and raw HTML says so outright - a
      // reader sees a sibling of `## Purpose`, not more of its body. Treating
      // everything up to the next ATX `##` as Purpose swallowed those whole and
      // deleted them, reported as nothing but "Purpose".
      const setext = inPurpose && previousLine.trim() && /^ {0,3}(=+|-+)\s*$/.test(line);
      const htmlHeading = /^ {0,3}<h[1-6]\b/i.test(line);
      if (setext || htmlHeading) {
        leftovers.push((setext ? previousLine : line).trim());
        inPurpose = false;
        previousLine = line;
        continue;
      }
      if (/^ {0,3}#\s+.+$/.test(line)) {
        if (!titleSeen && !inPurpose) {
          titleSeen = true;
        } else {
          leftovers.push(line.trim());
          inPurpose = false;
        }
        previousLine = line;
        continue;
      }
    }
    previousLine = line;
    if (inPurpose) continue;
    leftovers.push(line.trim());
  }

  // Between the header and the first requirement, and past the section's end.
  for (const slice of [parts.preamble, parts.after]) {
    for (const line of slice.split('\n')) {
      if (line.trim()) leftovers.push(line.trim());
    }
  }

  // Inside each requirement block, everything the block parser did not treat as
  // a new header rides along in `raw` - tables, fences, comments, prose written
  // below the scenarios. Only a requirement's own parts are expected here.
  for (const block of parts.bodyBlocks) {
    const foreignTail = firstForeignTail(block.raw);
    if (foreignTail) leftovers.push(foreignTail.heading);

    const lines = block.raw.replace(/\r\n?/g, '\n').split('\n');
    const mask = buildCodeFenceMask(lines);
    let seenScenario = false;
    // A scenario's bullets run unbroken beneath its header. A blank line after
    // them ends the scenario, so bullets written past that point are a note the
    // author added, not part of the scenario - and deleting the file would take
    // them. Treating every bullet as a scenario's own is what let an
    // operational note below the last scenario be deleted unmentioned.
    let inScenarioBullets = false;
    let bulletsSeen = false;
    for (let index = 0; index < lines.length; index++) {
      const line = lines[index];
      if (!line.trim()) {
        // Only a blank that follows actual bullets closes the run, so a blank
        // between a scenario header and its first bullet is not a boundary.
        if (bulletsSeen) inScenarioBullets = false;
        continue;
      }
      if (index === 0) continue; // the `### Requirement:` header itself
      // Fenced lines render as a code block inside the requirement, so they are
      // its own content however they are spelled - a `### Requirement:` in an
      // example is not a heading to any reader. Flagging them made a spec that
      // merely documents a command unretirable.
      if (mask[index]) continue;
      if (
        index > 1 &&
        /^ {0,3}(?:=+|-+)\s*$/.test(line) &&
        lines[index - 1].trim()
      ) {
        leftovers.push(lines[index - 1].trim());
        continue;
      }
      if (/^ {0,3}####\s+Scenario:/i.test(line)) {
        seenScenario = true;
        inScenarioBullets = true;
        bulletsSeen = false;
        continue;
      }
      if (/^\s*(?:[-*]|\d+[.)])\s/.test(line)) {
        if (inScenarioBullets) {
          bulletsSeen = true;
          continue;
        }
        // A bullet outside a scenario. Before the first scenario it is part of
        // the requirement statement; after one it is the author's own note.
        if (!seenScenario) continue;
        leftovers.push(line.trim());
        continue;
      }
      // Free prose above the first scenario is the requirement statement.
      if (!seenScenario && !/^\s*[|<]/.test(line)) continue;
      leftovers.push(line.trim());
    }
  }

  return [...new Set(leftovers)];
}

function normalizeBlockRaw(raw: string): string {
  return raw.replace(/\r\n?/g, '\n').trim();
}

/** Count non-overlapping copies so one retained duplicate cannot mask another copy's loss. */
function countOccurrences(haystack: string, needle: string): number {
  if (!needle) return 0;
  let count = 0;
  let start = 0;
  while ((start = haystack.indexOf(needle, start)) !== -1) {
    count++;
    start += needle.length;
  }
  return count;
}

/**
 * Retire a capability whose last requirement a delta removed: delete its main
 * spec and prune any directories the deletion leaves empty. Returns false when
 * there was nothing to delete.
 *
 * Gated by the caller on the change's `retire_capabilities` marker, so the one
 * archive action that removes a file from `openspec/specs/` is always something
 * the author asked for rather than something inferred from a delta's shape. The
 * file is recoverable from git, which the report names; applying REMOVED already
 * deletes requirement content from a main spec, so deleting the spec once
 * nothing is left is the same operation carried to its end rather than a new
 * kind of act.
 *
 * Only the generated `spec.md` is removed - a directory holding anything else (a
 * nested capability, a hand-kept note) is left in place.
 *
 * The target must resolve inside the selected specs root. A capability-directory
 * symlink must not turn a retirement marker into authorization to delete an
 * unrelated external file. A symlinked `spec.md` itself is safe: unlink removes
 * the link and leaves its target alone.
 *
 * Directory pruning IS bounded, by REAL paths rather than string prefixes:
 * `path.resolve` collapses `..` but does not resolve symlinks, and `readdir` and
 * `rmdir` both follow them, so a symlinked capability directory would otherwise
 * let the walk delete directories outside the specs root entirely.
 */
export async function retireSpec(
  update: SpecUpdate,
  mainSpecsDir: string,
  options: {
    silent?: boolean;
    displayPath?: string;
    beforeMutate?: () => Promise<void>;
    verifyDisplaced?: (displacedPath: string) => Promise<void>;
    deferDelete?: boolean;
  } = {}
): Promise<{ retired: boolean; resolvedPath?: string; displacedPath?: string }> {
  if (options.deferDelete && options.verifyDisplaced === undefined) {
    throw new Error('Deferred retirement requires displaced-file verification.');
  }
  // Resolved before the unlink, while the link still exists, so the report can
  // name the file that actually goes when a symlink points out of the tree.
  // A symlinked `spec.md` is excluded: `realpath` would follow it, but `unlink`
  // removes the link and leaves the target alone, so naming the target would
  // claim a file was deleted that is still there.
  let realSource: string | undefined;
  try {
    const link = await fs.lstat(update.target);
    realSource = link.isSymbolicLink() ? undefined : await fs.realpath(update.target);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return { retired: false };
    throw new Error(
      `Could not retire capability '${update.id}': could not verify ${update.target} ` +
        `before deletion (${error instanceof Error ? error.message : String(error)}).`
    );
  }

  if (realSource !== undefined) {
    let inside: boolean;
    try {
      inside = await isInsideRealDir(realSource, mainSpecsDir);
    } catch (error) {
      throw new Error(
        `Could not retire capability '${update.id}': could not verify that ${update.target} ` +
          `is inside ${mainSpecsDir} (${error instanceof Error ? error.message : String(error)}).`
      );
    }
    if (!inside) {
      throw new Error(
        `Could not retire capability '${update.id}': ${update.target} resolves outside ` +
          `${mainSpecsDir}. Remove the external file by hand, or replace the symlink and rerun.`
      );
    }
  }

  let displacedPath: string | undefined;
  try {
    await options.beforeMutate?.();
    if (options.verifyDisplaced) {
      const displaced = `${update.target}.openspec-retire-${randomUUID()}`;
      displacedPath = displaced;
      await fs.rename(update.target, displaced);
      try {
        await options.verifyDisplaced(displaced);
        try {
          await fs.lstat(update.target);
          throw new Error(
            `A concurrent file appeared at ${update.target} while archive was retiring it.`
          );
        } catch (targetError) {
          if ((targetError as NodeJS.ErrnoException).code !== 'ENOENT') throw targetError;
        }
        if (!options.deferDelete) await fs.unlink(displaced);
      } catch (error) {
        try {
          await fs.lstat(update.target);
          throw new Error(
            `${error instanceof Error ? error.message : String(error)} ` +
              `A concurrent file now occupies ${update.target}; the displaced spec was retained at ${displaced}.`
          );
        } catch (targetError) {
          if ((targetError as NodeJS.ErrnoException).code !== 'ENOENT') throw targetError;
        }
        await fs.rename(displaced, update.target);
        throw error;
      }
    } else {
      await fs.unlink(update.target);
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return { retired: false };
    // A bare errno here reads as an internal failure; say what was being
    // attempted so the message is actionable on its own.
    throw new Error(
      `Could not retire capability '${update.id}': failed to delete ${update.target} ` +
        `(${(error as Error).message}). Remove it by hand, then rerun the archive.`
    );
  }

  if (!options.deferDelete) {
    await pruneEmptyDirs(path.dirname(update.target), mainSpecsDir);
  }

  const nominal = options.displayPath ?? `openspec/specs/${update.id}/spec.md`;
  if (!options.silent) {
    console.log(`Retiring ${nominal}: all requirements removed.`);
  }
  // `resolvedPath` is always the file that was actually unlinked - callers need
  // it to report a path git will accept, since the nominal one is built from
  // the capability id and can differ in case, or point through a symlink.
  return {
    retired: true,
    ...(realSource ? { resolvedPath: realSource } : {}),
    ...(options.deferDelete && displacedPath ? { displacedPath } : {}),
  };
}

export async function finalizeRetiredSpec(
  target: string,
  displacedPath: string,
  mainSpecsDir: string
): Promise<void> {
  await fs.unlink(displacedPath);
  await pruneEmptyDirs(path.dirname(target), mainSpecsDir);
}

/** Whether `realPath` (already canonical) sits under the real `dir`. */
async function isInsideRealDir(realPath: string, dir: string): Promise<boolean> {
  const realDir = await fs.realpath(dir);
  return realPath.startsWith(realDir + path.sep);
}

/**
 * Remove now-empty directories from `startDir` upward, never leaving the real
 * `boundaryDir` and never removing that directory itself.
 *
 * The boundary is a parameter rather than the specs root directly so the walk's
 * containment is stated at the call site, where the root it must not escape is
 * the thing being reasoned about.
 *
 * The guard re-runs every iteration, so stepping to the LEXICAL parent is safe:
 * a parent that is not the real one is simply re-resolved and rejected. Errors
 * are swallowed and end the walk - ENOTEMPTY and ENOENT are correct outcomes (a
 * file arriving mid-walk must win), and a permissions failure leaves an empty
 * directory behind, which the next successful archive clears.
 *
 * Not race-free: an attacker who can swap an ancestor between the check and the
 * `rmdir` could get an empty directory outside the root removed. Closing that
 * needs fd-relative syscalls Node does not expose, and it requires local write
 * access to `openspec/specs` during an archive.
 */
async function pruneEmptyDirs(startDir: string, boundaryDir: string): Promise<void> {
  let boundary: string;
  try {
    boundary = await fs.realpath(boundaryDir);
  } catch {
    return;
  }

  let dir = startDir;
  for (;;) {
    let realDir: string;
    try {
      // lstat first: rmdir on a symlink fails anyway, but resolving one would
      // walk us out of the tree, and the parent we then step to would be wrong.
      const link = await fs.lstat(dir);
      if (link.isSymbolicLink()) return;
      realDir = await fs.realpath(dir);
    } catch {
      return;
    }

    // Strictly inside the real boundary - the boundary itself is never pruned.
    if (realDir === boundary || !realDir.startsWith(boundary + path.sep)) return;

    try {
      const entries = await fs.readdir(dir);
      if (entries.length > 0) return;
      await fs.rmdir(dir);
    } catch {
      return;
    }

    dir = path.dirname(dir);
  }
}

/**
 * Write an updated spec to disk.
 */
export async function writeUpdatedSpec(
  update: SpecUpdate,
  rebuilt: string,
  counts: { added: number; modified: number; removed: number; renamed: number },
  options: {
    silent?: boolean;
    displayPath?: string;
    beforeMutate?: () => Promise<void>;
  } = {}
): Promise<void> {
  assertTrustedSpecPath(update.targetRoot, update.target);

  // Create target directory if needed
  const targetDir = path.dirname(update.target);
  await fs.mkdir(targetDir, { recursive: true });
  await options.beforeMutate?.();
  // Preserve the established in-place write semantics: symlink referents,
  // hard-linked specs, ACLs, extended attributes, and filesystems without hard
  // links must continue to behave as they did before capability retirement.
  await fs.writeFile(update.target, rebuilt);
  if (options.silent) return;

  const specName = update.id;
  console.log(`Applying changes to ${options.displayPath ?? `openspec/specs/${specName}/spec.md`}:`);
  if (counts.added) console.log(`  + ${counts.added} added`);
  if (counts.modified) console.log(`  ~ ${counts.modified} modified`);
  if (counts.removed) console.log(`  - ${counts.removed} removed`);
  if (counts.renamed) console.log(`  → ${counts.renamed} renamed`);
}

/** Blank out `<!-- ... -->` spans, preserving line count so indices stay aligned. */
function maskHtmlComments(content: string): string {
  const blank = (text: string) => text.replace(/[^\n]/g, ' ');
  // `--!>` is a comment terminator as well as `-->`.
  const masked = content.replace(/<!--[\s\S]*?--!?>/g, blank);
  // A comment that is never closed runs to end of file, so everything after it
  // is commented out too. Without this an unterminated `<!--` above a
  // `## Purpose` left the commented-out header looking real (#1413).
  const unterminated = masked.indexOf('<!--');
  if (unterminated === -1) return masked;
  return masked.slice(0, unterminated) + blank(masked.slice(unterminated));
}

/**
 * Read the body of a `## Purpose` section, ignoring markdown that only appears
 * inside fenced code blocks or HTML comments. Returns undefined when the
 * section is absent or its body is empty.
 */
function extractPurposeSection(content: string): string | undefined {
  const normalized = content.replace(/\r\n?/g, '\n');
  const lines = normalized.split('\n');
  // Structure is read from the masked copy so a commented-out or fenced
  // `## Purpose` is not mistaken for the real one; the body is returned from
  // the original lines so an author's own comments and fences survive intact.
  const masked = maskHtmlComments(normalized).split('\n');
  const fenceMask = buildCodeFenceMask(masked);
  const isStructural = (i: number) => !fenceMask[i];

  const start = masked.findIndex((line, i) => isStructural(i) && /^##\s+Purpose\s*$/i.test(line));
  if (start === -1) return undefined;

  let end = masked.length;
  for (let i = start + 1; i < masked.length; i++) {
    if (isStructural(i) && /^##\s+/.test(masked[i])) {
      end = i;
      break;
    }
  }

  // Emptiness is judged with fenced blocks and HTML comments blanked out, so a
  // Purpose that is only a code sample or only an unfilled template comment
  // counts as absent and falls back to the TBD placeholder.
  const hasProse = masked
    .slice(start + 1, end)
    .filter((_, offset) => isStructural(start + 1 + offset))
    .join('\n')
    .trim();
  if (!hasProse) return undefined;

  const body = lines.slice(start + 1, end).join('\n').trim();
  return body || undefined;
}

/**
 * The Purpose a new main spec would end up with, or null when carrying the
 * delta's body over would leave a spec the readers downstream cannot handle.
 *
 * Returns the parsed overview rather than a boolean so callers measure the same
 * string `validate` measures, not the raw slice out of the delta.
 */
function readableOverview(skeleton: string, specName: string): string | null {
  // HTML comments are invisible to the spec parsers but not to the file itself:
  // markdown hidden in one is skipped by the boundary scan yet still lands in
  // the spec, where it can hide the headers those parsers depend on and blank
  // the document out in any markdown renderer. Refuse rather than write a spec
  // that reads differently depending on who is reading it (#1413).
  //
  // Only the opener is disqualifying, and only because `maskHtmlComments`
  // covers unterminated comments too: a comment starting above the section
  // header therefore always masks the header, leaving no body to carry, so a
  // body can only hide content behind a `<!--` of its own. A bare `-->` hides
  // nothing and renders as text - rejecting it would throw away a Purpose over
  // prose like "ingest --> transform".
  if (skeleton.includes('<!--')) return null;
  if (findMainSpecStructureIssues(skeleton).length > 0) return null;
  try {
    // A heading or unterminated fence in the body truncates or swallows the
    // sections around it, so archive would abort or write a spec its own
    // validator rejects.
    return new MarkdownParser(skeleton).parseSpec(specName).overview.trim() || null;
  } catch {
    return null;
  }
}

/**
 * Build a skeleton spec for new capabilities. When the delta spec authored a
 * `## Purpose`, carry it over instead of the TBD placeholder (#1413) - archive
 * invents the Purpose for a brand-new main spec either way, and the author's
 * own wording beats a placeholder they then have to hand-edit.
 */
export function buildSpecSkeleton(specFolderName: string, changeName: string, purpose?: string): string {
  const titleBase = specFolderName;
  const purposeBody =
    purpose?.trim() || `TBD - created by archiving change ${changeName}. Update Purpose after archive.`;
  return `# ${titleBase} Specification\n\n## Purpose\n${purposeBody}\n\n## Requirements\n`;
}
