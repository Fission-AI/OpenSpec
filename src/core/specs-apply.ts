/**
 * Spec Application Logic
 *
 * Extracted from ArchiveCommand to enable standalone spec application.
 * Applies delta specs from a change to main specs without archiving.
 */

import { promises as fs } from 'fs';
import path from 'path';
import chalk from 'chalk';
import {
  extractRequirementsSection,
  foldRequirementName,
  parseDeltaSpec,
  normalizeRequirementName,
  type RequirementBlock,
} from './parsers/requirement-blocks.js';
import { findMainSpecStructureIssues } from './parsers/spec-structure.js';
import { buildCodeFenceMask } from './parsers/code-fence.js';
import { MarkdownParser } from './parsers/markdown-parser.js';
import { MIN_PURPOSE_LENGTH } from './validation/constants.js';
import { discoverSpecFiles } from '../utils/spec-discovery.js';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export interface SpecUpdate {
  /** Capability id relative to the specs root, forward-slash separated (e.g. "web" or "platform/session-layout"). */
  id: string;
  source: string;
  target: string;
  exists: boolean;
}

interface ScenarioBlock {
  name: string;
  raw: string;
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

    // Check if target exists
    let exists = false;
    try {
      await fs.access(targetFile);
      exists = true;
    } catch {
      exists = false;
    }

