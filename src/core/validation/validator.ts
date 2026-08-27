import { z, ZodError } from 'zod';
import { readFileSync, promises as fs } from 'fs';
import path from 'path';
import { SpecSchema, ChangeSchema, Spec, Change } from '../schemas/index.js';
import { MarkdownParser } from '../parsers/markdown-parser.js';
import { ChangeParser } from '../parsers/change-parser.js';
import { ValidationReport, ValidationIssue, ValidationLevel } from './types.js';
import { findSpecUpdates, buildUpdatedSpec } from '../specs-apply.js';
import {
  MIN_PURPOSE_LENGTH,
  MAX_REQUIREMENT_TEXT_LENGTH,
  VALIDATION_MESSAGES
} from './constants.js';
import {
  parseDeltaSpec,
  foldRequirementName,
  normalizeRequirementName,
  extractRequirementsSection,
  findMissingCurrentScenarios,
  type RequirementBlock,
} from '../parsers/requirement-blocks.js';
import {
  extractRequirementBody as extractRequirementBodyShared,
  containsShallOrMust as containsShallOrMustShared,
  countScenarios as countScenariosShared,
} from '../parsers/requirement-text.js';
import { findMainSpecStructureIssues } from '../parsers/spec-structure.js';
import { FileSystemUtils } from '../../utils/file-system.js';
import { discoverSpecFiles, hasAnyFileUnder } from '../../utils/spec-discovery.js';
import {
  METADATA_FILENAME,
  readSkipSpecsMarker,
  resolveSchemaForChange,
} from '../../utils/change-metadata.js';
import { resolveTaskFilesForChange } from '../../utils/task-progress.js';
import { findTaskNumberingIssues } from './task-numbering.js';
import { findPurposePlaceholderIssue } from './purpose-placeholder.js';
import { getPackageSchemasDir, getSchemaDir } from '../artifact-graph/index.js';

export class Validator {
  private strictMode: boolean;

  constructor(strictMode: boolean = false) {
    this.strictMode = strictMode;
  }

  async validateSpec(filePath: string): Promise<ValidationReport> {
    const issues: ValidationIssue[] = [];
    const specName = this.extractNameFromPath(filePath);
    try {
      const content = readFileSync(filePath, 'utf-8');
      const parser = new MarkdownParser(content);
      
      const spec = parser.parseSpec(specName);
      
      const result = SpecSchema.safeParse(spec);
      
      if (!result.success) {
        issues.push(...this.convertZodErrors(result.error));
      }
      
      issues.push(...this.applySpecRules(spec, content));
      
    } catch (error) {
      const baseMessage = error instanceof Error ? error.message : 'Unknown error';
      const enriched = this.enrichTopLevelError(specName, baseMessage);
      issues.push({
        level: 'ERROR',
        path: 'file',
        message: enriched,
      });
    }
    
    return this.createReport(issues);
  }

  /**
   * Validate spec content from a string (used for pre-write validation of rebuilt specs)
   */
  async validateSpecContent(specName: string, content: string): Promise<ValidationReport> {
    const issues: ValidationIssue[] = [];
    try {
      const parser = new MarkdownParser(content);
      const spec = parser.parseSpec(specName);
      const result = SpecSchema.safeParse(spec);
      if (!result.success) {
        issues.push(...this.convertZodErrors(result.error));
      }
      issues.push(...this.applySpecRules(spec, content));
    } catch (error) {
      const baseMessage = error instanceof Error ? error.message : 'Unknown error';
      const enriched = this.enrichTopLevelError(specName, baseMessage);
      issues.push({ level: 'ERROR', path: 'file', message: enriched });
    }
    return this.createReport(issues);
  }

  async validateChange(filePath: string): Promise<ValidationReport> {
    const issues: ValidationIssue[] = [];
    const changeName = this.extractNameFromPath(filePath);
    try {
      const content = readFileSync(filePath, 'utf-8');
      const changeDir = path.dirname(filePath);
      const parser = new ChangeParser(content, changeDir);

      const change = await parser.parseChangeWithDeltas(changeName);

      const result = ChangeSchema.safeParse(change);

      const marker = readSkipSpecsMarker(changeDir);
      if (marker.invalidReason) {
        issues.push({ level: 'ERROR', path: METADATA_FILENAME, message: this.formatInvalidMarkerMessage(marker.invalidReason) });
      }

      if (!result.success) {
        let zodIssues = this.convertZodErrors(result.error);
        // Only the no-deltas error is marker-aware here: the marker+files
        // conflict is validateChangeDeltaSpecs's job, and every caller of
        // this proposal-level pass (archive's non-blocking warnings) pairs
        // it with that gate.
        if (marker.declared) {
          zodIssues = zodIssues.filter(
            issue => !issue.message.startsWith(VALIDATION_MESSAGES.CHANGE_NO_DELTAS)
          );
        }
        issues.push(...zodIssues);
      }
      
      issues.push(...this.applyChangeRules(change, content));
      
    } catch (error) {
      const baseMessage = error instanceof Error ? error.message : 'Unknown error';
      const enriched = this.enrichTopLevelError(changeName, baseMessage);
      issues.push({
        level: 'ERROR',
        path: 'file',
        message: enriched,
      });
    }
    
    return this.createReport(issues);
  }

