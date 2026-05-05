import { promises as fs } from 'fs';
import path from 'path';
import chalk from 'chalk';
import { JsonConverter } from '../core/converters/json-converter.js';
import { Validator } from '../core/validation/validator.js';
import { ChangeParser } from '../core/parsers/change-parser.js';
import { Change } from '../core/schemas/index.js';
import { isInteractive } from '../utils/interactive.js';
import { getActiveChangeIds } from '../utils/item-discovery.js';
import {
  parseDeltaSpec,
  normalizeRequirementName,
} from '../core/parsers/requirement-blocks.js';
import {
  extractRequirementBlock,
  diffRequirementBlock,
  buildRenameMap,
} from '../utils/requirement-diff.js';

// Constants for better maintainability
const ARCHIVE_DIR = 'archive';
const TASK_PATTERN = /^[-*]\s+\[[\sx]\]/i;
const COMPLETED_TASK_PATTERN = /^[-*]\s+\[x\]/i;

interface DiffResult {
  capability: string;
  operation: string;
  requirementName: string;
  raw: string;
  diff?: string;
  rename?: { from: string; to: string };
  warning?: string;
}

export class ChangeCommand {
  private converter: JsonConverter;

  constructor() {
    this.converter = new JsonConverter();
  }

  /**
   * Show a change proposal.
   * - Text mode: raw markdown passthrough (no filters)
   * - JSON mode: minimal object with deltas; --deltas-only returns same object with filtered deltas
   *   Note: --requirements-only is deprecated alias for --deltas-only
   * - --diff mode: per-requirement diffs of delta specs against base specs
   */
  async show(changeName?: string, options?: { json?: boolean; requirementsOnly?: boolean; deltasOnly?: boolean; diff?: boolean; noInteractive?: boolean }): Promise<void> {
    const changesPath = path.join(process.cwd(), 'openspec', 'changes');

    if (!changeName) {
      const canPrompt = isInteractive(options);
      const changes = await this.getActiveChanges(changesPath);
      if (canPrompt && changes.length > 0) {
        const { select } = await import('@inquirer/prompts');
        const selected = await select({
          message: 'Select a change to show',
          choices: changes.map(id => ({ name: id, value: id })),
        });
        changeName = selected;
      } else {
        if (changes.length === 0) {
          console.error('No change specified. No active changes found.');
        } else {
          console.error(`No change specified. Available IDs: ${changes.join(', ')}`);
        }
        console.error('Hint: use "openspec change list" to view available changes.');
        process.exitCode = 1;
        return;
      }
    }

    const proposalPath = path.join(changesPath, changeName, 'proposal.md');

    try {
      await fs.access(proposalPath);
    } catch {
      throw new Error(`Change "${changeName}" not found at ${proposalPath}`);
    }

    if (options?.json) {
      const jsonOutput = await this.converter.convertChangeToJson(proposalPath);

      if (options.requirementsOnly) {
        console.error('Flag --requirements-only is deprecated; use --deltas-only instead.');
      }

      const parsed: Change = JSON.parse(jsonOutput);
      const contentForTitle = await fs.readFile(proposalPath, 'utf-8');
      const title = this.extractTitle(contentForTitle, changeName);
      const id = parsed.name;
      const deltas = parsed.deltas || [];

      if (options.diff) {
        await this.enrichDeltasWithDiffs(deltas, changeName, changesPath);
      }

      const output = options.requirementsOnly || options.deltasOnly
        ? { id, title, deltaCount: deltas.length, deltas }
        : { id, title, deltaCount: deltas.length, deltas };
      console.log(JSON.stringify(output, null, 2));
    } else {
      // Text mode: show proposal, then specs (full content or diffs)
      const content = await fs.readFile(proposalPath, 'utf-8');
      console.log(content);

      if (options?.diff) {
        await this.showSpecDiffs(changeName, changesPath);
      } else {
        await this.showSpecContent(changeName, changesPath);
      }
    }
  }

