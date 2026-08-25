import * as fs from 'node:fs';
import * as path from 'node:path';
import * as yaml from 'yaml';
import { ChangeMetadataSchema, type ChangeMetadata } from '../core/change-metadata/index.js';
import { listSchemas, resolveSchema } from '../core/artifact-graph/resolver.js';
import { readProjectConfig, type ProjectConfig } from '../core/project-config.js';

export const METADATA_FILENAME = '.openspec.yaml';

/**
 * change 元数据验证失败时抛出的错误。
 */
export class ChangeMetadataError extends Error {
  constructor(
    message: string,
    public readonly metadataPath: string,
    public readonly cause?: Error
  ) {
    super(message);
    this.name = 'ChangeMetadataError';
  }
}

/**
 * 验证 schema 名称是否有效（存在于可用 schema 中）。
 *
 * @param schemaName - 要验证的 schema 名称
 * @param projectRoot - 可选的项目根目录，用于项目级 schema 解析
 * @returns 已验证的 schema 名称
 * @throws Error 如果未找到 schema
 */
export function validateSchemaName(
  schemaName: string,
  projectRoot?: string
): string {
  const availableSchemas = listSchemas(projectRoot);
  if (!availableSchemas.includes(schemaName)) {
    throw new Error(
      `未知的 schema '${schemaName}'。可用的：${availableSchemas.join(', ')}`
    );
  }
  return schemaName;
}

/**
 * 将 change 元数据写入 change 目录中的 .openspec.yaml。
 *
 * @param changeDir - change 目录的路径
 * @param metadata - 要写入的元数据
 * @param projectRoot - 可选的项目根目录，用于项目级 schema 解析
 * @throws ChangeMetadataError 如果验证失败或写入失败
 */
export function writeChangeMetadata(
  changeDir: string,
  metadata: ChangeMetadata,
  projectRoot?: string
): void {
  const metaPath = path.join(changeDir, METADATA_FILENAME);

  // 验证 schema 是否存在
  validateSchemaName(metadata.schema, projectRoot);

  // 使用 Zod 验证
  const parseResult = ChangeMetadataSchema.safeParse(metadata);
  if (!parseResult.success) {
    throw new ChangeMetadataError(
      `Invalid metadata: ${parseResult.error.message}`,
      metaPath
    );
  }

  // Write YAML file
  const content = yaml.stringify(parseResult.data);
  try {
    fs.writeFileSync(metaPath, content, 'utf-8');
  } catch (err) {
    const ioError = err instanceof Error ? err : new Error(String(err));
    throw new ChangeMetadataError(
      `Failed to write metadata: ${ioError.message}`,
      metaPath,
      ioError
    );
  }
}

/**
 * 从 change 目录中的 .openspec.yaml 读取 change 元数据。
 *
 * @param changeDir - change 目录的路径
 * @param projectRoot - 可选的项目根目录，用于项目级 schema 解析
 * @returns 已验证的元数据，如果不存在元数据文件则返回 null
 * @throws ChangeMetadataError 如果文件存在但无效
 */
export function readChangeMetadata(
  changeDir: string,
  projectRoot?: string
): ChangeMetadata | null {
  const metaPath = path.join(changeDir, METADATA_FILENAME);

  if (!fs.existsSync(metaPath)) {
    return null;
  }

  let content: string;
  try {
    content = fs.readFileSync(metaPath, 'utf-8');
  } catch (err) {
    const ioError = err instanceof Error ? err : new Error(String(err));
    throw new ChangeMetadataError(
      `Failed to read metadata: ${ioError.message}`,
      metaPath,
      ioError
    );
  }

  let parsed: unknown;
  try {
    parsed = yaml.parse(content);
  } catch (err) {
    const parseError = err instanceof Error ? err : new Error(String(err));
    throw new ChangeMetadataError(
      `Invalid YAML in metadata file: ${parseError.message}`,
      metaPath,
      parseError
    );
  }

  // 使用 Zod 验证
  const parseResult = ChangeMetadataSchema.safeParse(parsed);
  if (!parseResult.success) {
    throw new ChangeMetadataError(
      `Invalid metadata: ${parseResult.error.message}`,
      metaPath
    );
  }

  // 验证 schema 是否存在
  const availableSchemas = listSchemas(projectRoot);
  if (!availableSchemas.includes(parseResult.data.schema)) {
    throw new ChangeMetadataError(
      `Unknown schema '${parseResult.data.schema}'. Available: ${availableSchemas.join(', ')}`,
      metaPath
    );
  }

  return parseResult.data;
}

