/**
 * `openspec context`（切片 4.1）：root 的工作集声明
 * 以 agent 简报（JSON）、人类可读列表或编辑器
 * 视图（--code-workspace）的形式描述。组装是对 Phase 3
 * 关系数据的呈现层；doctor 是健康检查层。此命令唯一能执行的写入
 * 操作是显式请求的工作区文件。
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { Command, Option } from 'commander';

import {
  resolveRootForCommand,
  type ResolvedOpenSpecRoot,
} from '../core/root-selection.js';
import { inspectRelationships } from '../core/relationship-health.js';
import {
  assembleWorkingSet,
  buildCodeWorkspaceJson,
  isAvailableMember,
  type WorkingSet,
  type WorkingSetMember,
} from '../core/working-set.js';
import { StoreError } from '../core/store/errors.js';
import { COMMAND_REGISTRY } from '../core/completions/command-registry.js';
import { COMMON_FLAGS } from '../core/completions/shared-flags.js';
import { emitFailure, printJson } from './shared-output.js';
import { gatherRelationshipData } from './shared-gather.js';

const FAILURE_PAYLOAD = { root: null, members: [] };

async function gatherWorkingSet(
  root: ResolvedOpenSpecRoot
): Promise<{ workingSet: WorkingSet; declaredReferenceCount: number }> {
  const data = await gatherRelationshipData(root);

  // 复用 3.6 组合进行成员分类；有意忽略
  // 仅 doctor 的错误转向检测和存储事实——doctor 才是健康检查层。
  const health = inspectRelationships({
    root,
    rootHealthy: data.rootInspection.healthy,
    rootStatus: data.rootInspection.diagnostics,
    referenceEntries: data.referenceEntries,
    registryUnreadable: data.registrySnapshot.unreadable,
  });

  return {
    workingSet: assembleWorkingSet({
      root,
      referenceEntries: data.referenceEntries,
      topLevelStatus: health.status,
    }),
    declaredReferenceCount: data.projectConfig?.references?.length ?? 0,
  };
}

function memberLine(member: WorkingSetMember): string {
  return `  ${member.id}  ${member.path}`;
}

function printHumanWorkingSet(workingSet: WorkingSet, declaredReferenceCount: number): void {
  const rootLabel = workingSet.root.store_id ?? path.basename(workingSet.root.path);
  console.log(`${rootLabel} 的工作上下文（${workingSet.root.path}）`);
  console.log('');
  console.log('OpenSpec 根目录');
  console.log(`  ${rootLabel}  ${workingSet.root.path}`);

  const availableStores = workingSet.members.filter(
    (member) => member.role === 'referenced_store' && isAvailableMember(member)
  );
  const unavailable = workingSet.members.filter((member) => !isAvailableMember(member));

  if (availableStores.length > 0) {
    console.log('');
    console.log('引用的存储');
    for (const member of availableStores) {
      console.log(memberLine(member));
      if (member.fetch) {
        console.log(`    Fetch：${member.fetch}`);
      }
    }
  }

  if (workingSet.members.length === 0) {
    console.log('');
    // 自引用会在索引中静默省略；
    // 因省略而变空的集合不应声称未声明任何内容。
    console.log(
      declaredReferenceCount > 0
        ? '声明的引用都解析到此根目录；工作集仅包含此根目录。'
        : '未声明任何引用；工作集仅包含此根目录。'
    );
  }

  if (unavailable.length > 0 || workingSet.status.length > 0) {
    console.log('');
    console.log('本机上不可用');
    for (const member of unavailable) {
      if (member.status.length === 0) {
        console.log(`  - ${member.id}`);
        continue;
      }
      for (const diagnostic of member.status) {
        console.log(`  - ${member.id}：${diagnostic.message}`);
        if (diagnostic.fix) {
          console.log(`    修复：${diagnostic.fix}`);
        }
      }
    }
    for (const diagnostic of workingSet.status) {
      console.log(`  提示：${diagnostic.message}`);
      if (diagnostic.fix) {
        console.log(`  修复：${diagnostic.fix}`);
      }
    }
  }
}

function writeCodeWorkspace(
  workingSet: WorkingSet,
  outputPath: string,
  force: boolean
): void {
  const resolved = path.resolve(outputPath);
  if (fs.existsSync(resolved) && !force) {
    throw new StoreError(
      `拒绝覆盖 ${resolved}。`,
      'context_file_exists',
      {
        target: 'context.output',
        fix: '传递 --force 以覆盖，或选择其他路径。',
      }
    );
  }
  const parent = path.dirname(resolved);
  if (!fs.existsSync(parent)) {
    throw new StoreError(
      `输出目录不存在：${parent}。`,
      'context_output_dir_missing',
      { target: 'context.output', fix: '先创建目录，或选择其他路径。' }
    );
  }

  const rootName = workingSet.root.store_id ?? path.basename(workingSet.root.path);
  fs.writeFileSync(resolved, buildCodeWorkspaceJson(workingSet, rootName));

  const available = workingSet.members.filter(isAvailableMember).length;
  const skipped = workingSet.members
    .filter((member) => !isAvailableMember(member))
    .map((member) => member.id);
  const summary =
    skipped.length > 0
      ? `已写入 ${resolved}（${available + 1} 个文件夹；不可用：${skipped.join(', ')}）`
      : `已写入 ${resolved}（${available + 1} 个文件夹）`;
  // stderr 保持 JSON stdout 纯净；对人类用户以内联方式读取。
  console.error(summary);
}

export function registerContextCommand(program: Command): void {
  const description =
    COMMAND_REGISTRY.find((entry) => entry.name === 'context')?.description ??
    '打印已解析的 OpenSpec 根目录的工作上下文';

  program
    .command('context')
    .description(description)
    .option('--store <id>', COMMON_FLAGS.store.description)
    .addOption(
      new Option('--store-path <path>', '已移除；请注册存储并使用 --store').hideHelp()
    )
    .option('--json', '以 JSON 格式输出 agent 简报')
    .option('--code-workspace <path>', '同时为该集合写入 VS Code 工作区文件')
    .option('--force', '覆盖已有的 --code-workspace 文件')
    .action(
      async (options: {
        store?: string;
        storePath?: string;
        json?: boolean;
        codeWorkspace?: string;
        force?: boolean;
      }) => {
        try {
          const root = await resolveRootForCommand(
            { store: options.store, storePath: options.storePath },
            { json: options.json, failurePayload: FAILURE_PAYLOAD, allowImplicitRoot: false }
          );
          if (!root) {
            return;
          }

          const { workingSet, declaredReferenceCount } = await gatherWorkingSet(root);

          if (options.json) {
            // 写入先执行：写入失败时 stdout
            // 必须正好包含一个 JSON 文档（失败载荷）。
            if (options.codeWorkspace) {
              writeCodeWorkspace(workingSet, options.codeWorkspace, options.force === true);
            }
            printJson(workingSet);
          } else {
            printHumanWorkingSet(workingSet, declaredReferenceCount);
            if (options.codeWorkspace) {
              writeCodeWorkspace(workingSet, options.codeWorkspace, options.force === true);
            }
          }
        } catch (error) {
          emitFailure(options.json, FAILURE_PAYLOAD, error, 'context_failed');
        }
      }
    );
}