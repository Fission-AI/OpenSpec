import path from 'path';
import { FileSystemUtils } from './file-system.js';
import { writeChangeMetadata, validateSchemaName } from './change-metadata.js';
import { formatLocalDate } from './date.js';
import { readProjectConfig } from '../core/project-config.js';
import { isKebabId } from '../core/id.js';
import { resolveSchema } from '../core/artifact-graph/resolver.js';
import { isSpecsArtifactPath } from '../core/artifact-graph/outputs.js';
import type { ChangeMetadata } from '../core/change-metadata/index.js';

const DEFAULT_SCHEMA = 'spec-driven';

/**
 * 创建 change 的选项。
 */
export interface CreateChangeOptions {
  /** 要使用的工作流 schema（默认：'spec-driven'） */
  schema?: string;
  /** 当没有显式 schema 或项目配置时使用的默认 schema */
  defaultSchema?: string;
  /** 应包含 change 目录的目录 */
  changesDir?: string;
  /** 在 change 的 .openspec.yaml 中持久化的额外元数据 */
  metadata?: Partial<Pick<ChangeMetadata, 'goal' | 'affected_areas' | 'initiative'>>;
}

/**
 * 创建 change 的结果。
 */
export interface CreateChangeResult {
  /** 实际使用的 schema（从选项、配置或默认值解析） */
  schema: string;
  /** 已创建的 change 目录的绝对路径 */
  changeDir: string;
}

/**
 * 验证 change 名称的结果。
 */
export interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * 验证 change 名称是否符合 kebab-case 约定。
 *
 * 使用 OpenSpec 共享的 kebab-id 语法（与 store id 和 change
 * 元数据 id 使用的相同），因此 change 名称可以：
 * - 以小写字母或数字开头
 * - 仅包含小写字母、数字和连字符
 * - 不以连字符开头或结尾
 * - 不包含连续连字符
 *
 * 允许前导数字，以便 `100-add-feature` 或
 * `00001-add-auth` 等排序约定可以工作；归档已将此类前缀视为支持的
 * 约定（参见 ARCHIVE_DATE_PREFIX_PATTERN）。
 *
 * @param name - 要验证的 change 名称
 * @returns 验证结果，`valid: true` 或 `valid: false` 并带有错误消息
 *
 * @example
 * validateChangeName('add-auth') // { valid: true }
 * validateChangeName('100-add-feature') // { valid: true }
 * validateChangeName('Add-Auth') // { valid: false, error: '...' }
 */
export function validateChangeName(name: string): ValidationResult {
  if (!name) {
    return { valid: false, error: 'Change 名称不能为空' };
  }

  // 文件系统目录组件上限为 255 字节，归档会预先加上
  // 日期前缀；此处限制将失败转为验证消息
  // 而不是 mkdir 抛出的原始 ENAMETOOLONG。
  if (name.length > 200) {
    return { valid: false, error: 'Change 名称过长（最多 200 个字符）' };
  }

  if (!isKebabId(name)) {
    // 为常见错误提供具体的错误消息
    if (/[A-Z]/.test(name)) {
      return { valid: false, error: 'Change 名称必须为小写（使用 kebab-case）' };
    }
    if (/\s/.test(name)) {
      return { valid: false, error: 'Change 名称不能包含空格（请改用连字符）' };
    }
    if (/_/.test(name)) {
      return { valid: false, error: 'Change 名称不能包含下划线（请改用连字符）' };
    }
    if (name.startsWith('-')) {
      return { valid: false, error: 'Change 名称不能以连字符开头' };
    }
    if (name.endsWith('-')) {
      return { valid: false, error: 'Change 名称不能以连字符结尾' };
    }
    if (/--/.test(name)) {
      return { valid: false, error: 'Change 名称不能包含连续连字符' };
    }
    if (/[^a-z0-9-]/.test(name)) {
      return { valid: false, error: 'Change 名称只能包含小写字母、数字和连字符' };
    }

    return { valid: false, error: 'Change 名称必须符合 kebab-case 约定（例如 add-auth、refactor-db）' };
  }

  return { valid: true };
}