export interface ResolveSchemaForChangeOptions {
  metadata?: ChangeMetadata | null;
  /** Pre-read project config; suppresses the fallback config read when provided. */
  projectConfig?: ProjectConfig | null;
}

/**
 * 为 change 解析 schema，显式覆盖优先。
 *
 * 解析顺序：
 * 1. 显式 schema（如果提供）
 * 2. 来自 .openspec.yaml 元数据的 schema（如果存在）
 * 3. 来自 openspec/config.yaml 的 schema（如果存在）
 * 4. 默认 'spec-driven'
 *
 * @param changeDir - change 目录的路径
 * @param explicitSchema - 可选的显式 schema 覆盖
 * @returns 解析后的 schema 名称
 */
export function resolveSchemaForChange(
  changeDir: string,
  explicitSchema?: string,
  projectRootOverride?: string,
  options: ResolveSchemaForChangeOptions = {}
): string {
  // 从 changeDir 推导项目根目录（changeDir 通常为 projectRoot/openspec/changes/change-name）
  const projectRoot = projectRootOverride ?? path.resolve(changeDir, '../../..');

  // 1. 显式覆盖优先
  if (explicitSchema) {
    return explicitSchema;
  }

  const metadata =
    options.metadata !== undefined ? options.metadata : readChangeMetadata(changeDir, projectRoot);
  if (metadata?.schema) {
    return metadata.schema;
  }

  // 3. 当元数据缺失时尝试从项目配置读取。
  if (options.projectConfig !== undefined) {
    if (options.projectConfig?.schema) {
      return options.projectConfig.schema;
    }
  } else {
    try {
      const config = readProjectConfig(projectRoot);
      if (config?.schema) {
        return config.schema;
      }
    } catch {
      // 如果配置读取失败，回退到默认值
    }
  }

  // 4. 默认值
  return 'spec-driven';
}

export interface MetadataMarker {
  /**
   * 当元数据在 ChangeMetadataSchema 下解析、将请求的布尔标志设置为 true，
   * 并命名一个能加载的 schema 时为 true。
   */
  declared: boolean;
  /**
   * 当标志无法被遵守时设置：它出现在未通过元数据契约的文件中，
   * 或元数据文件存在但完全无法读取（因此标志是否被设置甚至无法确定）。
   */
  invalidReason?: string;
}

/** @deprecated Use MetadataMarker. */
export type SkipSpecsMarker = MetadataMarker;

/**
 * 非抛错读取 skip_specs 标志。该标志仅在元数据能被加载以用于 status/instructions 时才算数：
 * 文件在 ChangeMetadataSchema 下解析，其 schema 名称通过 readChangeMetadata 的
 * listSchemas 成员检查，并且 schema 本身通过 resolveSchema 加载
 * （存在但无法解析的 schema.yaml 同样会使 status 失败）。
 * Validate 和 archive 永远不能遵守 CLI 其余部分拒绝的元数据，无论方向如何。
 * schema 解析的项目根目录从 changeDir 推导，与 resolveSchemaForChange 完全相同
 * （对于每种根类型，changeDir 为 <root>/openspec/changes/<name>，包括 store 根）。
 * 缺失的元数据表示"未声明"；无法被遵守的标志会产生 invalidReason，以便调用方说明原因。
 */
export function readSkipSpecsMarker(changeDir: string): MetadataMarker {
  return readBooleanMarker(changeDir, 'skip_specs');
}

/**
 * 非抛错读取 retire_capabilities 标志，语义与 `readSkipSpecsMarker` 文档完全相同。
 *
 * 门控 archive 操作中从 `openspec/specs/` 删除文件的那一个：当 change 的 REMOVED 条目
 * 移除了某个 capability 的最后一个需求时，archive 会删除清空的主 spec，
 * 而不是在无法写入的 spec 上中止 (#1302)。
 * 之所以声明而非推断，是因为删除只能从 git 恢复，所以由作者决定。
 */
