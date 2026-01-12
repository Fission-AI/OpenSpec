import chalk from 'chalk';
import { getViewData, DashboardData } from './view-logic.js';

export class ViewCommand {
  async execute(targetPath: string = '.'): Promise<void> {
    try {
        const data = await getViewData(targetPath);

        console.log(chalk.bold('\nOpenSpec Dashboard\n'));
        console.log('═'.repeat(60));

        // Display summary metrics
        this.displaySummary(data.changes, data.specs);

        // Display draft changes
        if (data.changes.draft.length > 0) {
          console.log(chalk.bold.gray('\nDraft Changes'));
          console.log('─'.repeat(60));
          data.changes.draft.forEach((change) => {
            console.log(`  ${chalk.gray('○')} ${change.name}`);
          });
        }

        // Display active changes
        if (data.changes.active.length > 0) {
          console.log(chalk.bold.cyan('\nActive Changes'));
          console.log('─'.repeat(60));
          data.changes.active.forEach((change) => {
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
        if (data.changes.completed.length > 0) {
          console.log(chalk.bold.green('\nCompleted Changes'));
          console.log('─'.repeat(60));
          data.changes.completed.forEach((change) => {
            console.log(`  ${chalk.green('✓')} ${change.name}`);
          });
        }

        // Display specifications
        if (data.specs.length > 0) {
          console.log(chalk.bold.blue('\nSpecifications'));
          console.log('─'.repeat(60));
          
          // Sort specs by requirement count (descending)
          const sortedSpecs = [...data.specs].sort((a, b) => b.requirementCount - a.requirementCount);
          
          sortedSpecs.forEach(spec => {
            const reqLabel = spec.requirementCount === 1 ? 'requirement' : 'requirements';
            console.log(
              `  ${chalk.blue('▪')} ${chalk.bold(spec.name.padEnd(30))} ${chalk.dim(`${spec.requirementCount} ${reqLabel}`)}`
            );
          });
        }

        console.log('\n' + '═'.repeat(60));
        console.log(chalk.dim(`\nUse ${chalk.white('openspec list --changes')} or ${chalk.white('openspec list --specs')} for detailed views`));
    } catch (error: any) {
        console.error(chalk.red(error.message));
        process.exit(1);
    }
  }

  private displaySummary(
    changesData: DashboardData['changes'],
    specsData: DashboardData['specs']
  ): void {
    const totalSpecs = specsData.length;
    const totalRequirements = specsData.reduce((sum, spec) => sum + spec.requirementCount, 0);

    // Calculate total task progress
    let totalTasks = 0;
    let completedTasks = 0;

    changesData.active.forEach((change) => {
      totalTasks += change.progress.total;
      completedTasks += change.progress.completed;
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