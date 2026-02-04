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
  parseDeltaSpec,
  normalizeRequirementName,
  type RequirementBlock,
} from './parsers/requirement-blocks.js';
import { Validator } from './validation/validator.js';
import {
  findSpecUpdates as findSpecUpdatesUtil,
  type SpecUpdate,
} from '../utils/spec-discovery.js';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export type { SpecUpdate };

export interface ApplyResult {
  capability: string;
  added: number;
  modified: number;
  removed: number;
  renamed: number;
}

export interface SpecsApplyOutput {
  changeName: string;
  capabilities: ApplyResult[];
  totals: {
    added: number;
    modified: number;
    removed: number;
    renamed: number;
  };
  noChanges: boolean;
}

// -----------------------------------------------------------------------------
// Public API
// -----------------------------------------------------------------------------

/**
 * Find all delta spec files that need to be applied from a change.
 * Uses spec-discovery utility to support hierarchical structures.
 */
export async function findSpecUpdates(changeDir: string, mainSpecsDir: string): Promise<SpecUpdate[]> {
  // Use the spec-discovery utility which handles hierarchical structures
  return findSpecUpdatesUtil(changeDir, mainSpecsDir);
}

/**
 * Build an updated spec by applying delta operations.
 * Returns the rebuilt content and counts of operations.
 */
export async function buildUpdatedSpec(
  update: SpecUpdate,
  changeName: string
): Promise<{ rebuilt: string; counts: { added: number; modified: number; removed: number; renamed: number } }> {
  // Read change spec content (delta-format expected)
  const changeContent = await fs.readFile(update.source, 'utf-8');

  // Parse deltas from the change spec file
  const plan = parseDeltaSpec(changeContent);
  const specName = update.capability; // Use full capability path for hierarchical support

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
      `Delta parsing found no operations for ${path.basename(path.dirname(update.source))}. ` +
        `Provide ADDED/MODIFIED/REMOVED/RENAMED sections in change spec.`
    );
  }

  // Load or create base target content
  let targetContent: string;
  let isNewSpec = false;
  try {
    targetContent = await fs.readFile(update.target, 'utf-8');
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
      console.log(
        chalk.yellow(
          `⚠️  Warning: ${specName} - ${plan.removed.length} REMOVED requirement(s) ignored for new spec (nothing to remove).`
        )
      );
    }
    isNewSpec = true;
    targetContent = buildSpecSkeleton(specName, changeName);
  }

  // Extract requirements section and build name->block map
  const parts = extractRequirementsSection(targetContent);
  const nameToBlock = new Map<string, RequirementBlock>();
  for (const block of parts.bodyBlocks) {
    nameToBlock.set(normalizeRequirementName(block.name), block);
  }

  // Apply operations in order: RENAMED → REMOVED → MODIFIED → ADDED
  // RENAMED
  for (const r of plan.renamed) {
    const from = normalizeRequirementName(r.from);
    const to = normalizeRequirementName(r.to);
    if (!nameToBlock.has(from)) {
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
  }

  // REMOVED
  for (const name of plan.removed) {
    const key = normalizeRequirementName(name);
    if (!nameToBlock.has(key)) {
      // For new specs, REMOVED requirements are already warned about and ignored
      // For existing specs, missing requirements are an error
      if (!isNewSpec) {
        throw new Error(`${specName} REMOVED failed for header "### Requirement: ${name}" - not found`);
      }
      // Skip removal for new specs (already warned above)
      continue;
    }
    nameToBlock.delete(key);
  }

  // MODIFIED
  for (const mod of plan.modified) {
    const key = normalizeRequirementName(mod.name);
    if (!nameToBlock.has(key)) {
      throw new Error(`${specName} MODIFIED failed for header "### Requirement: ${mod.name}" - not found`);
    }
    // Replace block with provided raw (ensure header line matches key)
    const modHeaderMatch = mod.raw.split('\n')[0].match(/^###\s*Requirement:\s*(.+)\s*$/);
    if (!modHeaderMatch || normalizeRequirementName(modHeaderMatch[1]) !== key) {
      throw new Error(
        `${specName} MODIFIED failed for header "### Requirement: ${mod.name}" - header mismatch in content`
      );
    }
    nameToBlock.set(key, mod);
  }

  // ADDED
  for (const add of plan.added) {
    const key = normalizeRequirementName(add.name);
    if (nameToBlock.has(key)) {
      throw new Error(`${specName} ADDED failed for header "### Requirement: ${add.name}" - already exists`);
    }
    nameToBlock.set(key, add);
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
      added: plan.added.length,
      modified: plan.modified.length,
      removed: plan.removed.length,
      renamed: plan.renamed.length,
    },
  };
}

/**
 * Write an updated spec to disk.
 */
