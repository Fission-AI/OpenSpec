import { promises as fs } from 'fs';
import path from 'path';
import { JsonConverter } from '../core/converters/json-converter.js';
import { Validator } from '../core/validation/validator.js';
import { VALIDATION_MESSAGES } from '../core/validation/constants.js';
import { ChangeParser } from '../core/parsers/change-parser.js';
import { Change } from '../core/schemas/index.js';
import type { RootOutput } from '../core/root-selection.js';
import { isInteractive } from '../utils/interactive.js';
import { getActiveChangeIds } from '../utils/item-discovery.js';
import { getTaskProgressForChange } from '../utils/task-progress.js';
import { FileSystemUtils } from '../utils/file-system.js';

/**
 * 仅当 `target` 明确不存在时才返回 true。EACCES 或 I/O 失败
 * 表示无法确定存在性，因此调用者会进入读取错误路径，而不是
 * 声称文件从未被写入。
 */
async function isDefinitelyMissing(target: string): Promise<boolean> {
  return fs
    .access(target)
    .then(() => false)
    .catch((error: NodeJS.ErrnoException) => error?.code === 'ENOENT');
}

/**
 * change 是 changes/ 下的直接子目录。在此拒绝其他任何内容
 * 可防止遍历名称（`../..`）读取 changes 目录外的提案，
 * 并保持缺失的提案提示真实。
 */
function isChangeDirectoryName(changesPath: string, changeDir: string): boolean {
  return path.dirname(path.resolve(changeDir)) === path.resolve(changesPath);
}

export class ChangeCommand {
  private converter: JsonConverter;
  private rootPath?: string;

  // rootPath 仅由根感知调用者（顶层 `show`）设置；
  // 已弃用的名词形式命令保持基于 cwd。
  constructor(rootPath?: string) {
    this.converter = new JsonConverter();
    this.rootPath = rootPath;
  }

  private getChangesPath(): string {
    return path.join(this.rootPath ?? process.cwd(), 'openspec', 'changes');
  }

  /**
   * 显示变更提案。
   * - 文本模式：原始 markdown 透传（无过滤器）
   * - JSON 模式：包含增量的最小对象；--deltas-only 返回相同对象（过滤增量）
   *   注意：--requirements-only 是 --deltas-only 的已弃用别名
   */
  async show(changeName?: string, options?: { json?: boolean; requirementsOnly?: boolean; deltasOnly?: boolean; noInteractive?: boolean; rootOutput?: RootOutput }): Promise<void> {
    const changesPath = this.getChangesPath();

    if (!changeName) {
      const canPrompt = isInteractive(options);
      // 恰好提供 `show <name>` 能解析的变更。
      const changes = await getActiveChangeIds(this.rootPath ?? process.cwd());
      if (canPrompt && changes.length > 0) {
        const { select } = await import('@inquirer/prompts');
        const selected = await select({
          message: '选择要显示的变更',
          choices: changes.map(id => ({ name: id, value: id })),
        });
        changeName = selected;
      } else {
        if (changes.length === 0) {
          console.error('未指定变更。未找到活动变更。');
        } else {
          console.error(`未指定变更。可用 ID：${changes.join(', ')}`);
        }
        console.error('提示：使用 "openspec change list" 查看可用变更。');
        process.exitCode = 1;
        return;
      }
    }

    const changeDir = path.join(changesPath, changeName);
    const proposalPath = path.join(changeDir, 'proposal.md');

    if (!isChangeDirectoryName(changesPath, changeDir)) {
      throw new Error(`未找到 change "${changeName}"，路径：${proposalPath}`);
    }

    try {
      await fs.access(proposalPath);
    } catch {
      // change 可以在没有 proposal 的情况下存在：`openspec new change` 仅搭建
      // .openspec.yaml 的脚手架，自定义 schema 也不必定义 proposal 制品。
      // 请说明这两种情况中的哪一种，而不是报告一个确实存在的 change 为
      // 缺失。changes/ 下的孤立文件不是 change，将其命名为 change 会引导
      // 用户使用无法工作的 `status --change` 命令。
      const isChangeDirectory = await fs
        .stat(changeDir)
        .then((stats) => stats.isDirectory())
        .catch(() => false);
      if (isChangeDirectory) {
        throw new Error(
          `change "${changeName}" 尚未有 proposal.md。` +
            `运行 "openspec status --change ${changeName}" 查看接下来需要哪个制品。`
        );
      }
      throw new Error(`未找到 change "${changeName}"，路径：${proposalPath}`);
    }
    FileSystemUtils.assertPathWithin(path.dirname(proposalPath), proposalPath);

    if (options?.json) {
      FileSystemUtils.assertPathWithin(changeDir, proposalPath);
      const jsonOutput = await this.converter.convertChangeToJson(proposalPath);

      if (options.requirementsOnly) {
        console.error('标志 --requirements-only 已弃用；请改用 --deltas-only。');
      }

      const parsed: Change = JSON.parse(jsonOutput);
      FileSystemUtils.assertPathWithin(changeDir, proposalPath);
      const contentForTitle = await fs.readFile(proposalPath, 'utf-8');
      const title = this.extractTitle(contentForTitle, changeName);
      const id = parsed.name;
      const deltas = parsed.deltas || [];

      const output = {
        id,
        title,
        deltaCount: deltas.length,
        deltas,
        ...(options.rootOutput ? { root: options.rootOutput } : {}),
      };
      console.log(JSON.stringify(output, null, 2));
    } else {
      FileSystemUtils.assertPathWithin(changeDir, proposalPath);
      const content = await fs.readFile(proposalPath, 'utf-8');
      console.log(content);
    }
  }