export function readRetireCapabilitiesMarker(changeDir: string): MetadataMarker {
  return readBooleanMarker(changeDir, 'retire_capabilities');
}

/**
 * 布尔 change-metadata 标志的共享实现，通过字段名进行键控。
 * 使用一个函数体而不是两个，以确保一个标志永远不会偏离另一个拒绝的元数据 ——
 * 这是上述契约描述的全部意义。
 */
/**
 * 无法被遵守的标志，其原因已安全处理以供打印。
 *
 * 每个原因都引用了作者写的内容 —— schema 名称、带有该名称的解析器消息、
 * 带有路径的文件系统错误 —— 调用方直接将其打印到终端
 * （`openspec archive`、`openspec validate`）。
 * 原始 CR 可能伪造自己的行，ESC 可能重绘屏幕，因此控制字符永远不会离开此函数。
 */
function unhonorable(reason: string): MetadataMarker {
  return { declared: false, invalidReason: reason.replace(/[\u0000-\u001f\u007f]/g, '?') };
}

function readBooleanMarker(
  changeDir: string,
  key: 'skip_specs' | 'retire_capabilities'
): MetadataMarker {
  let raw: string;
  try {
    raw = fs.readFileSync(path.join(changeDir, METADATA_FILENAME), 'utf-8');
  } catch (err) {
    if ((err as NodeJS.ErrnoException)?.code === 'ENOENT') {
      return { declared: false };
    }
    // 文件存在但无法读取（EACCES、EISDIR 等）。Status 和 instructions 在此直接拒绝 change，
    // 标志是否被设置无法确定 —— 失败关闭而不是让 archive 将 change 视为未标记，
    // 而每个元数据读取表面都会报错。
    const message =
      err instanceof Error ? err.message : String(err);
    return unhonorable(`元数据文件无法读取（${message}）`);
  }

  let parsed: unknown;
  try {
    parsed = yaml.parse(raw);
  } catch {
    // 锚定以便像 "# maybe add skip_specs later" 这样的注释不会
    // 声称标志已被设置。
    const mentioned = new RegExp(`^\\s*(['"]?)${key}\\1\\s*:`, 'm').test(raw);
    return mentioned ? unhonorable('文件不是有效的 YAML') : { declared: false };
  }

  const result = ChangeMetadataSchema.safeParse(parsed);
  if (result.success) {
    if (result.data[key] !== true) {
      return { declared: false };
    }
    // 仅在标志被设置时才检查 schema 加载：普通 change 上的损坏 schema
    // 由 status 报告，但遵守 status 拒绝的标志会让 validate/archive 通过
    // CLI 其余部分拒绝加载的内容。成员检查与 readChangeMetadata 镜像
    // （拒绝 'spec-driven.yaml' 等名称，而 resolveSchema 单独会规范化并接受它们）；
    // resolveSchema 随后证明 schema 确实能解析。任何失败都失败关闭。
    try {
      const projectRoot = path.resolve(changeDir, '../../..');
      if (!listSchemas(projectRoot).includes(result.data.schema)) {
        return unhonorable(`schema: unknown schema '${result.data.schema}'`);
      }
      resolveSchema(result.data.schema, projectRoot);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return unhonorable(message);
    }
    return { declared: true };
  }

  // 键的存在，而不是值：skip_specs: "yes" 必须显示为不可尊重，
  // 而不是在零增量指导告诉用户设置他们已设置的标志时消失。
  // 显式的 skip_specs: false 与设置标志相反，因此不得将不相关的元数据问题
  // 拖入 validate —— change 只是没有被标记。
  const markerMentioned =
    typeof parsed === 'object' &&
    parsed !== null &&
    key in parsed &&
    (parsed as Record<string, unknown>)[key] !== false;
  if (markerMentioned) {
    const first = result.error.issues[0];
    const where = first.path.length > 0 ? `${first.path.join('.')}: ` : '';
    return unhonorable(`${where}${first.message}`);
  }
  return { declared: false };
}