  /**
   * Add `diff` and `warning` fields to MODIFIED deltas by computing per-requirement
   * diffs against base specs. Mutates the deltas array in place.
   *
   * The parsed Delta objects store requirement body text in `description`, not the
   * header name. We re-parse the spec files with parseDeltaSpec to get the header
   * names and raw blocks, then match by spec + operation order.
   */
  private async enrichDeltasWithDiffs(deltas: any[], changeName: string, changesPath: string): Promise<void> {
    const changeDir = path.join(changesPath, changeName);
    const specsDir = path.join(changeDir, 'specs');
    const mainSpecsDir = path.join(process.cwd(), 'openspec', 'specs');

    // Group deltas by spec name so we can match them to parsed blocks
    const deltasBySpec = new Map<string, any[]>();
    for (const delta of deltas) {
      if (!delta.spec || delta.operation !== 'MODIFIED') continue;
      const list = deltasBySpec.get(delta.spec) ?? [];
      list.push(delta);
      deltasBySpec.set(delta.spec, list);
    }

    for (const [capName, modifiedDeltas] of deltasBySpec) {
      const deltaSpecPath = path.join(specsDir, capName, 'spec.md');
      let deltaContent: string;
      try {
        deltaContent = await fs.readFile(deltaSpecPath, 'utf-8');
      } catch {
        continue;
      }

      const baseSpecPath = path.join(mainSpecsDir, capName, 'spec.md');
      let baseContent: string | null = null;
      try {
        baseContent = await fs.readFile(baseSpecPath, 'utf-8');
      } catch {
        // No base spec — new capability
      }

      const plan = parseDeltaSpec(deltaContent);
      const renameMap = buildRenameMap(plan.renamed);

      // Match parsed Delta objects to RequirementBlocks by position order —
      // ChangeParser creates one Delta per MODIFIED block in source order
      for (let i = 0; i < modifiedDeltas.length && i < plan.modified.length; i++) {
        const delta = modifiedDeltas[i];
        const block = plan.modified[i];

        const normalizedName = normalizeRequirementName(block.name).toLowerCase();
        const oldName = renameMap.get(normalizedName);
        const lookupName = oldName ?? block.name;

        if (baseContent) {
          const baseBlock = extractRequirementBlock(baseContent, lookupName);
          if (baseBlock) {
            delta.diff = diffRequirementBlock(baseBlock, block.raw, `${capName}/${block.name}`);
          } else {
            delta.warning = `No matching base requirement found for "${block.name}" in ${capName}`;
          }
        } else {
          delta.diff = diffRequirementBlock(null, block.raw, `${capName}/${block.name}`);
        }
      }
    }
  }

  /**
   * Text-mode: show full delta spec content, grouped by capability.
   */
  private async showSpecContent(changeName: string, changesPath: string): Promise<void> {
    const changeDir = path.join(changesPath, changeName);
    const specsDir = path.join(changeDir, 'specs');

    let specDirs: string[];
    try {
      const entries = await fs.readdir(specsDir, { withFileTypes: true });
      specDirs = entries.filter(e => e.isDirectory()).map(e => e.name).sort();
    } catch {
      return;
    }

    if (specDirs.length === 0) return;

    console.log();
    console.log(chalk.bold('Specifications Changed'));
    console.log();

    for (const capName of specDirs) {
      const deltaSpecPath = path.join(specsDir, capName, 'spec.md');
      try {
        const content = await fs.readFile(deltaSpecPath, 'utf-8');
        console.log(chalk.bold.underline(capName));
        console.log();
        console.log(content.trimEnd());
        console.log();
      } catch {
        continue;
      }
    }
  }

  /**
   * Text-mode: show per-requirement diffs of delta specs against base specs.
   */
  private async showSpecDiffs(changeName: string, changesPath: string): Promise<void> {
    const changeDir = path.join(changesPath, changeName);
    const specsDir = path.join(changeDir, 'specs');
    const mainSpecsDir = path.join(process.cwd(), 'openspec', 'specs');

    let specDirs: string[];
    try {
      const entries = await fs.readdir(specsDir, { withFileTypes: true });
      specDirs = entries.filter(e => e.isDirectory()).map(e => e.name).sort();
    } catch {
      specDirs = [];
    }

    if (specDirs.length === 0) {
      return;
    }

    console.log();
    console.log(chalk.bold('Specifications Changed (diffs)'));
    console.log();

    const results: DiffResult[] = [];

    for (const capName of specDirs) {
      const deltaSpecPath = path.join(specsDir, capName, 'spec.md');
      let deltaContent: string;
      try {
        deltaContent = await fs.readFile(deltaSpecPath, 'utf-8');
      } catch {
        continue;
      }

      const baseSpecPath = path.join(mainSpecsDir, capName, 'spec.md');
      let baseContent: string | null = null;
      try {
        baseContent = await fs.readFile(baseSpecPath, 'utf-8');
      } catch {
        // No base spec — new capability
      }

      const plan = parseDeltaSpec(deltaContent);
      const renameMap = buildRenameMap(plan.renamed);

      for (const block of plan.added) {
        results.push({ capability: capName, operation: 'ADDED', requirementName: block.name, raw: block.raw });
      }

      for (const name of plan.removed) {
        results.push({ capability: capName, operation: 'REMOVED', requirementName: name, raw: `### Requirement: ${name}` });
      }

      for (const r of plan.renamed) {
        results.push({ capability: capName, operation: 'RENAMED', requirementName: r.to, raw: '', rename: r });
      }

      for (const block of plan.modified) {
        const entry: DiffResult = { capability: capName, operation: 'MODIFIED', requirementName: block.name, raw: block.raw };

        const normalizedName = normalizeRequirementName(block.name).toLowerCase();
        const oldName = renameMap.get(normalizedName);
        const lookupName = oldName ?? block.name;

        if (baseContent) {
          const baseBlock = extractRequirementBlock(baseContent, lookupName);
          if (baseBlock) {
            entry.diff = diffRequirementBlock(baseBlock, block.raw, `${capName}/${block.name}`);
          } else {
            entry.warning = `No matching base requirement found for "${block.name}" in ${capName}`;
          }
        } else {
          entry.diff = diffRequirementBlock(null, block.raw, `${capName}/${block.name}`);
        }

        results.push(entry);
      }
    }

    this.printDiffText(results);
  }

