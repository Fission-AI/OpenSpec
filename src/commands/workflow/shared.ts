/**
 * 制品工作流命令的共享类型和工具函数
 *
 * 本模块包含在多个制品工作流命令中使用的类型、常量和验证辅助函数。
 */

import chalk from 'chalk';
import path from 'path';
import * as fs from 'fs';
import { getSchemaDir, listSchemas } from '../../core/artifact-graph/index.js';
import type { ReferenceIndexEntry } from '../../core/references.js';
import { isRootSelectionError } from '../../core/root-selection.js';

// -----------------------------------------------------------------------------
// 类型
// -----------------------------------------------------------------------------

export interface ChangeCommandStatus {
  severity: 'error' | 'warning';
  code: string;
  message: string;
  target?: string;
  fix?: string;
}

export interface TaskItem {
  id: string;
  description: string;
  done: boolean;
}

export interface ApplyInstructions {
  changeName: string;
  changeDir: string;
  schemaName: string;
  contextFiles: Record<string, string[]>;
  progress: {
    total: number;
    complete: number;
    remaining: number;
  };
  tasks: TaskItem[];
  state: 'blocked' | 'all_done' | 'ready';
  missingArtifacts?: string[];
  instruction: string;
  /** 引用存储索引（只读上游上下文；未声明时省略） */
  references?: ReferenceIndexEntry[];
  /** 选定根目录中的当前项目背景。 */
  context?: string;
  /** apply 的当前咨询指导。 */
  operationGuidance?: string[];
}

export interface ArchiveInstructions {
  changeName: string;
  /** 选定根目录中的当前项目背景。 */
  context?: string;
  /** archive 的当前咨询指导。 */
  operationGuidance?: string[];
}

// -----------------------------------------------------------------------------
// 常量
// -----------------------------------------------------------------------------

export const DEFAULT_SCHEMA = 'spec-driven';

// -----------------------------------------------------------------------------
// 工具函数
// -----------------------------------------------------------------------------

export function printJson(payload: unknown): void {
  console.log(JSON.stringify(payload, null, 2));
}

export function statusFromError(error: unknown): ChangeCommandStatus {
  if (isRootSelectionError(error)) {
    return { ...error.diagnostic };
  }

  return {
    severity: 'error',
    code: 'change_error',
    message: error instanceof Error ? error.message : String(error),
  };
}

/**
 * 检查是否通过 NO_COLOR 环境变量或 --no-color 禁用了彩色输出。
 */
export function isColorDisabled(): boolean {
  return process.env.NO_COLOR === '1' || process.env.NO_COLOR === 'true';
}

/**
 * 根据状态获取对应的颜色函数。
 */
export function getStatusColor(status: 'done' | 'skipped' | 'ready' | 'blocked'): (text: string) => string {
  if (isColorDisabled()) {
    return (text: string) => text;
  }
  switch (status) {
    case 'done':
      return chalk.green;
    case 'skipped':
      return chalk.gray;
    case 'ready':
      return chalk.yellow;
    case 'blocked':
      return chalk.red;
  }
}

/**
 * 获取制品的状态指示器。
 */
export function getStatusIndicator(status: 'done' | 'skipped' | 'ready' | 'blocked'): string {
  const color = getStatusColor(status);
  switch (status) {
    case 'done':
      return color('[x]');
    case 'skipped':
      return color('[~]');
    case 'ready':
      return color('[ ]');
    case 'blocked':
      return color('[-]');
  }
}

/**
 * 返回 openspec/changes/ 下可用的 change 目录名列表。
 * 排除 archive 目录和隐藏目录。
 */
export async function getAvailableChanges(
  projectRoot: string,
  changesDir = path.join(projectRoot, 'openspec', 'changes')
): Promise<string[]> {
  const changesPath = changesDir;
  try {
    const entries = await fs.promises.readdir(changesPath, { withFileTypes: true });
    return entries
      .filter((e) => e.isDirectory() && e.name !== 'archive' && !e.name.startsWith('.'))
      .map((e) => e.name);
  } catch (error: unknown) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return [];
    throw error;
  }
}

/**
 * 验证用于查找现有 change 目录的 change 名称。
 * 查找接受 `getAvailableChanges` 能返回的任何目录名
 * （`validateChangeName` 中的 kebab-case 约定仅在创建时应用）；
 * 它仅拒绝会转义 changes 目录的名称
 * 或 `getAvailableChanges` 排除的条目（隐藏目录、archive）。
 *
 * @returns 错误消息，如果名称可安全查找则返回 undefined
 */
function validateChangeLookupName(changeName: string): string | undefined {
  if (changeName === '.' || changeName === '..') {
    return 'change 名称不能是相对路径段';
  }
  if (changeName.includes('/') || changeName.includes('\\')) {
    return 'change 名称不能包含路径分隔符';
  }
  if (changeName.includes('\0')) {
    return 'change 名称不能包含空字符';
  }
  if (changeName.startsWith('.')) {
    return 'change 名称不能以点开头';
  }
  if (changeName === 'archive') {
    return "'archive' 已预留给已归档的 change";
  }
  return undefined;
}

/**
 * 验证 change 存在，不存在时返回可用的 change 列表。
 * 直接检查目录存在性以支持脚手架搭建的 change（无 proposal.md）。
 */
export async function validateChangeExists(
  changeName: string | undefined,
  projectRoot: string,
  changesDir = path.join(projectRoot, 'openspec', 'changes'),
  hints: { newChangeHint?: string } = {}
): Promise<string> {
  // 提示必须保持可复制性：选定存储的调用者传递
  // 携带存储的提示，以便后续操作在同一根目录中。
  const newChangeHint = hints.newChangeHint ?? 'openspec new change <name>';

  if (!changeName) {
    const available = await getAvailableChanges(projectRoot, changesDir);
    if (available.length === 0) {
      throw new Error(`未找到 change。使用以下命令创建一个：${newChangeHint}`);
    }
    throw new Error(
      `缺少必需的 --change 选项。可用的 change：\n  ${available.join('\n  ')}`
    );
  }

  // 验证 change 名称格式以防止路径遍历
  const lookupError = validateChangeLookupName(changeName);
  if (lookupError) {
    throw new Error(`无效的 change 名称 '${changeName}'：${lookupError}`);
  }

  // 直接检查目录存在性
  const changePath = path.join(changesDir, changeName);
  const exists = fs.existsSync(changePath) && fs.statSync(changePath).isDirectory();

  if (!exists) {
    const available = await getAvailableChanges(projectRoot, changesDir);
    if (available.length === 0) {
      throw new Error(
        `未找到 change '${changeName}'。不存在任何 change。使用以下命令创建一个：${newChangeHint}`
      );
    }
    throw new Error(
      `未找到 change '${changeName}'。可用的 change：\n  ${available.join('\n  ')}`
    );
  }

  return changeName;
}

/**
 * 验证 schema 存在，不存在时返回可用的 schema 列表。
 *
 * @param schemaName - 要验证的 schema 名称
 * @param projectRoot - 可选的项目根目录，用于项目本地 schema 解析
 */
export function validateSchemaExists(schemaName: string, projectRoot?: string): string {
  const schemaDir = getSchemaDir(schemaName, projectRoot);
  if (!schemaDir) {
    const availableSchemas = listSchemas(projectRoot);
    throw new Error(
      `未找到 schema '${schemaName}'。可用的 schema：\n  ${availableSchemas.join('\n  ')}`
    );
  }
  return schemaName;
}