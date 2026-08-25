import { Command } from 'commander';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { createHash } from 'node:crypto';
import ora from 'ora';
import { stringify as stringifyYaml, parseDocument } from 'yaml';
import {
  getSchemaDir,
  getProjectSchemasDir,
  getUserSchemasDir,
  getPackageSchemasDir,
  isSchemaDir,
  listSchemas,
} from '../core/artifact-graph/resolver.js';
import { parseSchema, SchemaValidationError } from '../core/artifact-graph/schema.js';
import type { SchemaYaml, Artifact } from '../core/artifact-graph/types.js';
import { FileSystemUtils } from '../utils/file-system.js';

/**
 * Schema 源位置类型
 */
type SchemaSource = 'project' | 'user' | 'package';

/**
 * 检查 schema 位置的结果
 */
interface SchemaLocation {
  source: SchemaSource;
  path: string;
  exists: boolean;
}

/**
 * Schema 解析信息，包含覆盖（shadowing）详情
 */
interface SchemaResolution {
  name: string;
  source: SchemaSource;
  path: string;
  shadows: Array<{ source: SchemaSource; path: string }>;
}

/**
 * 验证问题结构
 */
interface ValidationIssue {
  level: 'error' | 'warning';
  path: string;
  message: string;
}

/**
 * 检查三个位置中的所有 schema，并返回哪些存在。
 */
function checkAllLocations(
  name: string,
  projectRoot: string
): SchemaLocation[] {
  const locations: SchemaLocation[] = [];

  // 项目位置
  const projectDir = path.join(getProjectSchemasDir(projectRoot), name);
  const projectSchemaPath = path.join(projectDir, 'schema.yaml');
  locations.push({
    source: 'project',
    path: projectDir,
    exists: fs.existsSync(projectSchemaPath),
  });

  // 用户位置
  const userDir = path.join(getUserSchemasDir(), name);
  const userSchemaPath = path.join(userDir, 'schema.yaml');
  locations.push({
    source: 'user',
    path: userDir,
    exists: fs.existsSync(userSchemaPath),
  });

  // 包位置
  const packageDir = path.join(getPackageSchemasDir(), name);
  const packageSchemaPath = path.join(packageDir, 'schema.yaml');
  locations.push({
    source: 'package',
    path: packageDir,
    exists: fs.existsSync(packageSchemaPath),
  });

  return locations;
}

/**
 * 获取 schema 的解析信息，包括覆盖检测。
 */
function getSchemaResolution(
  name: string,
  projectRoot: string
): SchemaResolution | null {
  const locations = checkAllLocations(name, projectRoot);
  const existingLocations = locations.filter((loc) => loc.exists);

  if (existingLocations.length === 0) {
    return null;
  }

  const active = existingLocations[0];
  const shadows = existingLocations.slice(1).map((loc) => ({
    source: loc.source,
    path: loc.path,
  }));

  return {
    name,
    source: active.source,
    path: active.path,
    shadows,
  };
}

/**
 * 获取所有 schema 及其解析信息。
 */
function getAllSchemasWithResolution(
  projectRoot: string
): SchemaResolution[] {
  const schemaNames = listSchemas(projectRoot);
  const results: SchemaResolution[] = [];

  for (const name of schemaNames) {
    const resolution = getSchemaResolution(name, projectRoot);
    if (resolution) {
      results.push(resolution);
    }
  }

  return results;
}

/**
 * 验证 schema 并返回问题。
 */
function validateSchema(
  schemaDir: string,
  verbose: boolean = false
): { valid: boolean; issues: ValidationIssue[] } {
  const issues: ValidationIssue[] = [];
  const schemaPath = path.join(schemaDir, 'schema.yaml');

  // 检查 schema.yaml 是否存在
  if (verbose) {
    console.log('  正在检查 schema.yaml 是否存在...');
  }
  if (!fs.existsSync(schemaPath)) {
    issues.push({
      level: 'error',
      path: 'schema.yaml',
      message: '未找到 schema.yaml',
    });
    return { valid: false, issues };
  }

  // 解析 YAML
  if (verbose) {
    console.log('  正在解析 YAML...');
  }
  let content: string;
  try {
    content = fs.readFileSync(schemaPath, 'utf-8');
  } catch (err) {
    issues.push({
      level: 'error',
      path: 'schema.yaml',
      message: `读取文件失败：${(err as Error).message}`,
    });
    return { valid: false, issues };
  }

  // 根据 Zod schema 验证
  if (verbose) {
    console.log('  正在验证 schema 结构...');
  }
  let schema: SchemaYaml;
  try {
    schema = parseSchema(content);
  } catch (err) {
    if (err instanceof SchemaValidationError) {
      issues.push({
        level: 'error',
        path: 'schema.yaml',
        message: err.message,
      });
    } else {
      issues.push({
        level: 'error',
        path: 'schema.yaml',
        message: `解析错误：${(err as Error).message}`,
      });
    }
    return { valid: false, issues };
  }

  // 检查模板文件是否存在于运行时使用的同一目录中。
  if (verbose) {
    console.log('  正在检查模板文件...');
  }
  for (const artifact of schema.artifacts) {
    const templatesDir = path.join(schemaDir, 'templates');
    const existingTemplatePath = path.join(templatesDir, artifact.template);

    if (!fs.existsSync(existingTemplatePath)) {
      issues.push({
        level: 'error',
        path: `artifacts.${artifact.id}.template`,
        message: `找不到 artifact '${artifact.id}' 的模板文件 '${artifact.template}'`,
      });
      continue;
    }

    try {
      FileSystemUtils.assertPathWithin(templatesDir, existingTemplatePath);
    } catch {
      issues.push({
        level: 'error',
        path: `artifacts.${artifact.id}.template`,
        message: `模板文件 '${artifact.template}' 指向了 schema 模板目录之外的路径`,
      });
    }
  }

  // 依赖图验证已由 parseSchema 完成
  // （它会在循环引用和无效引用时抛出异常）
  if (verbose) {
    console.log('  依赖图验证通过（通过 parseSchema）');
  }

  return { valid: issues.length === 0, issues };
}

