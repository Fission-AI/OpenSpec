import { promises as fs } from 'fs';
import path from 'path';
import type { Artifact, SchemaYaml } from '../core/artifact-graph/index.js';
import { resolveArtifactOutputs, resolveSchema } from '../core/artifact-graph/index.js';
import { resolveSchemaForChange } from './change-metadata.js';

/**
 * Markdown 任务行：一个 `-`/`*` 项目符号，带有 `[ ]` 或 `[x]` 复选框。
 *
 * 允许前导空格，以便嵌套的子任务像父任务一样计数。
 * 在第 0 列锚定会使得 `  - [ ] 1.1.1 ...` 这样的行对进度检测不可见，
 * 影响应用任务列表和 archive 的未完成任务检查，
 * 导致有未完成子任务的 change 报告"✓ Complete"并无警告地归档。
 *
 * 有意保持宽松以确保安全：这里收紧任何字符类 —— 比如方括号内的 `\s`，
 * 允许制表符或不间断空格代表空框 —— 会丢弃过去能匹配的行，
 * 而此解析器丢弃的任务就是 `openspec archive` 不再警告的任务。
 *
 * 故意不在末尾锚定：`.` 不匹配 `\r`，因此将描述组写为 `(.*)$`
 * 会拒绝 CRLF tasks.md 的每一行。
 */
const TASK_LINE_PATTERN = /^\s*[-*]\s*\[([\sxX])\]\s*(.*)/;

export interface ParsedTask {
  /** 复选框状态：`[x]`/`[X]` 为已完成，其他为未完成。 */
  done: boolean;
  /** 复选框后的任务文本，已裁剪（可能为空）。 */
  description: string;
}

/**
 * 按文档顺序解析任务文件中的每一行任务。
 *
 * 每一个匹配该模式的行都计入，无论它位于何处 —— 代码块内、
 * HTML 注释中或缩进块中，与之前一样。曾尝试跳过围栏中的复选框但被放弃：
 * 决定哪个围栏是"真正的"的任何规则都会有不必要的输入，其中杂散或不平衡的 ```
 * 会吞噬真正的任务。将已记录的示例计作工作是响亮的、可绕过的误报；
 * 丢失一个真正的任务是静默的错误。
 */
export function parseTaskLines(content: string): ParsedTask[] {
  const tasks: ParsedTask[] = [];

  for (const line of content.split('\n')) {
    const match = line.match(TASK_LINE_PATTERN);
    if (match) {
      tasks.push({ done: match[1].toLowerCase() === 'x', description: match[2].trim() });
    }
  }

  return tasks;
}

export interface TaskProgress {
  total: number;
  completed: number;
}

export function countTasksFromContent(content: string): TaskProgress {
  const tasks = parseTaskLines(content);
  return {
    total: tasks.length,
    completed: tasks.filter((task) => task.done).length,
  };
}

/**
 * 识别 change 的已跟踪任务 artifact：其 `generates` 等于 schema 的
 * `apply.tracks` 值的 artifact，当没有 `apply` 块声明跟踪内容时，
 * 回退到 id 为 `tasks` 的 artifact。（`apply.tracks` 是*选择* artifact 的文件名；
 * glob 是该 artifact 的 `generates`。）
 */
function findTrackedTasksArtifact(schema: SchemaYaml): Artifact | undefined {
  const tracks = schema.apply?.tracks;
  if (tracks != null) {
    return schema.artifacts.find((a) => a.generates === tracks);
  }
  return schema.artifacts.find((a) => a.id === 'tasks');
}

/**
 * 运行范围的 memo，将 schema 名称映射到其已跟踪任务的 `generates` glob。
 * 当一个命令在固定的 `projectRoot` 下为许多 change 解析进度时
 * —— 例如 `validate --archived` 对纯追加归档的处理 —— 这避免了为每个 change
 * 重新读取和解析（YAML + Zod）相同的 `schema.yaml`。
 * 仅以 schema 名称为键，这*仅*在单次运行保持 `projectRoot` 不变时是安全的；
 * 永远不要在不同的根之间重用同一个缓存。
 */
export type SchemaGlobCache = Map<string, string | undefined>;

/**
 * 为 change 解析已跟踪任务 artifact 的输出 glob，当 schema 无法解析或
 * 不存在已跟踪任务 artifact 时返回 undefined。
 * `resolveSchema` 在无法解析/命名错误的 schema 上会抛错；我们吞掉它，
 * 以便调用方回退到单个顶层 `tasks.md` 且永远不会崩溃。
 * 如果提供了 `schemaGlobCache`，它会在一次运行期间缓存 schema 名称 → glob 的查找结果。
 */