  /**
   * 列出活动 change。
   * - 文本默认：仅显示 ID；--long 打印最小详情（标题、计数）
   * - JSON：{ id, title, deltaCount, taskStatus } 数组，按 ID 排序
   */
  async list(options?: { json?: boolean; long?: boolean }): Promise<void> {
    const changesPath = path.join(process.cwd(), 'openspec', 'changes');
    
    // 与 `openspec list` 相同的基于目录的解析方式，该命令是此已弃用别名
    // 指向的用户入口。下面的每个输出路径都已能容忍缺失或无法读取
    // proposal.md 的 change。
    const changes = await getActiveChangeIds();

    if (options?.json) {
      const changeDetails = await Promise.all(
        changes.map(async (changeName) => {
          const changeDir = path.join(changesPath, changeName);
          const proposalPath = path.join(changeDir, 'proposal.md');

          // 通过共享的已追踪任务辅助器解析任务进度，确保此已弃用的
          // 名词形式列表不会重新分叉解析逻辑（#1202）。任务独立于
          // proposal：change 可以在有或没有 proposal.md 的情况下携带任务。
          const taskStatus = await getTaskProgressForChange(changesPath, changeName, process.cwd());

          // 尚无 proposal 是普通状态（脚手架搭建的 change，或不含
          // proposal 制品的 schema），因此以 change 命名而不是标记为
          // Unknown。Unknown 用于存在但无法读取或解析的 proposal。
          if (await isDefinitelyMissing(proposalPath)) {
            return { id: changeName, title: changeName, deltaCount: 0, taskStatus };
          }

          try {
            FileSystemUtils.assertPathWithin(changeDir, proposalPath);
            const content = await fs.readFile(proposalPath, 'utf-8');
            const parser = new ChangeParser(content, changeDir);
            const change = await parser.parseChangeWithDeltas(changeName);

            return {
              id: changeName,
              title: this.extractTitle(content, changeName),
              deltaCount: change.deltas.length,
              taskStatus,
            };
          } catch {
            return { id: changeName, title: '未知', deltaCount: 0, taskStatus };
          }
        })
      );
      
      const sorted = changeDetails.sort((a, b) => a.id.localeCompare(b.id));
      console.log(JSON.stringify(sorted, null, 2));
    } else {
      if (changes.length === 0) {
        console.log('未找到项目');
        return;
      }
      const sorted = [...changes].sort();
      if (!options?.long) {
        // 仅显示 ID
        sorted.forEach(id => console.log(id));
        return;
      }

      // 长格式：id: 标题 和最小计数
      for (const changeName of sorted) {
        const changeDir = path.join(changesPath, changeName);
        const proposalPath = path.join(changeDir, 'proposal.md');
        const { total, completed } = await getTaskProgressForChange(changesPath, changeName, process.cwd());
        const taskStatusText = total > 0 ? ` [任务 ${completed}/${total}]` : '';
        if (await isDefinitelyMissing(proposalPath)) {
          console.log(`${changeName}: （尚无 proposal.md）${taskStatusText}`);
          continue;
        }
        try {
          FileSystemUtils.assertPathWithin(changeDir, proposalPath);
          const content = await fs.readFile(proposalPath, 'utf-8');
          const title = this.extractTitle(content, changeName);
          const parser = new ChangeParser(content, changeDir);
          const change = await parser.parseChangeWithDeltas(changeName);
          const deltaCountText = ` [增量 ${change.deltas.length}]`;
          console.log(`${changeName}: ${title}${deltaCountText}${taskStatusText}`);
        } catch {
          console.log(`${changeName}: （无法读取）${taskStatusText}`);
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
          message: '选择要验证的 change',
          choices: changes.map(id => ({ name: id, value: id })),
        });
        changeName = selected;
      } else {
        if (changes.length === 0) {
          console.error('未指定 change。未找到活动 change。');
        } else {
          console.error(`未指定 change。可用 ID：${changes.join(', ')}`);
        }
        console.error('提示：使用 "openspec change list" 查看可用 change。');
        process.exitCode = 1;
        return;
      }
    }
    