    updates.push({
      id,
      source: specFile,
      target: targetFile,
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
   * `###` headings still sitting in the rebuilt requirements body. A reader sees
   * these as requirements whatever the parsers make of them, so their presence
   * disqualifies a retirement: something is left to keep, and deleting the file
   * would take it silently.
   */
  residualRequirementHeadings: string[];
  /**
   * Authored `## ` sections other than Purpose and Requirements. Retirement
   * deletes the whole file, so callers name these in a warning rather than
   * discarding hand-written prose silently.
   */
  otherSections: string[];
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
    // Only ADDED grows the block set, so an empty result means the delta removed
    // the last requirement block the capability had. Whether that spec is
    // genuinely unwritable is the validator's call, not this one.
    noRequirementBlocks: keptOrder.length === 0,
    // Read off the rebuilt requirements body, which is the preamble alone once
    // every block is gone.
    residualRequirementHeadings: findHeadings(reqBody, /^###\s+(.+?)\s*$/),
    otherSections: findOtherSections(rebuilt),
  };
}

/**
 * Structural headings matching `pattern`, ignoring anything inside a fenced code
 * block or an HTML comment - the same two things every other structural scan in
 * this file masks, because a commented-out or fenced heading is invisible to the
 * spec parsers but still sits in the file (#1413).
 */
function findHeadings(content: string, pattern: RegExp): string[] {
  const normalized = content.replace(/\r\n?/g, '\n');
  // Structure is read from the masked copy; titles come from the real lines so
  // an author's own wording is reported verbatim.
  const lines = normalized.split('\n');
  const masked = maskHtmlComments(normalized).split('\n');
  const fenceMask = buildCodeFenceMask(masked);
  const found: string[] = [];
  for (let i = 0; i < masked.length; i++) {
    if (fenceMask[i]) continue;
    if (!pattern.test(masked[i])) continue;
    const match = lines[i].match(pattern);
    if (match) found.push(match[1]);
  }
  return found;
}

/**
 * Authored `## ` headings other than Purpose and Requirements. Named so a
 * retirement can say what it is deleting along with the spec, so duplicates are
 * collapsed - this list is read as prose, not as a count.
 */
function findOtherSections(content: string): string[] {
  const titles = findHeadings(content, /^##\s+(.+?)\s*$/).filter(
    (title) => !/^(Purpose|Requirements)$/i.test(title)
  );
  return [...new Set(titles)];
}

/**
 * Retire a capability whose last requirement a delta removed: delete its main
 * spec and any directories the deletion leaves empty. Returns false when there
 * was nothing to delete.
 *
 * Only the generated `spec.md` is removed - a directory holding anything else
 * (a nested capability, a hand-kept note) is left in place.
 *
 * The unlink is deliberately NOT bounded to the specs root: it targets exactly
 * the path a write would have written to, so a symlinked capability directory
 * resolves the same way for both. That does mean a symlinked directory lets the
 * unlink reach a file outside the repository, which `retiredPath` surfaces so the
 * report never hides where the file really was. A symlinked `spec.md` itself
 * loses the link and leaves its target alone.
 *
 * Directory pruning IS bounded, by REAL paths rather than string prefixes:
 * `path.resolve` collapses `..` but does not resolve symlinks, and `readdir` and
 * `rmdir` both follow them, so a symlinked capability directory would otherwise
 * let the walk delete directories outside the specs root entirely.
 */
export async function retireSpec(
  update: SpecUpdate,
  mainSpecsDir: string,
  options: { silent?: boolean; displayPath?: string } = {}
): Promise<{ deleted: boolean; retiredPath?: string }> {
  // Resolved before the unlink, while the link still exists, so the report can
  // name the file that actually goes when a symlink points out of the tree.
  let realTarget: string | undefined;
  try {
    realTarget = await fs.realpath(update.target);
  } catch {
    realTarget = undefined;
  }

  try {
    await fs.unlink(update.target);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return { deleted: false };
    // A bare errno here reads as an internal failure; say what was being
    // attempted so the message is actionable on its own.
    throw new Error(
      `Could not retire capability '${update.id}': failed to delete ${update.target} ` +
        `(${(error as Error).message}). Remove it by hand, then rerun the archive.`
    );
  }

  await pruneEmptyDirs(path.dirname(update.target), mainSpecsDir);

  const nominal = options.displayPath ?? `openspec/specs/${update.id}/spec.md`;
  // Only worth showing when the two differ - otherwise it is the same path twice.
  const resolvedNote =
    realTarget && realTarget !== path.resolve(update.target) ? ` (resolved to ${realTarget})` : '';
  if (!options.silent) {
    console.log(`Retiring ${nominal}${resolvedNote}: all requirements removed.`);
  }
  return { deleted: true, ...(resolvedNote ? { retiredPath: realTarget } : {}) };
}

/**
 * Remove now-empty directories from `startDir` upward, never leaving the real
 * specs root.
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
async function pruneEmptyDirs(startDir: string, mainSpecsDir: string): Promise<void> {
  let specsRoot: string;
  try {
    specsRoot = await fs.realpath(mainSpecsDir);
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

    // Strictly inside the real specs root - the root itself is never pruned.
    if (realDir === specsRoot || !realDir.startsWith(specsRoot + path.sep)) return;

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

function normalizeBlockRaw(raw: string): string {
  return raw.replace(/\r\n?/g, '\n').trim();
}

/**
 * Write an updated spec to disk.
 */
export async function writeUpdatedSpec(
  update: SpecUpdate,
  rebuilt: string,
  counts: { added: number; modified: number; removed: number; renamed: number },
  options: { silent?: boolean; displayPath?: string } = {}
): Promise<void> {
  // Create target directory if needed
  const targetDir = path.dirname(update.target);
  await fs.mkdir(targetDir, { recursive: true });
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

function findMissingCurrentScenarios(current: RequirementBlock, incoming: RequirementBlock): string[] {
  // Multiplicity-aware: a name present N times in current and M times in
  // incoming means max(0, N - M) instances are missing. Set membership would
  // treat N>M as fully covered and let archive silently drop duplicates
  // (residual #1246 / duplicate-scenario-name blind spot).
  const remainingIncoming = new Map<string, number>();
  for (const scenario of parseScenarioBlocks(incoming.raw)) {
    const name = scenario.name;
    remainingIncoming.set(name, (remainingIncoming.get(name) ?? 0) + 1);
  }

  const missing: string[] = [];
  for (const scenario of parseScenarioBlocks(current.raw)) {
    const name = scenario.name;
    const remaining = remainingIncoming.get(name) ?? 0;
    if (remaining > 0) {
      remainingIncoming.set(name, remaining - 1);
    } else {
      missing.push(name);
    }
  }
  return missing;
}

function parseScenarioBlocks(requirementRaw: string): ScenarioBlock[] {
  const lines = requirementRaw.replace(/\r\n?/g, '\n').split('\n');
  // A `#### Scenario:` inside a fenced example is not a real scenario. The
  // validator's countScenarios already ignores fenced lines; the drift check
  // must agree with it, or a fenced sample can false-abort an archive (or
  // mask a genuinely dropped scenario).
  const mask = buildCodeFenceMask(lines);
  const scenarios: ScenarioBlock[] = [];
  let index = 0;

  while (index < lines.length) {
    const headerMatch = mask[index] ? null : lines[index].match(/^####\s*Scenario:\s*(.+)\s*$/);
    if (!headerMatch) {
      index++;
      continue;
    }

    const start = index;
    const name = headerMatch[1].trim();
    index++;
    while (index < lines.length && (mask[index] || !/^####\s*Scenario:\s*(.+)\s*$/.test(lines[index]))) {
      index++;
    }

    scenarios.push({
      name,
      raw: lines.slice(start, index).join('\n').trimEnd(),
    });
  }

  return scenarios;
}