/**
 * 创建带有元数据文件的新 change 目录。
 *
 * @param projectRoot - 项目的根目录（`openspec/` 所在位置）
 * @param name - change 名称（必须为有效的 kebab-case）
 * @param options - change 的可选设置
 * @throws Error 如果 change 名称无效
 * @throws Error 如果 schema 名称无效
 * @throws Error 如果 change 目录已存在
 *
 * @returns 包含已解析 schema 名称的结果
 *
 * @example
 * // 使用默认 schema 创建 openspec/changes/add-auth/
 * const result = await createChange('/path/to/project', 'add-auth')
 * console.log(result.schema) // 'spec-driven' or value from config
 *
 * @example
 * // 使用自定义 schema 创建 openspec/changes/add-auth/
 * const result = await createChange('/path/to/project', 'add-auth', { schema: 'my-workflow' })
 * console.log(result.schema) // 'my-workflow'
 */
export async function createChange(
  projectRoot: string,
  name: string,
  options: CreateChangeOptions = {}
): Promise<CreateChangeResult> {
  // 首先验证名称
  const validation = validateChangeName(name);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  const defaultSchema = options.defaultSchema ?? DEFAULT_SCHEMA;

  // 确定 schema：显式选项 → 项目配置 → 提供的默认值
  let schemaName: string;
  if (options.schema) {
    schemaName = options.schema;
  } else {
    // 尝试从项目配置读取
    try {
      const config = readProjectConfig(projectRoot);
      schemaName = config?.schema ?? defaultSchema;
    } catch {
      // 如果配置读取失败，使用默认值
      schemaName = defaultSchema;
    }
  }

  // 验证已解析的 schema
  validateSchemaName(schemaName, projectRoot);

  // 构建 change 目录路径
  const changeDir = path.join(options.changesDir ?? path.join(projectRoot, 'openspec', 'changes'), name);

  // 检查 change 是否已存在
  if (await FileSystemUtils.directoryExists(changeDir)) {
    throw new Error(`Change '${name}' 已存在于 ${changeDir}`);
  }

  const schema = resolveSchema(schemaName, projectRoot);
  const skipsSpecs = !schema.artifacts.some(artifact =>
    isSpecsArtifactPath(artifact.generates)
  );

  // 创建 change 可能会搭建或补全根目录本身（隐式根目录，
  // 或仅配置/不完整的克隆）。永远不要留下
  // doctor 立即判定为不健康的半根目录：确保
  // specs/ 和 changes/archive/ 存在，并且仅当
  // 配置不存在时才写入配置。配置记录项目默认 schema，
  // 从不是单个 change 的 --schema 覆盖。
  const openspecDir = path.join(projectRoot, 'openspec');

  // 创建目录（如需要包括父目录）
  await FileSystemUtils.createDirectory(changeDir);
  await FileSystemUtils.createDirectory(path.join(openspecDir, 'specs'));
  await FileSystemUtils.createDirectory(path.join(openspecDir, 'changes', 'archive'));
  const configPath = path.join(openspecDir, 'config.yaml');
  const configYmlPath = path.join(openspecDir, 'config.yml');
  if (
    !(await FileSystemUtils.fileExists(configPath)) &&
    !(await FileSystemUtils.fileExists(configYmlPath))
  ) {
    await FileSystemUtils.writeFile(configPath, `schema: ${defaultSchema}\n`);
  }

  // 写入带有 schema 和创建日期的元数据文件
  writeChangeMetadata(changeDir, {
    schema: schemaName,
    created: formatLocalDate(),
    ...(skipsSpecs ? { skip_specs: true } : {}),
    ...options.metadata,
  }, projectRoot);

  return { schema: schemaName, changeDir };
}