    const changeDir = path.join(changesPath, changeName);
    if (!isChangeDirectoryName(changesPath, changeDir)) {
      throw new Error(`未找到 change "${changeName}"，路径：${changeDir}`);
    }
    try {
      await fs.access(changeDir);
    } catch {
      throw new Error(`未找到 change "${changeName}"，路径：${changeDir}`);
    }
    
    const validator = new Validator(options?.strict || false);
    const report = await validator.validateChangeDeltaSpecs(changeDir, {
      // 从 changesPath 派生，使主 specs 来自解析 change 的同一根目录。
      mainSpecsDir: path.join(path.dirname(changesPath), 'specs'),
      projectRoot: path.dirname(path.dirname(changesPath)),
    });
    
    if (options?.json) {
      console.log(JSON.stringify(report, null, 2));
    } else {
      if (report.valid) {
        console.log(`change "${changeName}" 有效`);
      } else {
        console.error(`change "${changeName}" 存在问题`);
        report.issues.forEach(issue => {
          const label = issue.level === 'ERROR' ? '错误' : '警告';
          const prefix = issue.level === 'ERROR' ? '✗' : '⚠';
          console.error(`${prefix} [${label}] ${issue.path}: ${issue.message}`);
        });
        // 后续步骤页脚，指导修复问题
        this.printNextSteps(report.issues);
        if (!options?.json) {
          process.exitCode = 1;
        }
      }
    }
  }

  private extractTitle(content: string, changeName: string): string {
    const match = content.match(/^#\s+(?:Change:\s+)?(.+)$/im);
    return match ? match[1].trim() : changeName;
  }

  private printNextSteps(issues: Array<{ message: string }> = []): void {
    const bullets: string[] = [];
    // 根据确切的标记消息分支：通用的无增量指导也会提到 skip_specs，
    // 不应触发标记子弹。
    const conflictIssue = issues.some(i =>
      i.message.includes(VALIDATION_MESSAGES.CHANGE_SKIP_SPECS_CONFLICT)
    );
    const invalidMarkerIssue = issues.some(i =>
      i.message.includes(VALIDATION_MESSAGES.CHANGE_SKIP_SPECS_INVALID_METADATA)
    );
    if (conflictIssue) {
      bullets.push('- 此 change 声明了 skip_specs（无 spec 增量）：删除 specs/ 下的文件，或在 requirements 确实变更时从 .openspec.yaml 中移除 skip_specs');
      bullets.push('- skip_specs 仅在 .openspec.yaml 是有效的 change 元数据时生效（需要 schema: <name> 来命名已知 schema）');
    } else if (invalidMarkerIssue) {
      bullets.push('- 修复 .openspec.yaml 以便 skip_specs 标记可以生效（需要 schema: <name> 来命名已知 schema）');
      bullets.push('- 或从 .openspec.yaml 中移除 skip_specs 并添加 spec 增量');
    } else {
      bullets.push('- 确保 change 在 specs/ 中有增量：使用 ## ADDED/MODIFIED/REMOVED/RENAMED Requirements 标题');
      bullets.push('- 每个 requirement 必须至少包含一个 #### Scenario: 块');
      bullets.push('- 调试解析的增量：openspec change show <id> --json --deltas-only');
    }
    console.error('后续步骤：');
    bullets.forEach(b => console.error(`  ${b}`));
  }
}