  /**
   * Validate delta-formatted spec files under a change directory.
   * Enforces:
   * - At least one delta across all files
   * - ADDED/MODIFIED: each requirement has at least one scenario; missing
   *   English SHALL/MUST keywords are guidance unless strict mode is enabled
   * - REMOVED: names only; no scenario/description required
   * - RENAMED: pairs well-formed
   * - No duplicates within sections; no cross-section conflicts per spec
   *
   * When `options.mainSpecsDir` is given, MODIFIED blocks are also checked
   * against the current main specs for scenario loss (#1477), and merge
   * conflicts are reported as INFO without changing the verdict (#1112).
   * When `options.projectRoot` is given, the schema's tracked task files are
   * checked for ambiguous numbering (#1520). Omitting either
   * option keeps existing library and archive callers behaving as before.
   */
  async validateChangeDeltaSpecs(
    changeDir: string,
    options: { mainSpecsDir?: string; projectRoot?: string } = {}
  ): Promise<ValidationReport> {
    const issues: ValidationIssue[] = [];
    const specsDir = path.join(changeDir, 'specs');
    let totalDeltas = 0;
    let hasRootLevelSpec = false;
    const missingHeaderSpecs: string[] = [];
    const emptySectionSpecs: Array<{ path: string; sections: string[] }> = [];

    try {
      // Discover delta specs through the same helper the change parser, show,
      // apply, and archive use, so validate never accepts a layout the merge
      // path silently skips (#1385). It finds spec.md at any depth, covering
      // both specs/<capability>/spec.md and the nested multi-area
      // specs/<area>/<capability>/spec.md layout (#1182b).
      const discoveredSpecs = await discoverSpecFiles(specsDir);

      // A spec.md directly at the specs/ root has no capability folder, so the
      // merge path drops it: without this error the change validates clean and
      // archives while its requirements never reach openspec/specs/ (#1385).
      // Only a regular file counts — a *directory* named spec.md is a capability
      // folder like any other, and discoverSpecFiles reads it normally.
      const rootSpecStat = await fs.stat(path.join(specsDir, 'spec.md')).catch(() => null);
      hasRootLevelSpec = rootSpecStat?.isFile() === true;
      if (hasRootLevelSpec) {
        issues.push({
          level: 'ERROR',
          path: 'spec.md',
          message:
            'Delta spec found at specs/spec.md. Delta specs must live under a capability path (e.g. specs/<capability-path>/spec.md) — a file at the specs/ root is ignored when the change is applied or archived.',
        });
      }

      for (const { id: specId, specFile } of discoveredSpecs) {
        let content: string | undefined;
        try {
          content = await fs.readFile(specFile, 'utf-8');
        } catch {
          continue;
        }

        const plan = parseDeltaSpec(content);
        const entryPath = FileSystemUtils.toPosixPath(path.relative(specsDir, specFile));

        // Surface (as INFO, never a failure) the non-canonical level-3 headers
        // the delta reader skipped while parsing ADDED/MODIFIED sections —
        // without this note a stray divider like "### Documentation
        // Requirements" would pass validate <change> while failing
        // archive/validate <spec>. The list comes from the parse itself, so it
        // reflects exactly what the reader skipped.
        for (const stray of plan.skippedHeaders) {
          const nameless = /^requirement:?$/i.test(stray.header);
          issues.push({
            level: 'INFO',
            path: entryPath,
            line: stray.line,
            message: nameless
              ? `Header "### ${stray.header}" in ${stray.section} is missing a requirement name and is ignored by validation. Add a name, e.g. "### Requirement: <name>".`
              : `Header "### ${stray.header}" in ${stray.section} is not a "### Requirement:" header and is ignored by validation. Use "### Requirement: ${stray.header}" if it should be validated as a requirement.`,
          });
        }

        const sectionNames: string[] = [];
        if (plan.sectionPresence.added) sectionNames.push('## ADDED Requirements');
        if (plan.sectionPresence.modified) sectionNames.push('## MODIFIED Requirements');
        if (plan.sectionPresence.removed) sectionNames.push('## REMOVED Requirements');
        if (plan.sectionPresence.renamed) sectionNames.push('## RENAMED Requirements');
        const hasSections = sectionNames.length > 0;
        const hasEntries = plan.added.length + plan.modified.length + plan.removed.length + plan.renamed.length > 0;
        if (!hasEntries) {
          if (hasSections) emptySectionSpecs.push({ path: entryPath, sections: sectionNames });
          else missingHeaderSpecs.push(entryPath);
        }

        const addedNames = new Set<string>();
        const modifiedNames = new Set<string>();
        const removedNames = new Set<string>();
        const renamedFrom = new Set<string>();
        const renamedTo = new Set<string>();

        // Validate ADDED
        for (const block of plan.added) {
          const key = normalizeRequirementName(block.name);
          totalDeltas++;
          if (addedNames.has(key)) {
            issues.push({ level: 'ERROR', path: entryPath, message: `Duplicate requirement in ADDED: "${block.name}"` });
          } else {
            addedNames.add(key);
          }
          const requirementText = this.extractRequirementText(block.raw);
          if (!requirementText) {
            issues.push({
              level: 'ERROR',
              path: entryPath,
              message: this.containsShallOrMust(block.name)
                ? this.buildMissingShallOrMustMessage(`ADDED "${block.name}"`, block.name)
                : `ADDED "${block.name}" is missing requirement text`,
            });
          } else if (!this.containsShallOrMust(requirementText)) {
            issues.push({
              level: 'WARNING',
              path: entryPath,
              message: this.buildMissingShallOrMustMessage(
                `ADDED "${block.name}"`,
                block.name,
                true
              ),
            });
          }
          const scenarioCount = this.countScenarios(block.raw);
          if (scenarioCount < 1) {
            issues.push({ level: 'ERROR', path: entryPath, message: `ADDED "${block.name}" must include at least one scenario` });
          }
        }

        // Validate MODIFIED
        for (const block of plan.modified) {
          const key = normalizeRequirementName(block.name);
          totalDeltas++;
          if (modifiedNames.has(key)) {
            issues.push({ level: 'ERROR', path: entryPath, message: `Duplicate requirement in MODIFIED: "${block.name}"` });
          } else {
            modifiedNames.add(key);
          }
          const requirementText = this.extractRequirementText(block.raw);
          if (!requirementText) {
            issues.push({
              level: 'ERROR',
              path: entryPath,
              message: this.containsShallOrMust(block.name)
                ? this.buildMissingShallOrMustMessage(`MODIFIED "${block.name}"`, block.name)
                : `MODIFIED "${block.name}" is missing requirement text`,
            });
          } else if (!this.containsShallOrMust(requirementText)) {
            issues.push({
              level: 'WARNING',
              path: entryPath,
              message: this.buildMissingShallOrMustMessage(
                `MODIFIED "${block.name}"`,
                block.name,
                true
              ),
            });
          }
          const scenarioCount = this.countScenarios(block.raw);
          if (scenarioCount < 1) {
            issues.push({ level: 'ERROR', path: entryPath, message: `MODIFIED "${block.name}" must include at least one scenario` });
          }
        }

        // Run archive's scenario-loss check here too, so the change fails at
        // authoring time instead of days later at archive time (#1477).
        if (options.mainSpecsDir && plan.modified.length > 0) {
          const mainSpecFile = path.join(
            options.mainSpecsDir,
            ...specId.split('/'),
            'spec.md'
          );
          FileSystemUtils.assertPathWithin(path.dirname(mainSpecFile), mainSpecFile);
          issues.push(
            ...(await this.findScenarioLossIssues(
              plan.modified,
              plan.renamed,
              mainSpecFile,
              entryPath,
              path.dirname(mainSpecFile)
            ))
          );
        }

        // Validate REMOVED (names only)
        for (const name of plan.removed) {
          const key = normalizeRequirementName(name);
          totalDeltas++;
          if (removedNames.has(key)) {
            issues.push({ level: 'ERROR', path: entryPath, message: `Duplicate requirement in REMOVED: "${name}"` });
          } else {
            removedNames.add(key);
          }
        }

        // Validate RENAMED pairs
        for (const { from, to } of plan.renamed) {
          const fromKey = normalizeRequirementName(from);
          const toKey = normalizeRequirementName(to);
          totalDeltas++;
          if (renamedFrom.has(fromKey)) {
            issues.push({ level: 'ERROR', path: entryPath, message: `Duplicate FROM in RENAMED: "${from}"` });
          } else {
            renamedFrom.add(fromKey);
          }
          if (renamedTo.has(toKey)) {
            issues.push({ level: 'ERROR', path: entryPath, message: `Duplicate TO in RENAMED: "${to}"` });
          } else {
            renamedTo.add(toKey);
          }
        }

        // Cross-section conflicts (within the same spec file)
        for (const n of modifiedNames) {
          if (removedNames.has(n)) {
            issues.push({ level: 'ERROR', path: entryPath, message: `Requirement present in both MODIFIED and REMOVED: "${n}"` });
          }
          if (addedNames.has(n)) {
            issues.push({ level: 'ERROR', path: entryPath, message: `Requirement present in both MODIFIED and ADDED: "${n}"` });
          }
        }
        for (const n of addedNames) {
          if (removedNames.has(n)) {
            issues.push({ level: 'ERROR', path: entryPath, message: `Requirement present in both ADDED and REMOVED: "${n}"` });
          }
        }
        for (const { from, to } of plan.renamed) {
          const fromKey = normalizeRequirementName(from);
          const toKey = normalizeRequirementName(to);
          if (modifiedNames.has(fromKey)) {
            issues.push({ level: 'ERROR', path: entryPath, message: `MODIFIED references old name from RENAMED. Use new header for "${to}"` });
          }
          if (addedNames.has(toKey)) {
            issues.push({ level: 'ERROR', path: entryPath, message: `RENAMED TO collides with ADDED for "${to}"` });
          }
          // Folded comparison: a case/whitespace variant of the FROM header
          // in REMOVED is the same contradiction, not a different name.
          const removedFoldMatch = [...removedNames].find(
            (r) => foldRequirementName(r) === foldRequirementName(fromKey)
          );
          if (removedFoldMatch !== undefined) {
            issues.push({
              level: 'ERROR',
              path: entryPath,
              message:
                `Requirement present in both RENAMED and REMOVED: "${from}"` +
                (removedFoldMatch === fromKey ? '' : ` (REMOVED spells it "${removedFoldMatch}")`),
            });
          }
        }
      }

      // Reuse archive's merge builder to report conflicts with the main specs.
      // Keep structural errors and scenario loss in their existing diagnostics.
      if (options.mainSpecsDir) {
        issues.push(
          ...(await this.findArchiveBlockers(changeDir, options.mainSpecsDir, [
            ...issues.filter((issue) => issue.level === 'ERROR').map((issue) => issue.path),
            // Collected in the loop above but not turned into issues until
            // after this try block, so they are invisible to the filter. A
            // delta with no parsed sections has nothing for the merge to
            // apply, which it reports as a failure of its own - on top of the
            // error that actually names the mistake.
            ...missingHeaderSpecs,
            ...emptySectionSpecs.map((spec) => spec.path),
          ]))
        );
      }
    } catch (error) {
      // A missing specs dir (or a stray `specs` file) means no deltas;
      // anything else (EACCES, EIO) must stay loud — discoverSpecFiles
      // documents that silently dropping an unreadable capability recreates
      // the data-loss class it prevents, and archive lets the same error
      // propagate.
      const code = (error as NodeJS.ErrnoException)?.code;
      if (code !== 'ENOENT' && code !== 'ENOTDIR') {
        throw error;
      }
    }

    for (const { path: specPath, sections } of emptySectionSpecs) {
      issues.push({
        level: 'ERROR',
        path: specPath,
        message: `Delta sections ${this.formatSectionList(sections)} were found, but no requirement entries parsed. Ensure each section includes at least one "### Requirement:" block (REMOVED may use bullet list syntax).`,
      });
    }
    for (const path of missingHeaderSpecs) {
      issues.push({
        level: 'ERROR',
        path,
        message: 'No delta sections found. Add headers such as "## ADDED Requirements" or move non-delta notes outside specs/.',
      });
    }

    const marker = readSkipSpecsMarker(changeDir);
    if (marker.invalidReason) {
      issues.push({ level: 'ERROR', path: METADATA_FILENAME, message: this.formatInvalidMarkerMessage(marker.invalidReason) });
    }

    // ANY file under specs/ contradicts the marker - not just parsed deltas.
    // Headerless or stray files would be silently dropped at archive time (and
    // some still satisfy the artifact graph's specs/**  glob) while the change
    // claims to have nothing, so they must surface as an explicit conflict.
    // Probed only when the marker is declared, and unreadable specs/ (a stray
    // `specs` file, permission errors) fails closed as a conflict: the marker
    // claims nothing is there, and validate must not crash where the
    // historical path degraded to "no deltas".
    const skipSpecs = marker.declared;
    let specsDirHasFiles = false;
    if (skipSpecs) {
      try {
        specsDirHasFiles = await hasAnyFileUnder(specsDir);
      } catch {
        specsDirHasFiles = true;
      }
    }
    if (skipSpecs && specsDirHasFiles) {
      issues.push({ level: 'ERROR', path: 'file', message: VALIDATION_MESSAGES.CHANGE_SKIP_SPECS_CONFLICT });
    }

    // The root-level error already names the file and the fix; adding "No
    // deltas found" on top would contradict it, since the deltas are sitting in
    // the file just reported.
    if (totalDeltas === 0 && !hasRootLevelSpec) {
      if (skipSpecs && !specsDirHasFiles) {
        issues.push({ level: 'INFO', path: 'file', message: VALIDATION_MESSAGES.CHANGE_SKIP_SPECS_ACCEPTED });
      } else if (!skipSpecs) {
        issues.push({ level: 'ERROR', path: 'file', message: this.enrichTopLevelError('change', VALIDATION_MESSAGES.CHANGE_NO_DELTAS) });
      }
    }

    if (options.projectRoot) {
      issues.push(...await this.collectTaskNumberingIssues(changeDir, options.projectRoot));
    }

    return this.createReport(issues);
  }