  private printDiffText(results: DiffResult[]): void {
    let currentCap = '';

    for (const r of results) {
      if (r.capability !== currentCap) {
        if (currentCap) console.log();
        currentCap = r.capability;
        console.log(chalk.bold.underline(currentCap));
        console.log();
      }

      switch (r.operation) {
        case 'ADDED':
          console.log(chalk.green.bold(`  ADDED: ${r.requirementName}`));
          for (const line of r.raw.split('\n')) {
            console.log(chalk.green(`    ${line}`));
          }
          console.log();
          break;

        case 'REMOVED':
          console.log(chalk.red.bold(`  REMOVED: ${r.requirementName}`));
          console.log();
          break;

        case 'RENAMED':
          console.log(chalk.cyan.bold(`  RENAMED: ${r.rename?.from} → ${r.rename?.to}`));
          console.log();
          break;

        case 'MODIFIED':
          console.log(chalk.yellow.bold(`  MODIFIED: ${r.requirementName}`));
          if (r.warning) {
            console.log(chalk.yellow(`    ⚠ ${r.warning}`));
            for (const line of r.raw.split('\n')) {
              console.log(`    ${line}`);
            }
          } else if (r.diff) {
            for (const line of r.diff.split('\n')) {
              if (line.startsWith('+')) {
                console.log(chalk.green(`    ${line}`));
              } else if (line.startsWith('-')) {
                console.log(chalk.red(`    ${line}`));
              } else {
                console.log(`    ${line}`);
              }
            }
          }
          console.log();
          break;
      }
    }
  }

  /**
   * List active changes.
   * - Text default: IDs only; --long prints minimal details (title, counts)
   * - JSON: array of { id, title, deltaCount, taskStatus }, sorted by id
   */
  async list(options?: { json?: boolean; long?: boolean }): Promise<void> {
    const changesPath = path.join(process.cwd(), 'openspec', 'changes');
    
    const changes = await this.getActiveChanges(changesPath);
    
    if (options?.json) {
      const changeDetails = await Promise.all(
        changes.map(async (changeName) => {
          const proposalPath = path.join(changesPath, changeName, 'proposal.md');
          const tasksPath = path.join(changesPath, changeName, 'tasks.md');
          
          try {
            const content = await fs.readFile(proposalPath, 'utf-8');
            const changeDir = path.join(changesPath, changeName);
            const parser = new ChangeParser(content, changeDir);
            const change = await parser.parseChangeWithDeltas(changeName);
            
            let taskStatus = { total: 0, completed: 0 };
            try {
              const tasksContent = await fs.readFile(tasksPath, 'utf-8');
              taskStatus = this.countTasks(tasksContent);
            } catch (error) {
              // Tasks file may not exist, which is okay
              if (process.env.DEBUG) {
                console.error(`Failed to read tasks file at ${tasksPath}:`, error);
              }
            }
            
            return {
              id: changeName,
              title: this.extractTitle(content, changeName),
              deltaCount: change.deltas.length,
              taskStatus,
            };
          } catch (error) {
            return {
              id: changeName,
              title: 'Unknown',
              deltaCount: 0,
              taskStatus: { total: 0, completed: 0 },
            };
          }
        })
      );
      
      const sorted = changeDetails.sort((a, b) => a.id.localeCompare(b.id));
      console.log(JSON.stringify(sorted, null, 2));
    } else {
      if (changes.length === 0) {
        console.log('No items found');
        return;
      }
      const sorted = [...changes].sort();
      if (!options?.long) {
        // IDs only
        sorted.forEach(id => console.log(id));
        return;
      }

      // Long format: id: title and minimal counts
      for (const changeName of sorted) {
        const proposalPath = path.join(changesPath, changeName, 'proposal.md');
        const tasksPath = path.join(changesPath, changeName, 'tasks.md');
        try {
          const content = await fs.readFile(proposalPath, 'utf-8');
          const title = this.extractTitle(content, changeName);
          let taskStatusText = '';
          try {
            const tasksContent = await fs.readFile(tasksPath, 'utf-8');
            const { total, completed } = this.countTasks(tasksContent);
            taskStatusText = ` [tasks ${completed}/${total}]`;
          } catch (error) {
            if (process.env.DEBUG) {
              console.error(`Failed to read tasks file at ${tasksPath}:`, error);
            }
          }
          const changeDir = path.join(changesPath, changeName);
          const parser = new ChangeParser(await fs.readFile(proposalPath, 'utf-8'), changeDir);
          const change = await parser.parseChangeWithDeltas(changeName);
          const deltaCountText = ` [deltas ${change.deltas.length}]`;
          console.log(`${changeName}: ${title}${deltaCountText}${taskStatusText}`);
        } catch {
          console.log(`${changeName}: (unable to read)`);
        }
      }
    }
  }