/**
 * 验证 schema 名称格式（kebab-case）。
 */
function isValidSchemaName(name: string): boolean {
  return /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/.test(name);
}

/**
 * 递归复制目录。
 */
function resolveSchemaCopyPath(allowedRoot: string, sourcePath: string): string {
  try {
    const canonicalRoot = fs.realpathSync(allowedRoot);
    const canonicalPath = fs.realpathSync(sourcePath);
    FileSystemUtils.assertPathWithin(canonicalRoot, canonicalPath);
    return canonicalPath;
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(
      `无法 fork 具有链接或不支持条目的 schema：${sourcePath}：${detail}`,
      { cause: error }
    );
  }
}

function copyDirRecursive(
  src: string,
  dest: string,
  allowedRoot = src,
  ancestors = new Set<string>()
): void {
  const canonicalSrc = resolveSchemaCopyPath(allowedRoot, src);
  if (ancestors.has(canonicalSrc)) {
    throw new Error(`无法 fork 具有链接目录循环的 schema：${src}`);
  }
  ancestors.add(canonicalSrc);
  fs.mkdirSync(dest, { recursive: true });

  try {
    const entries = fs.readdirSync(src, { withFileTypes: true });
    for (const entry of entries) {
      const srcPath = path.join(src, entry.name);
      const destPath = path.join(dest, entry.name);
      const canonicalEntry = resolveSchemaCopyPath(allowedRoot, srcPath);
      const stats = fs.statSync(canonicalEntry);

      if (stats.isDirectory()) {
        copyDirRecursive(canonicalEntry, destPath, allowedRoot, ancestors);
      } else if (stats.isFile()) {
        // 解引用受限链接，使 fork 成为独立的 schema。
        fs.copyFileSync(canonicalEntry, destPath);
      } else {
        throw new Error(`无法 fork 具有链接或不支持条目的 schema：${srcPath}`);
      }
    }
  } finally {
    ancestors.delete(canonicalSrc);
  }
}

/**
 * 在替换或创建 fork 目标之前验证 schema 树。
 */
function assertSchemaTreeCanBeCopied(
  src: string,
  allowedRoot = src,
  ancestors = new Set<string>()
): void {
  const canonicalSrc = resolveSchemaCopyPath(allowedRoot, src);
  if (ancestors.has(canonicalSrc)) {
    throw new Error(`无法 fork 具有链接目录循环的 schema：${src}`);
  }
  ancestors.add(canonicalSrc);

  try {
    for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
      const entryPath = path.join(src, entry.name);
      const canonicalEntry = resolveSchemaCopyPath(allowedRoot, entryPath);
      const stats = fs.statSync(canonicalEntry);
      if (stats.isDirectory()) {
        assertSchemaTreeCanBeCopied(canonicalEntry, allowedRoot, ancestors);
      } else if (!stats.isFile()) {
        throw new Error(`Cannot fork schema with linked or unsupported entry: ${entryPath}`);
      }
    }
  } finally {
    ancestors.delete(canonicalSrc);
  }
}

/**
 * 生成目录的稳定内容指纹：对每个文件的相对路径
 * 及其字节内容（加上目录路径）进行 SHA-256 哈希，按排序顺序遍历。
 * 具有字节级相同树的两个目录会产生相同的摘要，
 * 并且文件内容、大小或路径集合的任何更改都会改变摘要。
 * 用于检测在授权覆盖和实际移动/删除之间，fork 目标是否被并发修改，
 * 以确保这些更改永远不会被静默销毁。
 */