  private async collectTaskNumberingIssues(
    changeDir: string,
    projectRoot: string
  ): Promise<ValidationIssue[]> {
    try {
      const schemaName = resolveSchemaForChange(changeDir, undefined, projectRoot).replace(
        /\.ya?ml$/,
        ''
      );
      const schemaDir = getSchemaDir(schemaName, projectRoot);
      const builtInSchemaDir = path.join(getPackageSchemasDir(), 'spec-driven');
      if (
        schemaName !== 'spec-driven' ||
        schemaDir === null ||
        FileSystemUtils.canonicalizeExistingPath(schemaDir) !==
          FileSystemUtils.canonicalizeExistingPath(builtInSchemaDir)
      ) {
        return [];
      }
    } catch {
      return [];
    }

    let taskFiles: string[];
    try {
      taskFiles = resolveTaskFilesForChange(changeDir, projectRoot);
    } catch {
      return [];
    }
    if (taskFiles.length === 0) {
      taskFiles = [path.join(changeDir, 'tasks.md')];
    }

    const documents: Array<{ path: string; content: string }> = [];
    for (const taskFile of taskFiles) {
      let content: string;
      try {
        content = await fs.readFile(taskFile, 'utf-8');
      } catch {
        continue;
      }

      documents.push({
        path: FileSystemUtils.toPosixPath(path.relative(changeDir, taskFile)),
        content,
      });
    }

    documents.sort((left, right) => left.path.localeCompare(right.path));
    return findTaskNumberingIssues(documents).map((issue) => ({
      level: 'WARNING',
      path: issue.path,
      line: issue.line,
      message: issue.message,
    }));
  }

