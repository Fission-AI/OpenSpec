import { program } from 'commander';
import { existsSync, readFileSync } from 'fs';
import path, { join } from 'path';
import { MarkdownParser } from '../core/parsers/markdown-parser.js';
import { Validator } from '../core/validation/validator.js';
import type { Spec } from '../core/schemas/index.js';
import type { RootOutput } from '../core/root-selection.js';
import { isInteractive } from '../utils/interactive.js';
import { getSpecIds } from '../utils/item-discovery.js';
import { discoverSpecFiles } from '../utils/spec-discovery.js';
import { FileSystemUtils } from '../utils/file-system.js';

const SPECS_DIR = 'openspec/specs';

function assertSpecPath(specsDir: string, specPath: string): void {
  const relativePath = path.relative(path.resolve(specsDir), path.resolve(specPath));
  if (
    relativePath === '..' ||
    relativePath.startsWith(`..${path.sep}`) ||
    path.isAbsolute(relativePath)
  ) {
    throw new Error(`路径不在允许的目录内：${specPath}`);
  }

  try {
    // 保留受限的 spec.md 链接，包括指向同级 capability 的链接。
    FileSystemUtils.assertPathWithin(specsDir, specPath);
  } catch {
    // capability 目录可能故意是 monorepo 符号链接。将其视为
    // 信任根，同时拒绝该 capability 外部的链接。
    FileSystemUtils.assertPathWithin(path.dirname(specPath), specPath);
  }
}

interface ShowOptions {
  json?: boolean;
  // 仅 JSON 过滤器（原始优先的文本模式无过滤器）
  requirements?: boolean;
  scenarios?: boolean; // --no-scenarios 将此设为 false（仅 JSON）
  requirement?: string; // 仅 JSON
  noInteractive?: boolean;
  rootOutput?: RootOutput;
}

function parseSpecFromFile(specsDir: string, specPath: string, specId: string): Spec {
  assertSpecPath(specsDir, specPath);
  const content = readFileSync(specPath, 'utf-8');
  const parser = new MarkdownParser(content);
  return parser.parseSpec(specId);
}

function validateRequirementIndex(spec: Spec, requirementOpt?: string): number | undefined {
  if (!requirementOpt) return undefined;
  const index = Number.parseInt(requirementOpt, 10);
  if (!Number.isInteger(index) || index < 1 || index > spec.requirements.length) {
    throw new Error(`未找到 requirement ${requirementOpt}`);
  }
  return index - 1; // 转换为从 0 开始
}

function filterSpec(spec: Spec, options: ShowOptions): Spec {
  const requirementIndex = validateRequirementIndex(spec, options.requirement);
  const includeScenarios = options.scenarios !== false && !options.requirements;

  const filteredRequirements = (requirementIndex !== undefined
    ? [spec.requirements[requirementIndex]]
    : spec.requirements
  ).map(req => ({
    text: req.text,
    scenarios: includeScenarios ? req.scenarios : [],
  }));

  const metadata = spec.metadata ?? { version: '1.0.0', format: 'openspec' as const };

  return {
    name: spec.name,
    overview: spec.overview,
    requirements: filteredRequirements,
    metadata,
  };
}

/**
 * 打印 spec 文件的原始 markdown 内容，不做任何格式化。
 * 原始优先行为确保文本模式是透传的，以实现确定性输出。
 */
function printSpecTextRaw(specsDir: string, specPath: string): void {
  assertSpecPath(specsDir, specPath);
  const content = readFileSync(specPath, 'utf-8');
  console.log(content);
}

export class SpecCommand {
  private specsDir: string;
  private rootPath?: string;

  // rootPath 仅由根感知调用者（顶层 `show`）设置；
  // 已弃用的名词形式命令保持基于 cwd。
  constructor(rootPath?: string) {
    this.rootPath = rootPath;
    this.specsDir = rootPath ? join(rootPath, 'openspec', 'specs') : SPECS_DIR;
  }

  async show(specId?: string, options: ShowOptions = {}): Promise<void> {
    if (!specId) {
      const canPrompt = isInteractive(options);
      const specIds = await getSpecIds(this.rootPath ?? process.cwd());
      if (canPrompt && specIds.length > 0) {
        const { select } = await import('@inquirer/prompts');
        specId = await select({
          message: '选择要显示的 spec',
          choices: specIds.map(id => ({ name: id, value: id })),
        });
      } else {
        throw new Error('缺少必需的参数 <spec-id>');
      }
    }

    const specPath = join(this.specsDir, specId, 'spec.md');
    assertSpecPath(this.specsDir, specPath);
    if (!existsSync(specPath)) {
      // 根感知调用者获取绝对路径；基于 cwd 的名词形式
      // 在所有平台上保留其历史的正斜杠相对路径消息。
      const displayPath = this.rootPath ? specPath : `openspec/specs/${specId}/spec.md`;
      throw new Error(`未找到 spec '${specId}'，路径：${displayPath}`);
    }

    if (options.json) {
      if (options.requirements && options.requirement) {
        throw new Error('选项 --requirements 和 --requirement 不能同时使用');
      }
      const parsed = parseSpecFromFile(this.specsDir, specPath, specId);
      const filtered = filterSpec(parsed, options);
      const output = {
        id: specId,
        title: parsed.name,
        overview: parsed.overview,
        requirementCount: filtered.requirements.length,
        requirements: filtered.requirements,
        metadata: parsed.metadata ?? { version: '1.0.0', format: 'openspec' as const },
        ...(options.rootOutput ? { root: options.rootOutput } : {}),
      };
      console.log(JSON.stringify(output, null, 2));
      return;
    }
    printSpecTextRaw(this.specsDir, specPath);
  }
}