  async validate(changeName?: string, options?: { strict?: boolean; json?: boolean; noInteractive?: boolean }): Promise<void> {
    const changesPath = path.join(process.cwd(), 'openspec', 'changes');
    
    if (!changeName) {
      const canPrompt = isInteractive(options);
      const changes = await getActiveChangeIds();
      if (canPrompt && changes.length > 0) {
        const { select } = await import('@inquirer/prompts');
        const selected = await select({
          message: 'Select a change to validate',
          choices: changes.map(id => ({ name: id, value: id })),
        });
        changeName = selected;
      } else {
        if (changes.length === 0) {
          console.error('No change specified. No active changes found.');
        } else {
          console.error(`No change specified. Available IDs: ${changes.join(', ')}`);
        }
        console.error('Hint: use "openspec change list" to view available changes.');
        process.exitCode = 1;
        return;
      }
    }
    
    const changeDir = path.join(changesPath, changeName);
    
    try {
      await fs.access(changeDir);
    } catch {
      throw new Error(`Change "${changeName}" not found at ${changeDir}`);
    }
    
    const validator = new Validator(options?.strict || false);
    const report = await validator.validateChangeDeltaSpecs(changeDir);
    
    if (options?.json) {
      console.log(JSON.stringify(report, null, 2));
    } else {
      if (report.valid) {
        console.log(`Change "${changeName}" is valid`);
      } else {
        console.error(`Change "${changeName}" has issues`);
        report.issues.forEach(issue => {
          const label = issue.level === 'ERROR' ? 'ERROR' : 'WARNING';
          const prefix = issue.level === 'ERROR' ? '✗' : '⚠';
          console.error(`${prefix} [${label}] ${issue.path}: ${issue.message}`);
        });
        // Next steps footer to guide fixing issues
        this.printNextSteps();
        if (!options?.json) {
          process.exitCode = 1;
        }
      }
    }
  }

  private async getActiveChanges(changesPath: string): Promise<string[]> {
    try {
      const entries = await fs.readdir(changesPath, { withFileTypes: true });
      const result: string[] = [];
      for (const entry of entries) {
        if (!entry.isDirectory() || entry.name.startsWith('.') || entry.name === ARCHIVE_DIR) continue;
        const proposalPath = path.join(changesPath, entry.name, 'proposal.md');
        try {
          await fs.access(proposalPath);
          result.push(entry.name);
        } catch {
          // skip directories without proposal.md
        }
      }
      return result.sort();
    } catch {
      return [];
    }
  }

  private extractTitle(content: string, changeName: string): string {
    const match = content.match(/^#\s+(?:Change:\s+)?(.+)$/im);
    return match ? match[1].trim() : changeName;
  }

  private countTasks(content: string): { total: number; completed: number } {
    const lines = content.split('\n');
    let total = 0;
    let completed = 0;
    
    for (const line of lines) {
      if (line.match(TASK_PATTERN)) {
        total++;
        if (line.match(COMPLETED_TASK_PATTERN)) {
          completed++;
        }
      }
    }
    
    return { total, completed };
  }

  private printNextSteps(): void {
    const bullets: string[] = [];
    bullets.push('- Ensure change has deltas in specs/: use headers ## ADDED/MODIFIED/REMOVED/RENAMED Requirements');
    bullets.push('- Each requirement MUST include at least one #### Scenario: block');
    bullets.push('- Debug parsed deltas: openspec change show <id> --json --deltas-only');
    console.error('Next steps:');
    bullets.forEach(b => console.error(`  ${b}`));
  }
}