  /**
   * Report MODIFIED requirements whose block omits a scenario the main spec
   * still carries. Uses the same comparison archive applies, so validate can
   * only report what archive would refuse.
   *
   * Silent when the main spec or the requirement header is absent: applying a
   * MODIFIED against a base that is not there yet is a different failure (a
   * sister change still in flight is the legitimate case), and archive is the
   * gate for it. A spec that exists but cannot be read is not absent, though —
   * archive aborts on it, so reporting it beats calling the change valid.
   */
  private async findScenarioLossIssues(
    modified: RequirementBlock[],
    renamed: Array<{ from: string; to: string }>,
    mainSpecFile: string,
    entryPath: string,
    mainSpecRoot: string
  ): Promise<ValidationIssue[]> {
    let mainContent: string;
    FileSystemUtils.assertPathWithin(mainSpecRoot, mainSpecFile);
    try {
      mainContent = await fs.readFile(mainSpecFile, 'utf-8');
    } catch (error) {
      const code = (error as NodeJS.ErrnoException)?.code;
      // Reported only for the codes that mean the file itself is unusable, and
      // will be just as unusable when archive reads it. Everything else -
      // ENOENT/ENOTDIR ("no main spec"), and transient resource errors like
      // EMFILE that say nothing about the file - stays silent rather than
      // failing a change that is fine. `validate --all` reads six changes at
      // once, so a resource error must never become a verdict.
      const UNUSABLE = new Set(['EACCES', 'EPERM', 'EISDIR', 'ELOOP', 'ENAMETOOLONG']);
      if (!code || !UNUSABLE.has(code)) return [];
      return [
        {
          level: 'ERROR',
          path: entryPath,
          message:
            `Could not read ${FileSystemUtils.toPosixPath(mainSpecFile)} to check the MODIFIED requirements against it ` +
            `(${code}). Archive reads the same file, so fix the file before archiving.`,
        },
      ];
    }

    const currentBlocks = new Map<string, RequirementBlock>();
    for (const block of extractRequirementsSection(mainContent).bodyBlocks) {
      currentBlocks.set(normalizeRequirementName(block.name), block);
    }
    // Archive applies RENAMED before MODIFIED, so a MODIFIED naming the new
    // header is compared against the renamed block's scenarios. Fall back to
    // the old header, or a rename-plus-modify pair would skip the check.
    const renamedFrom = new Map(
      renamed.map(({ from, to }) => [normalizeRequirementName(to), normalizeRequirementName(from)])
    );

    // Walked, not looked up once: renames chain (A→B then B→C leaves C holding
    // A's block), and the visited set stops a cycle from looping forever. Every
    // name in a rename cycle is also a rename FROM, so the skip above already
    // keeps the walk out of one; the guard stays because the cost of being
    // wrong about that is a hung CLI, not a wrong message.
    const currentBlockFor = (name: string): RequirementBlock | undefined => {
      const visited = new Set<string>();
      let key: string | undefined = name;
      while (key !== undefined && !visited.has(key)) {
        const block = currentBlocks.get(key);
        if (block) return block;
        visited.add(key);
        key = renamedFrom.get(key);
      }
      return undefined;
    };

    // A MODIFIED naming a header the same delta renames away is already
    // reported ("MODIFIED references old name from RENAMED"), and the block it
    // would land on is not the one it names — so any scenario named here would
    // send the author after the wrong requirement.
    const renamedAway = new Set(renamed.map(({ from }) => normalizeRequirementName(from)));

    const issues: ValidationIssue[] = [];
    for (const block of modified) {
      const key = normalizeRequirementName(block.name);
      if (renamedAway.has(key)) continue;
      const current = currentBlockFor(key);
      if (!current) continue;
      const missing = findMissingCurrentScenarios(current, block);
      if (missing.length === 0) continue;
      issues.push({
        level: 'ERROR',
        path: entryPath,
        message:
          `MODIFIED "${block.name}" omits scenario(s) the current spec still has: ` +
          `${missing.map(name => `"${name}"`).join(', ')}. ` +
          'Copy them into the MODIFIED block (a MODIFIED requirement replaces the whole block, so archive refuses to drop them).',
      });
    }
    return issues;
  }