function fingerprintDir(dir: string): string {
  const hash = createHash('sha256');
  const walk = (current: string, rel: string): void => {
    const entries = fs
      .readdirSync(current, { withFileTypes: true })
      .sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
    for (const entry of entries) {
      const abs = path.join(current, entry.name);
      const relPath = rel ? `${rel}/${entry.name}` : entry.name;
      // 使用 readdir 的条目类型（无需单独的 lstat），然后直接读取文件
      // —— 避免了 stat-then-read 的检查/使用竞争。大小从实际读取的字节派生，
      // 因此摘要仍覆盖内容和长度。
      if (entry.isDirectory()) {
        hash.update(`D:${relPath}\n`);
        walk(abs, relPath);
      } else if (entry.isFile()) {
        const contents = fs.readFileSync(abs);
        hash.update(`F:${relPath}:${contents.length}:`);
        hash.update(contents);
        hash.update('\n');
      } else {
        // 符号链接/其他条目类型：记录类型 + 路径（以及可读时的链接
        // 目标），以便即使将一个替换为另一个也能被检测到。
        let target = '';
        try {
          target = fs.readlinkSync(abs);
        } catch {
          // 非符号链接或无法读取的目标；下面的类型标记已足够。
        }
        hash.update(`O:${relPath}:${target}\n`);
      }
    }
  };
  walk(dir, '');
  return hash.digest('hex');
}

/**
 * schema 初始化的默认 artifact 及其描述。
 */
const DEFAULT_ARTIFACTS: Array<{
  id: string;
  description: string;
  generates: string;
  template: string;
}> = [
  {
    id: 'proposal',
    description: '变更的高层描述、动机和范围',
    generates: 'proposal.md',
    template: 'proposal.md',
  },
  {
    id: 'specs',
    description: '包含需求和场景的详细规范',
    generates: 'specs/**/*.md',
    template: 'specs/spec.md',
  },
  {
    id: 'design',
    description: '技术设计决策和实现方法',
    generates: 'design.md',
    template: 'design.md',
  },
  {
    id: 'tasks',
    description: '带有可跟踪任务的实现清单',
    generates: 'tasks.md',
    template: 'tasks.md',
  },
];

/**
 * 注册 schema 命令及其所有子命令。
 */
