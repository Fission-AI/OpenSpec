import * as fs from 'fs';
import * as path from 'path';
import chalk from 'chalk';
import { getTaskProgressForChange, formatTaskStatus } from '../utils/task-progress.js';
import { MarkdownParser } from './parsers/markdown-parser.js';

export class ViewCommand {
  async execute(targetPath: string = '.'): Promise<void> {
    const openspecDir = path.join(targetPath, 'openspec');
    
    if (!fs.existsSync(openspecDir)) {
      console.error(chalk.red('No openspec directory found'));
      process.exit(1);
    }

    console.log(chalk.bold('\nOpenSpec Dashboard\n'));
    console.log('═'.repeat(60));

    // Get changes and specs data
    const changesData = await this.getChangesData(openspecDir);
    const specsData = await this.getSpecsData(openspecDir);

    // Display summary metrics
    this.displaySummary(changesData, specsData);

    // Display draft changes
    if (changesData.draft.length > 0) {
      console.log(chalk.bold.gray('\nDraft Changes'));
      console.log('─'.repeat(60));
      changesData.draft.forEach((change) => {
        console.log(`  ${chalk.gray('○')} ${change.name}`);
      });
    }

    // Display active changes
    if (changesData.active.length > 0) {
      console.log(chalk.bold.cyan('\nActive Changes'));
      console.log('─'.repeat(60));
      changesData.active.forEach((change) => {
        const progressBar = this.createProgressBar(change.progress.completed, change.progress.total);
        const percentage =
          change.progress.total > 0
            ? Math.round((change.progress.completed / change.progress.total) * 100)
            : 0;

        console.log(
          `  ${chalk.yellow('◉')} ${chalk.bold(change.name.padEnd(30))} ${progressBar} ${chalk.dim(`${percentage}%`)}`
        );
      });
    }

    // Display completed changes
    if (changesData.completed.length > 0) {
      console.log(chalk.bold.green('\nCompleted Changes'));
      console.log('─'.repeat(60));
      changesData.completed.forEach((change) => {
        console.log(`  ${chalk.green('✓')} ${change.name}`);
      });
    }

    // Display specifications
    if (specsData.length > 0) {
      console.log(chalk.bold.blue('\nSpecifications'));
      console.log('─'.repeat(60));
      
      // Sort specs by requirement count (descending)
      specsData.sort((a, b) => b.requirementCount - a.requirementCount);
      
      specsData.forEach(spec => {
        const reqLabel = spec.requirementCount === 1 ? 'requirement' : 'requirements';
        console.log(
          `  ${chalk.blue('▪')} ${chalk.bold(spec.name.padEnd(30))} ${chalk.dim(`${spec.requirementCount} ${reqLabel}`)}`
        );
      });
    }

    console.log('\n' + '═'.repeat(60));
    console.log(chalk.dim(`\nUse ${chalk.white('openspec list --changes')} or ${chalk.white('openspec list --specs')} for detailed views`));
  }

  private async getChangesData(openspecDir: string): Promise<{
    draft: Array<{ name: string }>;
    active: Array<{ name: string; progress: { total: number; completed: number } }>;
    completed: Array<{ name: string }>;
  }> {
    const changesDir = path.join(openspecDir, 'changes');

    if (!fs.existsSync(changesDir)) {
      return { draft: [], active: [], completed: [] };
    }

    const draft: Array<{ name: string }> = [];
    const active: Array<{ name: string; progress: { total: number; completed: number } }> = [];
    const completed: Array<{ name: string }> = [];

    const entries = fs.readdirSync(changesDir, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.isDirectory() && entry.name !== 'archive') {
        const progress = await getTaskProgressForChange(changesDir, entry.name);

        if (progress.total === 0) {
          // No tasks defined yet - still in planning/draft phase
          draft.push({ name: entry.name });
        } else if (progress.completed === progress.total) {
          // All tasks complete
          completed.push({ name: entry.name });
        } else {
          // Has tasks but not all complete
          active.push({ name: entry.name, progress });
        }
      }
    }