export function registerSpecCommand(rootProgram: typeof program) {
  const specCommand = rootProgram
    .command('spec')
    .description('管理和查看 OpenSpec 规格');

  // 名词形式命令的弃用通知
  specCommand.hook('preAction', () => {
    console.error('警告："openspec spec ..." 命令已弃用。请优先使用动词优先的命令（例如 "openspec show"、"openspec validate --specs"）。');
  });

  specCommand
    .command('show [spec-id]')
    .description('显示特定规格')
    .option('--json', '以 JSON 格式输出')
    .option('--requirements', '仅 JSON：仅显示 requirements（排除 scenarios）')
    .option('--no-scenarios', '仅 JSON：排除场景内容')
    .option('-r, --requirement <id>', '仅 JSON：按 ID 显示特定 requirement（从 1 开始）')
    .option('--no-interactive', '禁用交互式提示')
    .action(async (specId: string | undefined, options: ShowOptions & { noInteractive?: boolean }) => {
      try {
        const cmd = new SpecCommand();
        await cmd.show(specId, options as any);
      } catch (error) {
        console.error(`错误：${error instanceof Error ? error.message : '未知错误'}`);
        process.exitCode = 1;
      }
    });

  specCommand
    .command('list')
    .description('列出所有可用规格')
    .option('--json', '以 JSON 格式输出')
    .option('--long', '显示 ID 和标题及计数')
    .action(async (options: { json?: boolean; long?: boolean }) => {
      try {
        if (!existsSync(SPECS_DIR)) {
          console.log('未找到项目');
          return;
        }

        const discovered = await discoverSpecFiles(SPECS_DIR);
        const specs = discovered
          .map(({ id, specFile }) => {
            try {
              assertSpecPath(SPECS_DIR, specFile);
              const spec = parseSpecFromFile(SPECS_DIR, specFile, id);

              return {
                id,
                title: spec.name,
                requirementCount: spec.requirements.length
              };
            } catch {
              return {
                id,
                title: id,
                requirementCount: 0
              };
            }
          })
          .sort((a, b) => a.id.localeCompare(b.id));

        if (options.json) {
          console.log(JSON.stringify(specs, null, 2));
        } else {
          if (specs.length === 0) {
            console.log('未找到项目');
            return;
          }
          if (!options.long) {
            specs.forEach(spec => console.log(spec.id));
            return;
          }
          specs.forEach(spec => {
            console.log(`${spec.id}: ${spec.title} [requirements ${spec.requirementCount}]`);
          });
        }
      } catch (error) {
        console.error(`错误：${error instanceof Error ? error.message : '未知错误'}`);
        process.exitCode = 1;
      }
    });

  specCommand
    .command('validate [spec-id]')
    .description('验证规格结构')
    .option('--strict', '启用严格验证模式')
    .option('--json', '以 JSON 格式输出验证报告')
    .option('--no-interactive', '禁用交互式提示')
    .action(async (specId: string | undefined, options: { strict?: boolean; json?: boolean; noInteractive?: boolean }) => {
      try {
        if (!specId) {
          const canPrompt = isInteractive(options);
          const specIds = await getSpecIds();
          if (canPrompt && specIds.length > 0) {
            const { select } = await import('@inquirer/prompts');
            specId = await select({
              message: '选择要验证的 spec',
              choices: specIds.map(id => ({ name: id, value: id })),
            });
          } else {
            throw new Error('缺少必需的参数 <spec-id>');
          }
        }

        const specPath = join(SPECS_DIR, specId, 'spec.md');
        assertSpecPath(SPECS_DIR, specPath);
        
        if (!existsSync(specPath)) {
          throw new Error(`未找到 spec '${specId}'，路径：openspec/specs/${specId}/spec.md`);
        }

        const validator = new Validator(options.strict);
        assertSpecPath(SPECS_DIR, specPath);
        const report = await validator.validateSpec(specPath);

        if (options.json) {
          console.log(JSON.stringify(report, null, 2));
        } else {
          if (report.valid) {
            console.log(`规格 '${specId}' 有效`);
          } else {
            console.error(`规格 '${specId}' 存在问题`);
            report.issues.forEach(issue => {
              const label = issue.level === 'ERROR' ? '错误' : issue.level;
              const prefix = issue.level === 'ERROR' ? '✗' : issue.level === 'WARNING' ? '⚠' : 'ℹ';
              console.error(`${prefix} [${label}] ${issue.path}: ${issue.message}`);
            });
          }
        }
        process.exitCode = report.valid ? 0 : 1;
      } catch (error) {
        console.error(`错误：${error instanceof Error ? error.message : '未知错误'}`);
        process.exitCode = 1;
      }
    });

  return specCommand;
}