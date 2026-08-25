/**
 * Status 命令
 *
 * 显示 change 的制品完成状态。
 */

import ora from 'ora';
import chalk from 'chalk';
import { getChangeDir } from '../../core/planning-home.js';
import {
  resolveRootForCommand,
  toPlanningHome,
  toRootOutput,
  withStoreFlag,
  isStoreSelectedRoot,
} from '../../core/root-selection.js';
import {
  loadChangeContext,
  formatChangeStatus,
  type ChangeStatus,
} from '../../core/artifact-graph/index.js';
import {
  validateChangeExists,
  validateSchemaExists,
  getAvailableChanges,
  getStatusIndicator,
  getStatusColor,
} from './shared.js';

// -----------------------------------------------------------------------------
// 类型
// -----------------------------------------------------------------------------

export interface StatusOptions {
  change?: string;
  schema?: string;
  store?: string;
  storePath?: string;
  json?: boolean;
}

// -----------------------------------------------------------------------------
// 命令实现
// -----------------------------------------------------------------------------

export async function statusCommand(options: StatusOptions): Promise<void> {
  // 根目录解析（以及存储横幅打印）在 spinner 启动之前完成，
  // 这样两者不会在 stderr 上冲突。
  const root = await resolveRootForCommand(options, { json: options.json });
  if (!root) {
    return;
  }

  const spinner = options.json ? undefined : ora('正在加载 change 状态...').start();

  try {
    const planningHome = toPlanningHome(root);
    const projectRoot = root.path;
    const rootOutput = toRootOutput(root);
    const newChangeHint = withStoreFlag(root, 'openspec new change <name>');

    // 优雅地处理无 change 的情况——status 是信息性的，
    // 因此"无 change"是有效状态，不是错误。
    if (!options.change) {
      const available = await getAvailableChanges(projectRoot, root.changesDir);
      if (available.length === 0) {
        spinner?.stop();
        if (options.json) {
          console.log(
            JSON.stringify(
              { changes: [], message: '无活动 change。', root: rootOutput },
              null,
              2
            )
          );
          return;
        }
        console.log(`无活动 change。使用以下命令创建一个：${newChangeHint}`);
        return;
      }
      // 存在 change 但未提供 --change
      spinner?.stop();
      throw new Error(
        `缺少必需的 --change 选项。可用的 change：\n  ${available.join('\n  ')}`
      );
    }

    const changeName = await validateChangeExists(
      options.change,
      projectRoot,
      root.changesDir,
      { newChangeHint }
    );

    // 如果显式提供了 schema 则验证
    if (options.schema) {
      validateSchemaExists(options.schema, projectRoot);
    }

    // loadChangeContext 将从元数据自动检测 schema（如未提供）
    const context = loadChangeContext(projectRoot, changeName, options.schema, {
      changeDir: getChangeDir(planningHome, changeName),
      planningHome,
    });
    const status = formatChangeStatus(
      context,
      isStoreSelectedRoot(root) ? { storeId: root.storeId } : {}
    );

    spinner?.stop();

    if (options.json) {
      console.log(JSON.stringify({ ...status, root: rootOutput }, null, 2));
      return;
    }

    printStatusText(status);
  } catch (error) {
    spinner?.stop();
    throw error;
  }
}

export function printStatusText(status: ChangeStatus): void {
  const doneCount = status.artifacts.filter((a) => a.status === 'done').length;
  const skippedCount = status.artifacts.filter((a) => a.status === 'skipped').length;
  const total = status.artifacts.length - skippedCount;

  console.log(`Change：${status.changeName}`);
  console.log(`Schema：${status.schemaName}`);
  if (status.changeRoot) {
    console.log(`Change 根目录：${status.changeRoot}`);
  }
  const skippedSuffix = skippedCount > 0 ? ` (${skippedCount} 个已跳过)` : '';
  console.log(`进度：${doneCount}/${total} 个制品已完成${skippedSuffix}`);
  console.log();

  for (const artifact of status.artifacts) {
    const indicator = getStatusIndicator(artifact.status);
    const color = getStatusColor(artifact.status);
    let line = `${indicator} ${artifact.id}`;

    if (artifact.status === 'skipped') {
      line += color(' (已跳过：change 声明了 skip_specs)');
    }

    if (artifact.status === 'blocked' && artifact.missingDeps && artifact.missingDeps.length > 0) {
      line += color(` (被以下阻塞：${artifact.missingDeps.join(', ')})`);
    }

    console.log(line);
  }

  if (status.isPlanningComplete) {
    console.log();
    console.log(chalk.green('所有规划制品已完成！'));
  }
}