export async function writeUpdatedSpec(
  update: SpecUpdate,
  rebuilt: string,
  counts: { added: number; modified: number; removed: number; renamed: number }
): Promise<void> {
  // Create target directory if needed
  const targetDir = path.dirname(update.target);
  await fs.mkdir(targetDir, { recursive: true });
  await fs.writeFile(update.target, rebuilt);

  // Use full capability path for hierarchical support
  console.log(`Applying changes to ${path.join('openspec', 'specs', update.capability, 'spec.md')}:`);
  if (counts.added) console.log(`  + ${counts.added} added`);
  if (counts.modified) console.log(`  ~ ${counts.modified} modified`);
  if (counts.removed) console.log(`  - ${counts.removed} removed`);
  if (counts.renamed) console.log(`  → ${counts.renamed} renamed`);
}

/**
 * Build a skeleton spec for new capabilities.
 */
export function buildSpecSkeleton(specFolderName: string, changeName: string): string {
  const titleBase = specFolderName;
  return `# ${titleBase} Specification\n\n## Purpose\nTBD - created by archiving change ${changeName}. Update Purpose after archive.\n\n## Requirements\n`;
}

/**
 * Apply all delta specs from a change to main specs.
 *
 * @param projectRoot - The project root directory
 * @param changeName - The name of the change to apply
 * @param options - Options for the operation
 * @returns Result of the operation with counts
 */
export async function applySpecs(
  projectRoot: string,
  changeName: string,
  options: {
    dryRun?: boolean;
    skipValidation?: boolean;
    silent?: boolean;
  } = {}
): Promise<SpecsApplyOutput> {
  const changeDir = path.join(projectRoot, 'openspec', 'changes', changeName);
  const mainSpecsDir = path.join(projectRoot, 'openspec', 'specs');

  // Verify change exists
  try {
    const stat = await fs.stat(changeDir);
    if (!stat.isDirectory()) {
      throw new Error(`Change '${changeName}' not found.`);
    }
  } catch {
    throw new Error(`Change '${changeName}' not found.`);
  }

  // Find specs to update
  const specUpdates = await findSpecUpdates(changeDir, mainSpecsDir);

  if (specUpdates.length === 0) {
    return {
      changeName,
      capabilities: [],
      totals: { added: 0, modified: 0, removed: 0, renamed: 0 },
      noChanges: true,
    };
  }

  // Prepare all updates first (validation pass, no writes)
  const prepared: Array<{
    update: SpecUpdate;
    rebuilt: string;
    counts: { added: number; modified: number; removed: number; renamed: number };
  }> = [];

  for (const update of specUpdates) {
    const built = await buildUpdatedSpec(update, changeName);
    prepared.push({ update, rebuilt: built.rebuilt, counts: built.counts });
  }

  // Validate rebuilt specs unless validation is skipped
  if (!options.skipValidation) {
    const validator = new Validator();
    for (const p of prepared) {
      // Use full capability path for hierarchical support
      const report = await validator.validateSpecContent(p.update.capability, p.rebuilt);
      if (!report.valid) {
        const errors = report.issues
          .filter((i) => i.level === 'ERROR')
          .map((i) => `  ✗ ${i.message}`)
          .join('\n');
        throw new Error(`Validation errors in rebuilt spec for ${p.update.capability}:\n${errors}`);
      }
    }
  }

  // Build results
  const capabilities: ApplyResult[] = [];
  const totals = { added: 0, modified: 0, removed: 0, renamed: 0 };

  for (const p of prepared) {
    // Use full capability path for hierarchical support
    const capability = p.update.capability;

    if (!options.dryRun) {
      // Write the updated spec
      const targetDir = path.dirname(p.update.target);
      await fs.mkdir(targetDir, { recursive: true });
      await fs.writeFile(p.update.target, p.rebuilt);

      if (!options.silent) {
        console.log(`Applying changes to ${path.join('openspec', 'specs', capability, 'spec.md')}:`);
        if (p.counts.added) console.log(`  + ${p.counts.added} added`);
        if (p.counts.modified) console.log(`  ~ ${p.counts.modified} modified`);
        if (p.counts.removed) console.log(`  - ${p.counts.removed} removed`);
        if (p.counts.renamed) console.log(`  → ${p.counts.renamed} renamed`);
      }
    } else if (!options.silent) {
      console.log(`Would apply changes to ${path.join('openspec', 'specs', capability, 'spec.md')}:`);
      if (p.counts.added) console.log(`  + ${p.counts.added} added`);
      if (p.counts.modified) console.log(`  ~ ${p.counts.modified} modified`);
      if (p.counts.removed) console.log(`  - ${p.counts.removed} removed`);
      if (p.counts.renamed) console.log(`  → ${p.counts.renamed} renamed`);
    }

    capabilities.push({
      capability,
      ...p.counts,
    });

    totals.added += p.counts.added;
    totals.modified += p.counts.modified;
    totals.removed += p.counts.removed;
    totals.renamed += p.counts.renamed;
  }

  return {
    changeName,
    capabilities,
    totals,
    noChanges: false,
  };
}