  private formatInvalidMarkerMessage(invalidReason: string): string {
    return `${VALIDATION_MESSAGES.CHANGE_SKIP_SPECS_INVALID_METADATA} (${invalidReason})`;
  }

  private convertZodErrors(error: ZodError): ValidationIssue[] {
    return error.issues.map(err => {
      let message = err.message;
      if (message === VALIDATION_MESSAGES.CHANGE_NO_DELTAS) {
        message = `${message}. ${VALIDATION_MESSAGES.GUIDE_NO_DELTAS}`;
      }
      return {
        level: 'ERROR' as ValidationLevel,
        path: err.path.join('.'),
        message,
      };
    });
  }

  private applySpecRules(spec: Spec, content: string): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    for (const structuralIssue of findMainSpecStructureIssues(content)) {
      issues.push({
        level: 'ERROR',
        path: 'file',
        line: structuralIssue.line,
        message: structuralIssue.message,
      });
    }
    
    // The placeholder is longer than MIN_PURPOSE_LENGTH, so the brevity check
    // below cannot reach it; it is reported on its own terms instead. Checked
    // first because a hand-written "TBD" is both a placeholder and too brief,
    // and only one of those two tells the author what to do. (A "TODO" opening
    // the Purpose reads the same way, so it is the same finding.)
    const placeholder = findPurposePlaceholderIssue(spec.overview, content);
    if (placeholder) {
      issues.push({
        level: 'WARNING',
        path: 'overview',
        line: placeholder.line,
        message: VALIDATION_MESSAGES.PURPOSE_IS_PLACEHOLDER,
      });
    } else if (spec.overview.length < MIN_PURPOSE_LENGTH) {
      issues.push({
        level: 'WARNING',
        path: 'overview',
        message: VALIDATION_MESSAGES.PURPOSE_TOO_BRIEF,
      });
    }
    