    // Sort all categories by name for deterministic ordering
    draft.sort((a, b) => a.name.localeCompare(b.name));

    // Sort active changes by completion percentage (ascending) and then by name
    active.sort((a, b) => {
      const percentageA = a.progress.total > 0 ? a.progress.completed / a.progress.total : 0;
      const percentageB = b.progress.total > 0 ? b.progress.completed / b.progress.total : 0;

      if (percentageA < percentageB) return -1;
      if (percentageA > percentageB) return 1;
      return a.name.localeCompare(b.name);
    });
    completed.sort((a, b) => a.name.localeCompare(b.name));

    return { draft, active, completed };
  }

  private async getSpecsData(openspecDir: string): Promise<Array<{ name: string; requirementCount: number }>> {
    const specsDir = path.join(openspecDir, 'specs');
    
    if (!fs.existsSync(specsDir)) {
      return [];
    }

    const specs: Array<{ name: string; requirementCount: number }> = [];
    const entries = fs.readdirSync(specsDir, { withFileTypes: true });
    
    for (const entry of entries) {
      if (entry.isDirectory()) {
        const specFile = path.join(specsDir, entry.name, 'spec.md');
        
        if (fs.existsSync(specFile)) {
          try {
            const content = fs.readFileSync(specFile, 'utf-8');
            const parser = new MarkdownParser(content);
            const spec = parser.parseSpec(entry.name);
            const requirementCount = spec.requirements.length;
            specs.push({ name: entry.name, requirementCount });
          } catch (error) {
            // If spec cannot be parsed, include with 0 count
            specs.push({ name: entry.name, requirementCount: 0 });
          }
        }
      }
    }

    return specs;
  }

  private displaySummary(
    changesData: { draft: any[]; active: any[]; completed: any[] },
    specsData: any[]
  ): void {
    const totalChanges =
      changesData.draft.length + changesData.active.length + changesData.completed.length;
    const totalSpecs = specsData.length;
    const totalRequirements = specsData.reduce((sum, spec) => sum + spec.requirementCount, 0);

    // Calculate total task progress
    let totalTasks = 0;
    let completedTasks = 0;

    changesData.active.forEach((change) => {
      totalTasks += change.progress.total;
      completedTasks += change.progress.completed;
    });

    changesData.completed.forEach(() => {
      // Completed changes count as 100% done (we don't know exact task count)
      // This is a simplification
    });

    console.log(chalk.bold('Summary:'));
    console.log(
      `  ${chalk.cyan('●')} Specifications: ${chalk.bold(totalSpecs)} specs, ${chalk.bold(totalRequirements)} requirements`
    );
    if (changesData.draft.length > 0) {
      console.log(`  ${chalk.gray('●')} Draft Changes: ${chalk.bold(changesData.draft.length)}`);
    }
    console.log(
      `  ${chalk.yellow('●')} Active Changes: ${chalk.bold(changesData.active.length)} in progress`
    );
    console.log(`  ${chalk.green('●')} Completed Changes: ${chalk.bold(changesData.completed.length)}`);

    if (totalTasks > 0) {
      const overallProgress = Math.round((completedTasks / totalTasks) * 100);
      console.log(
        `  ${chalk.magenta('●')} Task Progress: ${chalk.bold(`${completedTasks}/${totalTasks}`)} (${overallProgress}% complete)`
      );
    }
  }

  private createProgressBar(completed: number, total: number, width: number = 20): string {
    if (total === 0) return chalk.dim('─'.repeat(width));
    
    const percentage = completed / total;
    const filled = Math.round(percentage * width);
    const empty = width - filled;
    
    const filledBar = chalk.green('█'.repeat(filled));
    const emptyBar = chalk.dim('░'.repeat(empty));
    
    return `[${filledBar}${emptyBar}]`;
  }
}