export function registerSchemaCommand(program: Command): void {
  const schemaCmd = program
    .command('schema')
    .description('管理 workflow schema [实验性]');

  // 实验性警告
  schemaCmd.hook('preAction', () => {
    console.error('注意：Schema 命令是实验性的，可能会发生变化。');
  });

  // schema which
  schemaCmd
    .command('which [name]')
    .description('显示 schema 从哪里解析')
    .option('--json', '以 JSON 格式输出')
    .option('--all', '列出所有 schema 及其解析来源')
    .action(async (name?: string, options?: { json?: boolean; all?: boolean }) => {
      try {
        const projectRoot = process.cwd();

        if (options?.all) {
          // 列出所有 schema
          const schemas = getAllSchemasWithResolution(projectRoot);

          if (options?.json) {
            console.log(JSON.stringify(schemas, null, 2));
          } else {
            if (schemas.length === 0) {
              console.log('未找到任何 schema。');
              return;
            }

            // 按来源分组
            const bySource = {
              project: schemas.filter((s) => s.source === 'project'),
              user: schemas.filter((s) => s.source === 'user'),
              package: schemas.filter((s) => s.source === 'package'),
            };

            if (bySource.project.length > 0) {
              console.log('\n项目 schema：');
              for (const schema of bySource.project) {
                const shadowInfo = schema.shadows.length > 0
                  ? ` (覆盖：${schema.shadows.map((s) => s.source).join(', ')})`
                  : '';
                console.log(`  ${schema.name}${shadowInfo}`);
              }
            }

            if (bySource.user.length > 0) {
              console.log('\n用户 schema：');
              for (const schema of bySource.user) {
                const shadowInfo = schema.shadows.length > 0
                  ? ` (覆盖：${schema.shadows.map((s) => s.source).join(', ')})`
                  : '';
                console.log(`  ${schema.name}${shadowInfo}`);
              }
            }

            if (bySource.package.length > 0) {
              console.log('\n包 schema：');
              for (const schema of bySource.package) {
                console.log(`  ${schema.name}`);
              }
            }
          }
          return;
        }

        if (!name) {
          console.error('错误：需要 schema 名称（或使用 --all 列出所有 schema）');
          process.exitCode = 1;
          return;
        }

        const resolution = getSchemaResolution(name, projectRoot);

        if (!resolution) {
          const available = listSchemas(projectRoot);
          if (options?.json) {
            console.log(JSON.stringify({
              error: `未找到 schema '${name}'`,
              available,
            }, null, 2));
          } else {
            console.error(`错误：未找到 schema '${name}'`);
            console.error(`可用的 schema：${available.join(', ')}`);
          }
          process.exitCode = 1;
          return;
        }

        if (options?.json) {
          console.log(JSON.stringify(resolution, null, 2));
        } else {
          console.log(`Schema：${resolution.name}`);
          console.log(`来源：${resolution.source}`);
          console.log(`路径：${resolution.path}`);

          if (resolution.shadows.length > 0) {
            console.log('\n覆盖：');
            for (const shadow of resolution.shadows) {
              console.log(`  ${shadow.source}: ${shadow.path}`);
            }
          }
        }
      } catch (error) {
        console.error(`错误：${(error as Error).message}`);
        process.exitCode = 1;
      }
    });

  // schema validate
  schemaCmd
    .command('validate [name]')
    .description('验证 schema 结构和模板')
    .option('--json', '以 JSON 格式输出')
    .option('--verbose', '显示详细验证步骤')
    .action(async (name?: string, options?: { json?: boolean; verbose?: boolean }) => {
      try {
        const projectRoot = process.cwd();

        if (!name) {
          // 验证所有项目 schema
          const projectSchemasDir = getProjectSchemasDir(projectRoot);

          if (!fs.existsSync(projectSchemasDir)) {
            if (options?.json) {
              console.log(JSON.stringify({
                valid: true,
                message: '未找到项目 schema 目录',
                schemas: [],
              }, null, 2));
            } else {
              console.log('未找到项目 schema 目录。');
            }
            return;
          }

          const entries = fs.readdirSync(projectSchemasDir, { withFileTypes: true });
          const schemaResults: Array<{
            name: string;
            path: string;
            valid: boolean;
            issues: ValidationIssue[];
          }> = [];

          let anyInvalid = false;

          for (const entry of entries) {
            if (!isSchemaDir(projectSchemasDir, entry)) continue;

            const schemaDir = path.join(projectSchemasDir, entry.name);
            const schemaPath = path.join(schemaDir, 'schema.yaml');

            if (!fs.existsSync(schemaPath)) continue;

            if (options?.verbose && !options?.json) {
              console.log(`\n正在验证 ${entry.name}...`);
            }

            const result = validateSchema(schemaDir, options?.verbose && !options?.json);
            schemaResults.push({
              name: entry.name,
              path: schemaDir,
              valid: result.valid,
              issues: result.issues,
            });

            if (!result.valid) {
              anyInvalid = true;
            }
          }

          if (options?.json) {
            console.log(JSON.stringify({
              valid: !anyInvalid,
              schemas: schemaResults,
            }, null, 2));
          } else {
            if (schemaResults.length === 0) {
              console.log('项目中未找到 schema。');
              return;
            }

            console.log('\n验证结果：');
            for (const result of schemaResults) {
              const status = result.valid ? '✓' : '✗';
              console.log(`  ${status} ${result.name}`);
              for (const issue of result.issues) {
                console.log(`    ${issue.level}: ${issue.message}`);
              }
            }
          }

          if (anyInvalid) {
            process.exitCode = 1;
          }
          return;
        }

        // 验证特定 schema
        const schemaDir = getSchemaDir(name, projectRoot);

        if (!schemaDir) {
          const available = listSchemas(projectRoot);
          if (options?.json) {
            console.log(JSON.stringify({
              valid: false,
              error: `未找到 schema '${name}'`,
              available,
            }, null, 2));
          } else {
            console.error(`错误：未找到 schema '${name}'`);
            console.error(`可用的 schema：${available.join(', ')}`);
          }
          process.exitCode = 1;
          return;
        }

        if (options?.verbose && !options?.json) {
          console.log(`正在验证 ${name}...`);
        }

        const result = validateSchema(schemaDir, options?.verbose && !options?.json);

        if (options?.json) {
          console.log(JSON.stringify({
            name,
            path: schemaDir,
            valid: result.valid,
            issues: result.issues,
          }, null, 2));
        } else {
          if (result.valid) {
            console.log(`✓ schema '${name}' 有效`);
          } else {
            console.log(`✗ schema '${name}' 有错误：`);
            for (const issue of result.issues) {
              console.log(`  ${issue.level}: ${issue.message}`);
            }
          }
        }
        if (!result.valid) {
          process.exitCode = 1;
        }
      } catch (error) {
        if (options?.json) {
          console.log(JSON.stringify({
            valid: false,
            error: (error as Error).message,
          }, null, 2));
        } else {
          console.error(`错误：${(error as Error).message}`);
        }
        process.exitCode = 1;
      }
    });

  // schema fork
  schemaCmd
    .command('fork <source> [name]')
    .description('复制现有 schema 到项目中进行自定义')
    .option('--json', '以 JSON 格式输出')
    .option('--force', '覆盖现有目标')
    .action(async (source: string, name?: string, options?: { json?: boolean; force?: boolean }) => {
      const spinner = options?.json ? null : ora();

      try {
        const projectRoot = process.cwd();
        const destinationName = name || `${source}-custom`;

        // 验证目标名称
        if (!isValidSchemaName(destinationName)) {
          if (options?.json) {
            console.log(JSON.stringify({
              forked: false,
              error: `无效的 schema 名称 '${destinationName}'。请使用 kebab-case（如 my-workflow）`,
            }, null, 2));
          } else {
            console.error(`错误：无效的 schema 名称 '${destinationName}'`);
            console.error('Schema 名称必须为 kebab-case（如 my-workflow）');
          }
          process.exitCode = 1;
          return;
        }

        // 查找源 schema
        const sourceDir = getSchemaDir(source, projectRoot);
        if (!sourceDir) {
          const available = listSchemas(projectRoot);
          if (options?.json) {
            console.log(JSON.stringify({
              forked: false,
              error: `未找到 schema '${source}'`,
              available,
            }, null, 2));
          } else {
            console.error(`错误：未找到 schema '${source}'`);
            console.error(`可用的 schema：${available.join(', ')}`);
          }
          process.exitCode = 1;
          return;
        }

        // 确定源位置
        const sourceResolution = getSchemaResolution(source, projectRoot);
        const sourceLocation = sourceResolution?.source || 'package';

        // 在强制 fork 删除任何内容之前，先验证完整的源。
        const trustedSourceDir = fs.realpathSync(sourceDir);
        assertSchemaTreeCanBeCopied(trustedSourceDir);

        // 也预先验证源的 schema 内容，以便在 --force 路径可能删除
        // 现有目标之前拒绝结构无效的源。这使 `fork --force` 保持原子性——
        // 不可用的源永远不会破坏有效的目标——与 `schema init` 行为一致，
        // 它在覆盖之前也进行验证。
        parseSchema(
          fs.readFileSync(path.join(trustedSourceDir, 'schema.yaml'), 'utf-8')
        );

        // 检查目标
        const schemasDir = getProjectSchemasDir(projectRoot);
        const destinationDir = path.join(schemasDir, destinationName);

        // 拒绝自我 fork。将 schema fork 到自身并使用 --force 会
        // 在下面的替换步骤中删除源，然后复制失败，从而破坏 schema 的唯一副本。
        // 将两侧解析为实际路径（realpathSync 遵循符号链接；path.resolve
        // 仅用于尚不存在的目标的回退），以便仍能捕获符号链接或 `.`/`..` 拼写的同一目录。
        const resolvedDestination = fs.existsSync(destinationDir)
          ? fs.realpathSync(destinationDir)
          : path.resolve(destinationDir);
        if (resolvedDestination === trustedSourceDir) {
          throw new Error(
            `无法将 schema '${source}' fork 到自身；请选择不同的目标名称`
          );
        }

        const destinationExists = fs.existsSync(destinationDir);
        if (destinationExists && !options?.force) {
          if (options?.json) {
            console.log(JSON.stringify({
              forked: false,
              error: `schema '${destinationName}' 已存在`,
              suggestion: '使用 --force 覆盖',
            }, null, 2));
          } else {
            console.error(`错误：schema '${destinationName}' 在 ${destinationDir} 已存在`);
            console.error('使用 --force 覆盖');
          }
          process.exitCode = 1;
          return;
        }

        // 在我们花时间暂存之前，先对用户授权覆盖的目标进行指纹识别。
        // 暂存可能需要一段时间，在此期间并发进程可能会编辑目标；
        // 指纹使我们能够检测到这种变化并中止，而不是悄悄覆盖它。
        const authorizedDestinationFingerprint = destinationExists
          ? fingerprintDir(destinationDir)
          : null;

        // 首先在临时兄弟目录中暂存完整的 fork，然后
        // 将其交换到位。这使 `fork --force` 保持原子性：现有
        // 目标仅在新 fork 完全复制、名称更新并（通过上面的预先 parseSchema）
        // 验证后才会被移除。暂存期间的任何失败都使源和现有目标保持原样。
        if (spinner) spinner.start(`正在将 '${source}' fork 到 '${destinationName}'...`);
        fs.mkdirSync(schemasDir, { recursive: true });
        const stagingDir = fs.mkdtempSync(path.join(schemasDir, '.fork-staging-'));
        try {
          copyDirRecursive(trustedSourceDir, stagingDir);

          // 通过 yaml 的 Document API 更新暂存的 schema.yaml 中的名称
          // 而不是重新序列化解析后的对象，以便源 schema.yaml 中的
          // 块标量、注释和键顺序在 fork 后得以保留。
          const stagedSchemaPath = path.join(stagingDir, 'schema.yaml');
          const schemaContent = fs.readFileSync(stagedSchemaPath, 'utf-8');
          const doc = parseDocument(schemaContent);
          doc.set('name', destinationName);
          fs.writeFileSync(stagedSchemaPath, doc.toString());

          // 权威关卡：验证完整的暂存 schema —— 我们即将安装的确切字节，
          // 而不仅仅是预检查时的源。copyDirRecursive 读取的源文件
          // 可能在复制过程中发生变化，因此最初有效的源仍可能产生
          // 无效的暂存 fork。在此处验证，在任何破坏性步骤之前，
          // 确保我们永远不会安装无效的 fork 或为其删除有效的目标。
          try {
            parseSchema(fs.readFileSync(stagedSchemaPath, 'utf-8'));
          } catch (validationError) {
            throw new Error(
              `'${source}' 的暂存 fork 不是有效的 schema（源可能在复制过程中发生了变化）；` +
                `已中止，'${destinationName}' 未被修改。`,
              { cause: validationError }
            );
          }

          // 将暂存的 fork 交换到位。当目标已存在时，
          // 先将其移至兄弟备份位置，然后安装暂存的
          // fork；仅在安装成功后才丢弃备份。如果
          // 安装重命名本身失败（例如 Windows 锁），则将备份
          // 移回，使用户的原始目标永不丢失。
          if (destinationExists) {
            if (spinner) spinner.text = `正在替换现有 schema '${destinationName}'...`;

            // 在破坏性移动之前立即重新验证：如果
            // 目标在我们暂存期间在磁盘上发生了变化（或被删除），
            // 其指纹不再与用户授权的内容匹配。中止，
            // 不触碰它，以保留并发更改。外层 catch 清理暂存。
            const currentFingerprint = fs.existsSync(destinationDir)
              ? fingerprintDir(destinationDir)
              : null;
            if (currentFingerprint !== authorizedDestinationFingerprint) {
              throw new Error(
                `schema '${destinationName}' 在 fork 准备期间在磁盘上发生了变化。` +
                  `已中止以保留这些并发更改；未覆盖任何内容。请重新运行 fork 以覆盖当前内容。`
              );
            }

            const backupDir = `${destinationDir}.fork-backup-${process.pid}-${Date.now()}`;
            fs.renameSync(destinationDir, backupDir);
            try {
              fs.renameSync(stagingDir, destinationDir);
            } catch (installError) {
              // 安装在原始文件被移开后失败。尝试将其
              // 移回。如果恢复也失败了，原始文件将被遗弃在
              // 备份目录中——显示错误，同时提供备份和
              // 目标路径，以便用户可以手动恢复，并附加
              // 原始安装错误作为原因。永远不要吞没这个错误。
              try {
                fs.renameSync(backupDir, destinationDir);
              } catch (restoreError) {
                throw new Error(
                  `安装 fork 的 schema 失败，且无法恢复之前的 '${destinationName}'。` +
                    `您之前的 schema 保留在 ${backupDir}；将其移回 ${destinationDir} 以恢复。` +
                    `恢复错误：${(restoreError as Error).message}`,
                  { cause: installError }
                );
              }
              throw installError;
            }

            // 在丢弃备份前重新验证：仅当它仍然是
            // 我们移开的原始目标的逐字节副本时才删除它。如果它
            // 在安装窗口期间发生了变化（写入移开的目录），
            // 则不要删除它——保留原位并显示其位置，以确保无丢失。
            if (fingerprintDir(backupDir) === authorizedDestinationFingerprint) {
              fs.rmSync(backupDir, { recursive: true, force: true });
            } else {
              console.error(
                `警告：之前的 '${destinationName}' 在 fork 期间发生了变化，未被删除；` +
                  `其 fork 前副本保留在 ${backupDir}。`
              );
            }
          } else {
            fs.renameSync(stagingDir, destinationDir);
          }
        } catch (error) {
        // 仅删除本次运行中创建的暂存目录；源
        // 和任何现有目标都保持我们发现时的状态。
        // 将清理操作放在自己的 try/catch 中，以便失败的删除（例如
        // Windows 上的锁定文件）永远不会掩盖原始错误，然后
        // 重新抛出，使真正的失败仍能驱动 JSON/退出码报告。
        try {
          fs.rmSync(stagingDir, { recursive: true, force: true });
        } catch {
          // 尽力清理；下面的原始错误才是关键。
        }
        throw error;
      }

      if (spinner) spinner.succeed(`已将 '${source}' fork 为 '${destinationName}'`);

        if (options?.json) {
          console.log(JSON.stringify({
            forked: true,
            source,
            sourcePath: sourceDir,
            sourceLocation,
            destination: destinationName,
            destinationPath: destinationDir,
          }, null, 2));
        } else {
          console.log(`\n源：${sourceDir} (${sourceLocation})`);
          console.log(`目标：${destinationDir}`);
          console.log(`\n现在可以在以下位置自定义 schema：`);
          console.log(`  ${destinationDir}/schema.yaml`);
        }
      } catch (error) {
        if (spinner) spinner.fail(`Fork 失败`);
        if (options?.json) {
          console.log(JSON.stringify({
            forked: false,
            error: (error as Error).message,
          }, null, 2));
        } else {
          console.error(`错误：${(error as Error).message}`);
        }
        process.exitCode = 1;
      }
    });

  // schema init
  schemaCmd
    .command('init <name>')
    .description('创建新的项目本地 schema')
    .option('--json', '以 JSON 格式输出')
    .option('--description <text>', 'schema 描述')
    .option('--artifacts <list>', '逗号分隔的 artifact ID（proposal,specs,design,tasks）')
    .option('--default', '设为项目默认 schema')
    .option('--no-default', '不提示设为默认')
    .option('--force', '覆盖现有 schema')
    .action(async (
      name: string,
      options?: {
        json?: boolean;
        description?: string;
        artifacts?: string;
        default?: boolean;
        force?: boolean;
      }
    ) => {
      const spinner = options?.json ? null : ora();

      try {
        const projectRoot = process.cwd();

        // 验证名称
        if (!isValidSchemaName(name)) {
          if (options?.json) {
            console.log(JSON.stringify({
              created: false,
              error: `无效的 schema 名称 '${name}'。请使用 kebab-case（如 my-workflow）`,
            }, null, 2));
          } else {
            console.error(`错误：无效的 schema 名称 '${name}'`);
            console.error('Schema 名称必须为 kebab-case（如 my-workflow）');
          }
          process.exitCode = 1;
          return;
        }

        const schemaDir = path.join(getProjectSchemasDir(projectRoot), name);

        // 检查覆盖权限，不修改目标
        const schemaExists = fs.existsSync(schemaDir);
        if (schemaExists) {
          if (!options?.force) {
            if (options?.json) {
              console.log(JSON.stringify({
                created: false,
                error: `schema '${name}' 已存在`,
                suggestion: '使用 --force 覆盖或使用 "openspec schema fork" 复制',
              }, null, 2));
            } else {
              console.error(`错误：schema '${name}' 在 ${schemaDir} 已存在`);
              console.error('使用 --force 覆盖或使用 "openspec schema fork" 复制');
            }
            process.exitCode = 1;
            return;
          }
        }

        // 确定 artifacts 和描述
        let description: string;
        let selectedArtifactIds: string[];

        // 检查是否有明确的标志（非交互模式）
        const hasExplicitOptions = options?.description !== undefined || options?.artifacts !== undefined;
        const isInteractive = !options?.json && !hasExplicitOptions && process.stdout.isTTY;

        if (isInteractive) {
          // 交互模式
          const { input, checkbox, confirm } = await import('@inquirer/prompts');

          description = await input({
            message: 'Schema 描述：',
            default: `${name} 的自定义 workflow schema`,
          });

          const artifactChoices = DEFAULT_ARTIFACTS.map((a) => ({
            name: a.id,
            value: a.id,
            checked: true,
          }));

          selectedArtifactIds = await checkbox({
            message: '选择要包含的 artifacts：',
            theme: {
              icon: {
                checked: '[x]',
                unchecked: '[ ]',
              },
            },
            choices: artifactChoices,
          });

          if (selectedArtifactIds.length === 0) {
            console.error('错误：必须至少选择一个 artifact');
            process.exitCode = 1;
            return;
          }

          // 询问是否设为默认（除非传递了 --no-default）
          if (options?.default === undefined) {
            const setAsDefault = await confirm({
              message: '是否设为项目默认 schema？',
              default: false,
            });

            if (setAsDefault) {
              options = { ...options, default: true };
            }
          }
        } else {
          // 非交互模式
          description = options?.description || `${name} 的自定义 workflow schema`;

          if (options?.artifacts) {
            selectedArtifactIds = options.artifacts.split(',').map((a) => a.trim());

            // 验证 artifact ID
            const validIds = DEFAULT_ARTIFACTS.map((a) => a.id);
            for (const id of selectedArtifactIds) {
              if (!validIds.includes(id)) {
                if (options?.json) {
                  console.log(JSON.stringify({
                    created: false,
                    error: `未知的 artifact '${id}'`,
                    valid: validIds,
                  }, null, 2));
                } else {
                  console.error(`错误：未知的 artifact '${id}'`);
                  console.error(`有效的 artifacts：${validIds.join(', ')}`);
                }
                process.exitCode = 1;
                return;
              }
            }
          } else {
            // 默认使用所有 artifacts
            selectedArtifactIds = DEFAULT_ARTIFACTS.map((a) => a.id);
          }
        }

        // Build artifacts array with proper dependencies
        const selectedArtifacts = selectedArtifactIds.map((id) => {
          const template = DEFAULT_ARTIFACTS.find((a) => a.id === id)!;
          const artifact: Artifact = {
            id: template.id,
            generates: template.generates,
            description: template.description,
            template: template.template,
            requires: [],
          };

          // 根据典型 workflow 建立依赖关系
          if (id === 'specs' && selectedArtifactIds.includes('proposal')) {
            artifact.requires = ['proposal'];
          } else if (id === 'design' && selectedArtifactIds.includes('specs')) {
            artifact.requires = ['specs'];
          } else if (id === 'tasks') {
            const requires: string[] = [];
            if (selectedArtifactIds.includes('design')) requires.push('design');
            else if (selectedArtifactIds.includes('specs')) requires.push('specs');
            artifact.requires = requires;
          }

          return artifact;
        });

        // 创建 schema.yaml
        const schema: SchemaYaml = {
          name,
          version: 1,
          description,
          artifacts: selectedArtifacts,
        };

        // 如果包含 tasks，则添加 apply 阶段
        if (selectedArtifactIds.includes('tasks')) {
          schema.apply = {
            requires: ['tasks'],
            tracks: 'tasks.md',
          };
        }

        // 在收集并验证所有输入后才替换
        if (schemaExists) {
          if (spinner) spinner.start(`正在删除现有 schema '${name}'...`);
          fs.rmSync(schemaDir, { recursive: true });
        }

        // 创建 schema 目录
        if (spinner) spinner.start(`正在创建 schema '${name}'...`);
        fs.mkdirSync(schemaDir, { recursive: true });

        fs.writeFileSync(
          path.join(schemaDir, 'schema.yaml'),
          stringifyYaml(schema)
        );

        // 在 templates/ 子目录中创建模板文件（标准位置）
        const templatesDir = path.join(schemaDir, 'templates');
        for (const artifact of selectedArtifacts) {
          const templatePath = path.join(templatesDir, artifact.template);
          const templateDir = path.dirname(templatePath);

          if (!fs.existsSync(templateDir)) {
            fs.mkdirSync(templateDir, { recursive: true });
          }

          // 创建默认模板内容
          const templateContent = createDefaultTemplate(artifact.id);
          fs.writeFileSync(templatePath, templateContent);
        }

        // 如果 --default，则更新配置
        if (options?.default) {
          const configPath = path.join(projectRoot, 'openspec', 'config.yaml');

          if (fs.existsSync(configPath)) {
            const { parse: parseYaml, stringify: stringifyYaml2 } = await import('yaml');
            const configContent = fs.readFileSync(configPath, 'utf-8');
            const config = parseYaml(configContent) || {};
            config.defaultSchema = name;
            fs.writeFileSync(configPath, stringifyYaml2(config));
          } else {
            // 创建配置文件
            const configDir = path.dirname(configPath);
            if (!fs.existsSync(configDir)) {
              fs.mkdirSync(configDir, { recursive: true });
            }
            fs.writeFileSync(configPath, stringifyYaml({ defaultSchema: name }));
          }
        }

        if (spinner) spinner.succeed(`已创建 schema '${name}'`);

        if (options?.json) {
          console.log(JSON.stringify({
            created: true,
            path: schemaDir,
            schema: name,
            artifacts: selectedArtifactIds,
            setAsDefault: options?.default || false,
          }, null, 2));
        } else {
          console.log(`\nSchema 创建于：${schemaDir}`);
          console.log(`\nArtifacts：${selectedArtifactIds.join(', ')}`);
          if (options?.default) {
            console.log(`\n已设为项目默认 schema。`);
          }
          console.log(`\n后续步骤：`);
          console.log(`  1. 编辑 ${schemaDir}/schema.yaml 以自定义 artifacts`);
          console.log(`  2. 修改 schema 目录中的模板`);
          console.log(`  3. 使用方式：openspec new --schema ${name}`);
        }
      } catch (error) {
        if (spinner) spinner.fail(`创建失败`);
        if (options?.json) {
          console.log(JSON.stringify({
            created: false,
            error: (error as Error).message,
          }, null, 2));
        } else {
          console.error(`错误：${(error as Error).message}`);
        }
        process.exitCode = 1;
      }
    });
}