    spec.requirements.forEach((req, index) => {
      if (req.text.length > MAX_REQUIREMENT_TEXT_LENGTH) {
        issues.push({
          level: 'INFO',
          path: `requirements[${index}]`,
          message: VALIDATION_MESSAGES.REQUIREMENT_TOO_LONG,
        });
      }

      if (req.scenarios.length === 0) {
        issues.push({
          level: 'WARNING',
          path: `requirements[${index}].scenarios`,
          message: `${VALIDATION_MESSAGES.REQUIREMENT_NO_SCENARIOS}. ${VALIDATION_MESSAGES.GUIDE_SCENARIO_FORMAT}`,
        });
      }
    });

    // SHALL/MUST body-keyword guidance for main specs (#1156, #243). The main-spec
    // parser collapses the requirement header into `text`, so we recover the
    // header+body pairs here (the same source the delta path trusts) and reuse
    // the delta detection. A non-empty body that omits the English keyword gets
    // guidance, while a missing body remains an error. Emitted exactly once per
    // requirement (the Zod refine that used to emit a generic error is removed).
    extractRequirementsSection(content).bodyBlocks.forEach((block, index) => {
      const requirementText = this.extractRequirementText(block.raw);
      if (!requirementText) {
        issues.push({
          level: 'ERROR',
          path: `requirements[${index}]`,
          message: this.buildMissingShallOrMustMessage(`Requirement "${block.name}"`, block.name),
        });
      } else if (!this.containsShallOrMust(requirementText)) {
        issues.push({
          level: 'WARNING',
          path: `requirements[${index}]`,
          message: this.buildMissingShallOrMustMessage(
            `Requirement "${block.name}"`,
            block.name,
            true
          ),
        });
      }
    });

