import * as fs from 'fs';
import * as path from 'path';
import chalk from 'chalk';
import { getTaskProgressForChange, formatTaskStatus } from '../utils/task-progress.js';
import { MarkdownParser } from './parsers/markdown-parser.js';
import { discoverSpecFiles } from '../utils/spec-discovery.js';

export class ViewCommand {
  async execute(targetPath: string = '.'): Promise<void> {
    const openspecDir = path.join(targetPath, 'openspec');
    
    if (!fs.existsSync(openspecDir)) {
      console.error(chalk.red('未找到 openspec 目录'));
      process.exit(1);
    }

    console.log(chalk.bold('\nOpenSpec 仪表盘\n'));
    console.log('═'.repeat(60));

    // 获取 changes 和 specs 数据
    const changesData = await this.getChangesData(openspecDir);
    const specsData = await this.getSpecsData(openspecDir);

    // 显示汇总指标
    this.displaySummary(changesData, specsData);

    // 显示草稿 change
    if (changesData.draft.length > 0) {
      console.log(chalk.bold.gray('\n草稿 Changes'));
      console.log('─'.repeat(60));
      changesData.draft.forEach((change) => {
        console.log(`  ${chalk.gray('○')} ${change.name}`);
      });
    }

    // 显示活动 change
    if (changesData.active.length > 0) {
      console.log(chalk.bold.cyan('\n活动 Changes'));
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

    // 显示已完成的 change
    if (changesData.completed.length > 0) {
      console.log(chalk.bold.green('\n已完成 Changes'));
      console.log('─'.repeat(60));
      changesData.completed.forEach((change) => {
        console.log(`  ${chalk.green('✓')} ${change.name}`);
      });
    }

    // 显示规格
    if (specsData.length > 0) {
      console.log(chalk.bold.blue('\n规格'));
      console.log('─'.repeat(60));
      
      // 按需求数量排序（降序）
      specsData.sort((a, b) => b.requirementCount - a.requirementCount);
      
      specsData.forEach(spec => {
        const reqLabel = spec.requirementCount === 1 ? '需求' : '需求';
        console.log(
          `  ${chalk.blue('▪')} ${chalk.bold(spec.name.padEnd(30))} ${chalk.dim(`${spec.requirementCount} ${reqLabel}`)}`
        );
      });
    }

    console.log('\n' + '═'.repeat(60));
    console.log(chalk.dim(`\n使用 ${chalk.white('openspec list --changes')} 或 ${chalk.white('openspec list --specs')} 查看详细信息`));
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
        const progress = await getTaskProgressForChange(changesDir, entry.name, path.dirname(openspecDir));

        if (progress.total === 0) {
          // 尚未定义任务 — 仍在规划/草稿阶段
          draft.push({ name: entry.name });
        } else if (progress.completed === progress.total) {
          // 所有任务完成
          completed.push({ name: entry.name });
        } else {
          // 有任务但未全部完成
          active.push({ name: entry.name, progress });
        }
      }
    }

    // 按名称排序所有类别以确保顺序确定
    draft.sort((a, b) => a.name.localeCompare(b.name));

    // 按完成百分比排序活动 change（升序），然后按名称
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

    for (const { id, specFile } of await discoverSpecFiles(specsDir)) {
      try {
        const content = fs.readFileSync(specFile, 'utf-8');
        const parser = new MarkdownParser(content);
        const spec = parser.parseSpec(id);
        const requirementCount = spec.requirements.length;
        specs.push({ name: id, requirementCount });
      } catch (error) {
        // 如果 spec 无法解析，包含它但计数为 0
        specs.push({ name: id, requirementCount: 0 });
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

    // 计算总任务进度
    let totalTasks = 0;
    let completedTasks = 0;

    changesData.active.forEach((change) => {
      totalTasks += change.progress.total;
      completedTasks += change.progress.completed;
    });

    changesData.completed.forEach(() => {
      // 已完成的 change 计为 100% 完成（我们不知道确切任务数）
      // 这是一个简化处理
    });

    console.log(chalk.bold('汇总：'));
    console.log(
      `  ${chalk.cyan('●')} 规格：${chalk.bold(totalSpecs)} 个 specs，${chalk.bold(totalRequirements)} 个需求`
    );
    if (changesData.draft.length > 0) {
      console.log(`  ${chalk.gray('●')} 草稿 Changes：${chalk.bold(changesData.draft.length)}`);
    }
    console.log(
      `  ${chalk.yellow('●')} 活动 Changes：${chalk.bold(changesData.active.length)} 进行中`
    );
    console.log(`  ${chalk.green('●')} 已完成 Changes：${chalk.bold(changesData.completed.length)}`);

    if (totalTasks > 0) {
      const overallProgress = Math.round((completedTasks / totalTasks) * 100);
      console.log(
        `  ${chalk.magenta('●')} 任务进度：${chalk.bold(`${completedTasks}/${totalTasks}`)}（${overallProgress}% 完成）`
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