/**
 * 为 artifact 创建默认模板内容。
 */
function createDefaultTemplate(artifactId: string): string {
  switch (artifactId) {
    case 'proposal':
      return `## Why

<!-- Describe the motivation for this change -->

## What Changes

<!-- Describe what will change -->

## Capabilities

### New Capabilities
<!-- List new capabilities -->

### Modified Capabilities
<!-- List modified capabilities -->

## Impact

<!-- Describe the impact on existing functionality -->
`;

    case 'specs':
      return `## ADDED Requirements

### Requirement: Example requirement

Description of the requirement.

#### Scenario: Example scenario
- **WHEN** some condition
- **THEN** some outcome
`;

    case 'design':
      return `## Context

<!-- Background and context -->

## Goals / Non-Goals

**Goals:**
<!-- List goals -->

**Non-Goals:**
<!-- List non-goals -->

## Decisions

### 1. Decision Name

Description and rationale.

**Alternatives considered:**
- Alternative 1: Rejected because...

## Risks / Trade-offs

<!-- List risks and trade-offs -->
`;

    case 'tasks':
      return `## Implementation Tasks

- [ ] Task 1
- [ ] Task 2
- [ ] Task 3
`;

    default:
      return `## ${artifactId}

<!-- Add content here -->
`;
  }
}