    return issues;
  }

  private applyChangeRules(change: Change, content: string): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    
    const MIN_DELTA_DESCRIPTION_LENGTH = 10;
    
    change.deltas.forEach((delta, index) => {
      if (!delta.description || delta.description.length < MIN_DELTA_DESCRIPTION_LENGTH) {
        issues.push({
          level: 'WARNING',
          path: `deltas[${index}].description`,
          message: VALIDATION_MESSAGES.DELTA_DESCRIPTION_TOO_BRIEF,
        });
      }
      
      if ((delta.operation === 'ADDED' || delta.operation === 'MODIFIED') && 
          (!delta.requirements || delta.requirements.length === 0)) {
        issues.push({
          level: 'WARNING',
          path: `deltas[${index}].requirements`,
          message: `${delta.operation} ${VALIDATION_MESSAGES.DELTA_MISSING_REQUIREMENTS}`,
        });
      }
    });
    
    return issues;
  }

  private enrichTopLevelError(itemId: string, baseMessage: string): string {
    const msg = baseMessage.trim();
    if (msg === VALIDATION_MESSAGES.CHANGE_NO_DELTAS) {
      return `${msg}. ${VALIDATION_MESSAGES.GUIDE_NO_DELTAS}`;
    }
    if (msg.includes('Spec must have a Purpose section') || msg.includes('Spec must have a Requirements section')) {
      return `${msg}. ${VALIDATION_MESSAGES.GUIDE_MISSING_SPEC_SECTIONS}`;
    }
    if (msg.includes('Change must have a Why section') || msg.includes('Change must have a What Changes section')) {
      return `${msg}. ${VALIDATION_MESSAGES.GUIDE_MISSING_CHANGE_SECTIONS}`;
    }
    return msg;
  }

  private extractNameFromPath(filePath: string): string {
    const normalizedPath = FileSystemUtils.toPosixPath(filePath);
    const parts = normalizedPath.split('/');
    
    // Look for the directory name after 'specs' or 'changes'
    for (let i = parts.length - 1; i >= 0; i--) {
      if (parts[i] === 'specs' || parts[i] === 'changes') {
        if (i < parts.length - 1) {
          return parts[i + 1];
        }
      }
    }
    
    // Fallback to filename without extension if not in expected structure
    const fileName = parts[parts.length - 1] ?? '';
    const dotIndex = fileName.lastIndexOf('.');
    return dotIndex > 0 ? fileName.slice(0, dotIndex) : fileName;
  }

  /**
   * Dry-run archive's merge builder without writing its result. Reusing the
   * builder preserves its already-synced delta rules instead of duplicating them.
   * INFO leaves the verdict unchanged: a missing target can be a typo or a
   * requirement introduced by a sibling change that has not archived yet.
   * This does not run archive's later merged-spec validation or retirement checks.
   */
  private async findArchiveBlockers(
    changeDir: string,
    mainSpecsDir: string,
    alreadyReportedPaths: string[]
  ): Promise<ValidationIssue[]> {
    const alreadyReported = new Set(alreadyReportedPaths);
    // Only ever reaches a generated skeleton's placeholder Purpose, which this
    // dry run discards.
    const changeName = path.basename(changeDir);
    const issues: ValidationIssue[] = [];

    for (const update of await findSpecUpdates(changeDir, mainSpecsDir)) {
      // discoverSpecFiles builds both this id and the entryPath the checks
      // above report under, from the same walk.
      const entryPath = `${update.id}/spec.md`;
      // A delta those checks already rejected would be reported twice, the
      // second time in archive's wording rather than the wording that names
      // the actual mistake.
      if (alreadyReported.has(entryPath)) continue;

      try {
        await buildUpdatedSpec(update, changeName, { silent: true });
      } catch (error) {
        // Only the thrown preconditions, which carry no errno. A filesystem
        // error says nothing about whether the delta applies, and `validate
        // --all` reads six changes at once, so a transient EMFILE would report
        // a collision that is not there - the same reason the scenario-loss
        // check above reads only the codes that mean the file is unusable.
        if ((error as NodeJS.ErrnoException)?.code !== undefined) continue;
        issues.push({
          level: 'INFO',
          path: entryPath,
          message: `Archive would refuse this delta: ${
            error instanceof Error ? error.message : String(error)
          }`,
        });
      }
    }

    return issues;
  }

  private createReport(issues: ValidationIssue[]): ValidationReport {
    const errors = issues.filter(i => i.level === 'ERROR').length;
    const warnings = issues.filter(i => i.level === 'WARNING').length;
    const info = issues.filter(i => i.level === 'INFO').length;
    
    const valid = this.strictMode 
      ? errors === 0 && warnings === 0
      : errors === 0;
    
    return {
      valid,
      issues,
      summary: {
        errors,
        warnings,
        info,
      },
    };
  }

  isValid(report: ValidationReport): boolean {
    return report.valid;
  }

  private extractRequirementText(blockRaw: string): string | undefined {
    // Delegate to the shared, fence-/metadata-/multi-line-aware body reader.
    // Validation intentionally does not use the parser/display header-title
    // fallback for canonical `### Requirement:` blocks: #1280 requires a
    // SHALL/MUST that appears only in the header to receive the body-keyword
    // hint. Line 0 is the `### Requirement: ...` header.
    const [, ...bodyLines] = blockRaw.split('\n');
    return extractRequirementBodyShared(bodyLines) || undefined;
  }

  private containsShallOrMust(text: string): boolean {
    return containsShallOrMustShared(text);
  }

  /**
   * Build a message for a requirement block whose body lacks SHALL/MUST.
   *
   * When the SHALL/MUST keyword already appears in the requirement header (e.g.
   * `### Requirement: The system SHALL ...`) the original generic error
   * ("must contain SHALL or MUST") is confusing because the keyword is visibly
   * present in the spec. Per the OpenSpec conventions the keyword has to live
   * on the requirement body line (the line right after the header), so we point
   * the author at that exact fix when the keyword is found in the header only.
   */
  private buildMissingShallOrMustMessage(
    prefix: string,
    blockName: string,
    guidanceOnly = false
  ): string {
    const base = `${prefix} ${guidanceOnly ? 'should' : 'must'} contain SHALL or MUST`;
    const suffix = guidanceOnly ? ' (RFC 2119 best practice for English specs)' : '';
    if (this.containsShallOrMust(blockName)) {
      return `${base} in the requirement body, not only in the header. Move the SHALL/MUST statement to the line immediately after the "### Requirement: ..." header.${suffix}`;
    }
    return `${base}${suffix}`;
  }

  private countScenarios(blockRaw: string): number {
    // Fence-aware count via the shared reader: a `#### Scenario:` inside a fenced
    // example is not a real scenario. Drop the header line (index 0).
    return countScenariosShared(blockRaw.split('\n').slice(1));
  }

  private formatSectionList(sections: string[]): string {
    if (sections.length === 0) return '';
    if (sections.length === 1) return sections[0];
    const head = sections.slice(0, -1);
    const last = sections[sections.length - 1];
    return `${head.join(', ')} and ${last}`;
  }
}