function resolveTrackedTasksGlob(
  changeDir: string,
  projectRoot: string,
  schemaGlobCache?: SchemaGlobCache
): string | undefined {
  try {
    const schemaName = resolveSchemaForChange(changeDir, undefined, projectRoot);
    if (schemaGlobCache?.has(schemaName)) return schemaGlobCache.get(schemaName);
    const schema = resolveSchema(schemaName, projectRoot);
    const generates = findTrackedTasksArtifact(schema)?.generates;
    schemaGlobCache?.set(schemaName, generates);
    return generates;
  } catch {
    return undefined;
  }
}

/** 解析 schema 的 apply 跟踪规则所选择的任务文件。 */
export function resolveTaskFilesForChange(
  changeDir: string,
  projectRoot: string,
  schemaGlobCache?: SchemaGlobCache
): string[] {
  const generates = resolveTrackedTasksGlob(changeDir, projectRoot, schemaGlobCache);
  return generates ? resolveArtifactOutputs(changeDir, generates) : [];
}

export interface TaskProgressDetail extends TaskProgress {
  /**
   * 存在但无法读取的任务文件（除 ENOENT 之外的任何错误）。
   * `getTaskProgressForChange` 丢弃此列表以保持其行为；
   * 必须在不可读的任务文件上大声失败的调用方 —— 例如
   * `openspec validate --archived` —— 读取它，使得不可读的文件永远不会
   * 被静默地计为"无任务" (#205)。
   */
  unreadable: string[];
}

/**
 * 读取一个任务文件并统计其复选框。ENOENT（在解析和读取之间消失的 glob 文件，
 * 或不存在的单个顶层 `tasks.md`）表示零任务，与之前一样。
 * 任何其他错误（权限、I/O、ENOTDIR）会被记录到 `unreadable` 中，
 * 以便调用方可以展示它；计数仍然贡献零，因此现有调用方看不到变化。
 */
async function countTaskFile(file: string, unreadable: string[]): Promise<TaskProgress> {
  try {
    const content = await fs.readFile(file, 'utf-8');
    return countTasksFromContent(content);
  } catch (error: any) {
    if (error?.code !== 'ENOENT') unreadable.push(file);
    return { total: 0, completed: 0 };
  }
}

/**
 * 通过解析 change 的已跟踪任务 artifact 并统计该 artifact 的 `generates` glob
 * 匹配的每个文件中的复选框来计算 change 的任务进度 ——
 * 与 `openspec status` 用于检测任务 artifact（`resolveArtifactOutputs`）的
 * 文件解析方式相同 —— 因此进度不再对嵌套的 `tasks.md` 文件视而不见 (#1202)。
 * 当 schema 无法解析、未找到已跟踪任务 artifact 或 glob 不匹配任何文件时，
 * 回退到单个顶层 `tasks.md`（与之前完全一样）。
 * 还会报告存在但无法读取的任务文件。
 * 每个文件的读取错误会被捕获（永远不会抛出）；唯一的抛错路径是格式错误/不安全的
 * schema，其 glob 解析被拒绝（路径遍历或 `resolveArtifactOutputs` 中的链接目录循环）。
 * 传递 `schemaGlobCache` 以在一次运行中缓存 schema→glob 的解析。
 */
export async function getTaskProgressDetailForChange(
  changesDir: string,
  changeName: string,
  projectRoot: string,
  schemaGlobCache?: SchemaGlobCache
): Promise<TaskProgressDetail> {
  const changeDir = path.join(changesDir, changeName);
  const files = resolveTaskFilesForChange(changeDir, projectRoot, schemaGlobCache);
  const targets = files.length > 0 ? files : [path.join(changeDir, 'tasks.md')];
  const unreadable: string[] = [];
  let total = 0;
  let completed = 0;
  for (const file of targets) {
    const progress = await countTaskFile(file, unreadable);
    total += progress.total;
    completed += progress.completed;
  }
  return { total, completed, unreadable };
}

/**
 * `status`、`list` 和 `archive` 共享的任务完成计数器。
 * 委托给 `getTaskProgressDetailForChange` 并丢弃 `unreadable` 详情，
 * 因此其返回的总计不变。仅在与该函数相同的格式错误/不安全 schema
 * glob 解析路径上抛出（现有行为；调用方像以前一样守卫它）。
 */
export async function getTaskProgressForChange(
  changesDir: string,
  changeName: string,
  projectRoot: string
): Promise<TaskProgress> {
  const { total, completed } = await getTaskProgressDetailForChange(
    changesDir,
    changeName,
    projectRoot
  );
  return { total, completed };
}

export function formatTaskStatus(progress: TaskProgress): string {
  if (progress.total === 0) return 'No tasks';
  if (progress.completed === progress.total) return '✓ Complete';
  return `${progress.completed}/${progress.total} tasks`;
}


