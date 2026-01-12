import { promises as fs } from 'fs';
import path from 'path';
import { getTaskProgressForChange, formatTaskStatus } from '../utils/task-progress.js';
import chalk from 'chalk';
import { runArchive, ArchiveResult } from './archive-logic.js';
import { findSpecUpdates } from './specs-apply.js';
import { resolveOpenSpecDir } from './path-resolver.js';

export class ArchiveCommand {
  async execute(
    changeName?: string,
    options: { yes?: boolean; skipSpecs?: boolean; noValidate?: boolean; validate?: boolean } = {}
  ): Promise<void> {
    const openspecPath = await resolveOpenSpecDir('.');
    const changesDir = path.join(openspecPath, 'changes');

    // Get change name interactively if not provided
    if (!changeName) {
      const selectedChange = await this.selectChange(changesDir);
      if (!selectedChange) {
        console.log('No change selected. Aborting.');
        return;
      }
      changeName = selectedChange;
    }

    const skipValidation = options.validate === false || options.noValidate === true;
    
    if (skipValidation && !options.yes) {
        const { confirm } = await import('@inquirer/prompts');
        const proceed = await confirm({
          message: chalk.yellow('⚠️  WARNING: Skipping validation may archive invalid specs. Continue? (y/N)'),
          default: false
        });
        if (!proceed) {
          console.log('Archive cancelled.');
          return;
        }
    }

    const progress = await getTaskProgressForChange(changesDir, changeName);
    const incompleteTasks = Math.max(progress.total - progress.completed, 0);
    if (incompleteTasks > 0 && !options.yes) {
        const { confirm } = await import('@inquirer/prompts');
        const proceed = await confirm({
          message: `Warning: ${incompleteTasks} incomplete task(s) found. Continue?`,
          default: false
        });
        if (!proceed) {
          console.log('Archive cancelled.');
          return;
        }
    }

    // Check for spec updates and ask for confirmation
    let runOptions = { ...options, throwOnValidationError: true };
    if (!options.yes && !options.skipSpecs) {
        const changeDir = path.join(changesDir, changeName);
        const mainSpecsDir = path.join(openspecPath, 'specs');
        const updates = await findSpecUpdates(changeDir, mainSpecsDir);
        
        if (updates.length > 0) {
            const { confirm } = await import('@inquirer/prompts');
            const applyUpdates = await confirm({
                message: `Found ${updates.length} spec update(s). Apply them?`,
                default: true
            });
            
            if (!applyUpdates) {
                runOptions.skipSpecs = true;
            }
        }
    }

    let result: ArchiveResult;
    try {
      result = await runArchive(changeName, runOptions);
    } catch (error: any) {
      if (error.name === 'ValidationError' && error.report) {
        console.log(chalk.red(`\nValidation failed for '${changeName}':`));
        for (const issue of error.report.issues) {
          if (issue.level === 'ERROR') {
            console.log(chalk.red(`  ✗ ${issue.message}`));
          } else if (issue.level === 'WARNING') {
            console.log(chalk.yellow(`  ⚠ ${issue.message}`));
          }
        }
      } else {
        console.log(error.message || error);
      }
      console.log('Aborted. No files were changed.');
      return;
    }

    if (result.alreadyExists) {
      throw new Error(`Archive '${result.archiveName}' already exists.`);
    }

    if (result.validationReport && !result.validationReport.valid) {
        console.log(chalk.red(`\nValidation failed for '${changeName}':`));
        for (const issue of result.validationReport.issues) {
            if (issue.level === 'ERROR') {
                console.log(chalk.red(`  ✗ ${issue.message}`));
            } else if (issue.level === 'WARNING') {
                console.log(chalk.yellow(`  ⚠ ${issue.message}`));
            }
        }
        return;
    }

    console.log(`Task status: ${formatTaskStatus(result.taskStatus)}`);
    
    if (result.specUpdates.length > 0) {
        console.log('\nSpecs updated:');
        for (const update of result.specUpdates) {
            console.log(`  ${update.capability}: ${update.status}`);
        }
        console.log(
            `Totals: + ${result.totals.added}, ~ ${result.totals.modified}, - ${result.totals.removed}, → ${result.totals.renamed}`
        );
    }

    console.log(`Change '${changeName}' archived as '${result.archiveName}'.`);
  }

  private async selectChange(changesDir: string): Promise<string | null> {
    const { select } = await import('@inquirer/prompts');
    // Get all directories in changes (excluding archive)
    const entries = await fs.readdir(changesDir, { withFileTypes: true });
    const changeDirs = entries
      .filter(entry => entry.isDirectory() && entry.name !== 'archive')
      .map(entry => entry.name)
      .sort();

    if (changeDirs.length === 0) {
      console.log('No active changes found.');
      return null;
    }

    // Build choices with progress inline to avoid duplicate lists
    let choices: Array<{ name: string; value: string }> = changeDirs.map(name => ({ name, value: name }));
    try {
      const progressList: Array<{ id: string; status: string }> = [];
      for (const id of changeDirs) {
        const progress = await getTaskProgressForChange(changesDir, id);
        const status = formatTaskStatus(progress);
        progressList.push({ id, status });
      }
      const nameWidth = Math.max(...progressList.map(p => p.id.length));
      choices = progressList.map(p => ({
        name: `${p.id.padEnd(nameWidth)}     ${p.status}`,
        value: p.id
      }));
    } catch {
      // If anything fails, fall back to simple names
      choices = changeDirs.map(name => ({ name, value: name }));
    }

    try {
      const answer = await select({
        message: 'Select a change to archive',
        choices
      });
      return answer;
    } catch (error) {
      // User cancelled (Ctrl+C)
      return null;
    }
  }
}
