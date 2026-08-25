import { asStatus } from '../commands/shared-output.js';
import { Command, Option } from 'commander';
import { createRequire } from 'module';
import ora from 'ora';
import path from 'path';
import { fileURLToPath } from 'url';
import { existsSync, promises as fs } from 'fs';
import { AI_TOOLS, TOOL_ID_ALIASES } from '../core/config.js';
import { UpdateCommand } from '../core/update.js';
import {
  getAvailableCliUpdate,
  displayCliUpdateNote,
  shouldOfferUpgrade,
  getInstallDir,
  offerCliUpgrade,
  rerunUpdateWithUpgradedCli,
  displayUpgradeCommand,
  isSourceCheckout,
} from '../core/version-check.js';
import { ListCommand } from '../core/list.js';
import { ArchiveCommand, type ArchiveOptions } from '../core/archive.js';
import { ViewCommand } from '../core/view.js';
import { resolveRootForCommand, toRootOutput } from '../core/root-selection.js';
import { registerSpecCommand } from '../commands/spec.js';
import { ChangeCommand } from '../commands/change.js';
import { ValidateCommand } from '../commands/validate.js';
import { ShowCommand } from '../commands/show.js';
import { CompletionCommand } from '../commands/completion.js';
import { FeedbackCommand } from '../commands/feedback.js';
import { registerConfigCommand } from '../commands/config.js';
import { registerSchemaCommand } from '../commands/schema.js';
import { registerStoreCommand } from '../commands/store.js';
import { registerDoctorCommand } from '../commands/doctor.js';
import { registerContextCommand } from '../commands/context.js';
import { registerWorksetCommand } from '../commands/workset.js';
import {
  statusCommand,
  instructionsCommand,
  applyInstructionsCommand,
  archiveInstructionsCommand,
  templatesCommand,
  schemasCommand,
  newChangeCommand,
  DEFAULT_SCHEMA,
  type StatusOptions,
  type InstructionsOptions,
  type TemplatesOptions,
  type SchemasOptions,
  type NewChangeOptions,
} from '../commands/workflow/index.js';
import { maybeShowTelemetryNotice, trackCommand, shutdown } from '../telemetry/index.js';
import { maybeShowCompletionTip } from '../core/completion-tip.js';
import { COMMON_FLAGS } from '../core/completions/shared-flags.js';
import { isInteractive } from '../utils/interactive.js';

const STORE_OPTION_DESCRIPTION = COMMON_FLAGS.store.description;

// 有意为之的拒绝路径：--store-path 保持注册（隐藏），以便
// 解析器可以解释注册路径是受支持的方式，
// 而不是让 Commander 发出通用的未知选项错误（或者对于 `show`，
// 通过 allowUnknownOption 静默忽略它）。
function hiddenStorePathOption(): Option {
  return new Option(
    '--store-path <path>',
    '不支持；请使用 "openspec store register <path>" 注册路径，然后使用 --store <id>'
  ).hideHelp();
}

function failWithError(
  error: unknown,
  json?: { enabled: boolean | undefined; payload?: Record<string, unknown>; fallbackCode?: string }
): void {
  // Agent 约定：每个 --json 失败在 stdout 上只输出一个 JSON
  // 文档（命令的 null 结构 + 状态数组）。
  if (json?.enabled) {
    console.log(
      JSON.stringify(
        { ...(json.payload ?? {}), status: [asStatus(error, json.fallbackCode ?? 'command_error')] },
        null,
        2
      )
    );
    process.exitCode = 1;
    return;
  }
  ora().fail(`错误：${(error as Error).message}`);
  // 解析和存储错误带有可复制的修复建议 - 永不丢弃。
  const fix = (error as { diagnostic?: { fix?: string } }).diagnostic?.fix;
  if (fix) {
    console.error(`修复：${fix}`);
  }
  process.exitCode = process.exitCode ?? 1;
}

const program = new Command();
const require = createRequire(import.meta.url);
const { version } = require('../../package.json');

/**
 * 获取嵌套命令的完整命令路径。
 * 例如：'change show' -> 'change:show'
 */
export function getCommandPath(command: Command): string {
  const names: string[] = [];
  let current: Command | null = command;

  while (current) {
    const name = current.name();
    // 跳过根 'openspec' 命令
    if (name && name !== 'openspec') {
      names.unshift(name);
    }
    current = current.parent;
  }

  return names.join(':') || 'openspec';
}

/**
 * 当执行命令请求 JSON 输出时返回 true —— 用于抑制
 * 首次运行的遥测通知，确保 stdout 保持为单个有效 JSON 文档。
 *
 * `--json` 通过三种方式到达命令，因此单个解析选项不够：
 * - 在叶子命令上声明（`openspec status --json`）→ `opts().json`
 * - 在父组上声明并通过 globals 读取（`openspec workset --json list`）
 *   → `optsWithGlobals().json`
 * - 在从未声明该选项的宽松组上作为残余参数
 *   （`openspec store --json`，从 `command.args` 检测）→ `args`
 *
 * 抑制始终是安全的：披露仅被推迟到下一次非 JSON 运行，
 * 永远不会丢失，而在 JSON 运行时打印它会破坏 stdout。
 */
export function isJsonRun(command: Command): boolean {
  return (
    command.optsWithGlobals().json === true ||
    command.args.includes('--json')
  );
}

/**
 * 为服务于 shell 补全的命令返回 true：面向用户的
 * `openspec completion ...` 组和生成补全脚本时在每次 Tab 按键
 * 时调用的隐藏 `__complete` 解析器。对补全提示任一方都是噪声，
 * `__complete` 会使一次性提示不可见地被消耗。
 */
export function isCompletionRun(commandPath: string): boolean {
  return commandPath.split(':')[0] === 'completion' || commandPath === '__complete';
}

/**
 * 当首次运行的补全提示必须被推迟而非显示时返回 true。
 *
 * 推迟使提示保持未消耗状态，以便在后续实际能承载提示的运行中
 * 仍然传递给用户。所有三种情况都是没有人会读取提示的运行：
 * JSON 输出、补全机制本身，以及 stderr 不是终端的情况——管道
 * 和 agent 驱动的运行在这个 CLI 的使用中占主导地位，否则会将
 * 用户的一次性提示消耗在无人查看的日志中。
 */
export function shouldDeferCompletionTip(command: Command, stderrIsTty: boolean): boolean {
  return isJsonRun(command) || isCompletionRun(getCommandPath(command)) || !stderrIsTty;
}

program
  .name('openspec')
  .description('AI 原生的规范驱动开发系统')
  .version(version);

// 全局选项
program.option('--no-color', '禁用彩色输出');

// 在任何命令运行前应用全局标志和遥测
// 注意：preAction 接收 (thisCommand, actionCommand)，其中：
// - thisCommand：添加钩子的命令（根程序）
// - actionCommand：实际执行的命令（子命令）
program.hook('preAction', async (thisCommand, actionCommand) => {
  const opts = thisCommand.opts();
  if (opts.color === false) {
    process.env.NO_COLOR = '1';
  }

  // 显示首次运行的遥测通知（如果未查看）。它写入 stderr，因此
  // 永远不会污染 stdout —— 但 --json 运行仍会推迟它（参见 isJsonRun），
  // 确保第一次调用时不会在任一输出流中产生任何意外输出。
  await maybeShowTelemetryNotice({ silent: isJsonRun(actionCommand) });

  // 跟踪命令执行（使用 actionCommand 获取实际的子命令）
  const commandPath = getCommandPath(actionCommand);

  await trackCommand(commandPath, version);
});

// 命令完成后关闭遥测
program.hook('postAction', async (_thisCommand, actionCommand) => {
  // 显示首次运行的 shell 补全提示（在 stderr 上，因此管道化的 stdout 保持
  // 干净）。postAction，而非 preAction：提示跟随命令自身的输出，
  // 而不是将错误消息或 `init` 的设置摘要推到屏幕下方。
  // 在没有人会读取的情况下推迟（不消耗）：JSON 运行、
  // `openspec completion ...`，以及 stderr 不是终端的情况
  // （agent 和管道否则会静默消耗用户的一次性提示）。
  try {
    await maybeShowCompletionTip({
      silent: shouldDeferCompletionTip(actionCommand, Boolean(process.stderr.isTTY)),
    });
  } finally {
    // 即使提示抛出异常，flush 仍然运行：parse() 是同步的，因此
    // 此处的拒绝在其上没有任何捕获。
    await shutdown();
  }
});

const availableToolIds = AI_TOOLS
  .filter((tool) => tool.skillsDir || tool.globalSkillsDir)
  .map((tool) => tool.value);
const toolAliasNote = Object.entries(TOOL_ID_ALIASES)
  .map(([retired, current]) => `${retired} (now ${current})`)
  .join(', ');
const toolsOptionDescription = `非交互式配置 AI 工具。使用 "all"、"none"，或以逗号分隔的列表：${availableToolIds.join(', ')}。也接受：${toolAliasNote}`;

program
  .command('init [path]')
  .description('在项目中初始化 OpenSpec')
  .option('--tools <tools>', toolsOptionDescription)
  .option('--language <language>', '以指定语言编写新的 OpenSpec 制品')
  .option('--force', '自动清理遗留文件而不提示')
  .option('--profile <profile>', '覆盖全局配置配置文件（core 或自定义）')
  .option('--no-animation', '显示静态欢迎界面而非动画版本')
  .option('--copilot-cloud', '设置 GitHub Copilot 云编码代理文件而不提示')
  .option('--no-copilot-cloud', '跳过 GitHub Copilot 云编码代理文件而不提示')
  .action(async (targetPath = '.', options?: { tools?: string; language?: string; force?: boolean; profile?: string; animation?: boolean; copilotCloud?: boolean }) => {
    try {
      // 验证路径是否为有效目录
      const resolvedPath = path.resolve(targetPath);

      try {
        const stats = await fs.stat(resolvedPath);
        if (!stats.isDirectory()) {
          throw new Error(`路径 "${targetPath}" 不是目录`);
        }
      } catch (error: any) {
        if (error.code === 'ENOENT') {
          // 目录不存在，但我们可以创建它
          console.log(`目录 "${targetPath}" 不存在，将会被创建。`);
        } else if (error.message && error.message.includes('not a directory')) {
          throw error;
        } else {
          throw new Error(`无法访问路径 "${targetPath}"：${error.message}`);
        }
      }

      const { InitCommand } = await import('../core/init.js');
      const initCommand = new InitCommand({
        tools: options?.tools,
        language: options?.language,
        force: options?.force,
        profile: options?.profile,
        animation: options?.animation,
        copilotCloud: options?.copilotCloud,
      });
      await initCommand.execute(targetPath);
    } catch (error) {
      failWithError(error);
      process.exit(1);
    }
  });

// 隐藏别名：'experimental' -> 'init' 用于向后兼容
program
  .command('experimental', { hidden: true })
  .description('init 的别名（已弃用）')
  .option('--tool <tool-id>', '目标 AI 工具（映射到 --tools）')
  .option('--no-interactive', '禁用交互式提示')
  .action(async (options?: { tool?: string; noInteractive?: boolean }) => {
    try {
      console.log('注意："openspec experimental" 已弃用。请改用 "openspec init"。');
      const { InitCommand } = await import('../core/init.js');
      const initCommand = new InitCommand({
        tools: options?.tool,
        interactive: options?.noInteractive === true ? false : undefined,
      });
      await initCommand.execute('.');
    } catch (error) {
      failWithError(error);
      process.exit(1);
    }
  });

program
  .command('update [path]')
  .description('更新 OpenSpec 指令文件')
  .option('--force', '即使工具是最新的也强制更新')
  .action(async (targetPath = '.', options?: { force?: boolean }) => {
    try {
      const installDir = getInstallDir();
      // 从克隆运行：版本取决于分支，因此任何升级建议都是噪声。
      // 在请求之前决定，确保贡献者不会等待被丢弃的答案。
      const latestVersion = isSourceCheckout(installDir) ? null : await getAvailableCliUpdate();
      const announce = latestVersion !== null;
      // 先提供升级：此进程从自身模板生成文件，因此之后升级会留下旧文件在磁盘上。
      // 两个流都必须是终端——如果 stdout 被重定向，问题会出现在文件中，
      // 用户将在空白屏幕前等待。
      const canOffer =
        announce &&
        shouldOfferUpgrade({
          installDir,
          projectPath: targetPath,
          interactive: isInteractive(),
          stdoutIsTty: Boolean(process.stdout.isTTY),
        });

      let declined = false;
      if (latestVersion && canOffer) {
        displayCliUpdateNote(latestVersion, targetPath, { withCommand: false });
        const outcome = await offerCliUpgrade(latestVersion);

        // 设置代码并返回而不是 process.exit：在此退出会跳过
        // commander 的 postAction 钩子，在请求中途杀死遥测刷新。
        if (outcome === 'cancelled') {
          // Ctrl-C 意味着停止命令，而不是继续更多提示。
          process.exitCode = 130;
          return;
        }
        if (outcome === 'upgraded') {
          process.exitCode = await rerunUpdateWithUpgradedCli(targetPath, {
            force: options?.force,
          });
          return;
        }
        // 已拒绝、失败或升级但不可达：继续执行更新，
        // 然后将命令留在屏幕下方。
        declined = true;
      }

      const updateCommand = new UpdateCommand({ force: options?.force });
      await updateCommand.execute(targetPath);

      if (declined) {
        // 标题在提示之前已打印；只有手动路径还欠着，
        // 它属于用户正在查看的地方。
        displayUpgradeCommand(targetPath);
      } else if (latestVersion) {
        displayCliUpdateNote(latestVersion, targetPath);
      }
    } catch (error) {
      failWithError(error);
      process.exit(1);
    }
  });

program
  .command('list')
  .description('列出项目（默认列出变更）。使用 --specs 列出规范。')
  .option('--specs', '列出规范而非变更')
  .option('--changes', '显式列出变更（默认）')
  .option('--sort <order>', '排序顺序："recent"（默认）或 "name"', 'recent')
  .option('--json', '以 JSON 格式输出（用于编程使用）')
  .option('--store <id>', STORE_OPTION_DESCRIPTION)
  .addOption(hiddenStorePathOption())
  .action(async (options?: { specs?: boolean; changes?: boolean; sort?: string; json?: boolean; store?: string; storePath?: string }) => {
    try {
      const root = await resolveRootForCommand(options ?? {}, {
        json: options?.json,
        failurePayload: options?.specs ? { specs: [], root: null } : { changes: [], root: null },
        // 保留 cwd 回退以支持 pre-config.yaml 项目。解析器仍允许
        // 已注册/默认存储优先于它。
        allowImplicitRoot: existsSync(path.join(process.cwd(), 'openspec', 'project.md')),
      });
      if (!root) {
        return;
      }
      const listCommand = new ListCommand();
      const mode: 'changes' | 'specs' = options?.specs ? 'specs' : 'changes';
      const sort = options?.sort === 'name' ? 'name' : 'recent';
      await listCommand.execute(root.path, mode, {
        sort,
        json: options?.json,
        ...(options?.json ? { root: toRootOutput(root) } : {}),
      });
    } catch (error) {
      failWithError(error, {
        enabled: options?.json,
        payload: options?.specs ? { specs: [], root: null } : { changes: [], root: null },
        fallbackCode: 'list_error',
      });
      process.exit(1);
    }
  });

program
  .command('view')
  .description('显示规范和变更的交互式仪表板')
  .option('--store <id>', STORE_OPTION_DESCRIPTION)
  .addOption(hiddenStorePathOption())
  .action(async (options?: { store?: string; storePath?: string }) => {
    try {
      // 隐式 cwd 回退保持启用，使 `view` 能接受与 `list`/`status` 相同的
      // 目录——特别是 pre-config.yaml 的 `openspec/` 目录。
      // ViewCommand 自身仍会报告缺少 openspec/ 目录。
      const root = await resolveRootForCommand(options ?? {});
      if (!root) {
        return;
      }
      const viewCommand = new ViewCommand();
      await viewCommand.execute(root.path);
    } catch (error) {
      failWithError(error);
      process.exit(1);
    }
  });

// 带子命令的 change 命令
const changeCmd = program
  .command('change')
  .description('管理 OpenSpec 变更提案');

// 基于名词的命令的弃用通知
changeCmd.hook('preAction', () => {
  console.error('警告："openspec change ..." 命令已弃用。请优先使用动词优先的命令（如 "openspec list"、"openspec validate --changes"）。');
});

changeCmd
  .command('show [change-name]')
  .description('以 JSON 或 markdown 格式显示变更提案')
  .option('--json', '以 JSON 格式输出')
  .option('--deltas-only', '仅显示增量（仅 JSON）')
  .option('--requirements-only', '--deltas-only 的别名（已弃用）')
  .option('--no-interactive', '禁用交互式提示')
  .action(async (changeName?: string, options?: { json?: boolean; requirementsOnly?: boolean; deltasOnly?: boolean; noInteractive?: boolean }) => {
    try {
      const changeCommand = new ChangeCommand();
      await changeCommand.show(changeName, options);
    } catch (error) {
      console.error(`错误：${(error as Error).message}`);
      process.exitCode = 1;
    }
  });

changeCmd
  .command('list')
  .description('列出所有活动变更（已弃用：请改用 "openspec list"）')
  .option('--json', '以 JSON 格式输出')
  .option('--long', '显示 id 和标题及计数')
  .action(async (options?: { json?: boolean; long?: boolean }) => {
    try {
      console.error('警告："openspec change list" 已弃用。请改用 "openspec list"。');
      const changeCommand = new ChangeCommand();
      await changeCommand.list(options);
    } catch (error) {
      console.error(`错误：${(error as Error).message}`);
      process.exitCode = 1;
    }
  });

changeCmd
  .command('validate [change-name]')
  .description('验证变更提案')
  .option('--strict', '启用严格验证模式')
  .option('--json', '以 JSON 格式输出验证报告')
  .option('--no-interactive', '禁用交互式提示')
  .action(async (changeName?: string, options?: { strict?: boolean; json?: boolean; noInteractive?: boolean }) => {
    try {
      const changeCommand = new ChangeCommand();
      // validate() 已设置 process.exitCode，Node 在自然退出时会遵循它。
      // 在此调用 process.exit() 会跳过 commander 的 postAction 钩子——
      // 与下面 `update` 中指出的陷阱相同——会在常规结果上杀死
      // 遥测刷新和首次运行的补全提示，而不是错误：验证失败的变更。
      await changeCommand.validate(changeName, options);
    } catch (error) {
      console.error(`错误：${(error as Error).message}`);
      process.exitCode = 1;
    }
  });

program
  .command('archive [change-name]')
  .description('归档已完成的变更并更新主规范')
  .option('-y, --yes', '跳过确认提示')
  .option('--skip-specs', '跳过规范更新操作（适用于基础设施、工具或仅文档变更）')
  .option('--no-validate', '跳过验证（不推荐，需要确认）')
  .option('--json', '以 JSON 格式输出（非交互式）')
  .option('--store <id>', STORE_OPTION_DESCRIPTION)
  .addOption(hiddenStorePathOption())
  .action(async (changeName?: string, options?: ArchiveOptions) => {
    try {
      const archiveCommand = new ArchiveCommand();
      await archiveCommand.execute(changeName, options);
    } catch (error) {
      failWithError(error);
      process.exit(1);
    }
  });

registerSpecCommand(program);
registerConfigCommand(program);
registerSchemaCommand(program);
registerStoreCommand(program);
registerDoctorCommand(program);
registerContextCommand(program);
registerWorksetCommand(program);

// 顶级 validate 命令
program
  .command('validate [item-name]')
  .description('验证变更和规范')
  .option('--all', '验证所有变更和规范')
  .option('--changes', '验证所有变更')
  .option('--specs', '验证所有规范')
  .option('--archived', '验证已归档的变更是否完成所有任务（用于预提交检查）')
  .option('--type <type>', '当类型不明确时指定项目类型：change|spec')
  .option('--strict', '启用严格验证模式')
  .option('--json', '以 JSON 格式输出验证结果')
  .option('--concurrency <n>', '最大并发验证数（默认为环境 OPENSPEC_CONCURRENCY 或 6）')
  .option('--no-interactive', '禁用交互式提示')
  .option('--store <id>', STORE_OPTION_DESCRIPTION)
  .addOption(hiddenStorePathOption())
  .action(async (itemName?: string, options?: { all?: boolean; changes?: boolean; specs?: boolean; archived?: boolean; type?: string; strict?: boolean; json?: boolean; noInteractive?: boolean; concurrency?: string; store?: string; storePath?: string }) => {
    try {
      const validateCommand = new ValidateCommand();
      await validateCommand.execute(itemName, options);
    } catch (error) {
      failWithError(error, { enabled: options?.json, fallbackCode: 'validate_error' });
      process.exit(1);
    }
  });

// 顶级 show 命令
program
  .command('show [item-name]')
  .description('显示变更或规范')
  .option('--json', '以 JSON 格式输出')
  .option('--type <type>', '当类型不明确时指定项目类型：change|spec')
  .option('--no-interactive', '禁用交互式提示')
  // 仅用于 change 的标志
  .option('--deltas-only', '仅显示增量（仅 JSON，change）')
  .option('--requirements-only', '--deltas-only 的别名（已弃用，change）')
  // 仅用于 spec 的标志
  .option('--requirements', '仅 JSON：仅显示需求（排除场景）')
  .option('--no-scenarios', '仅 JSON：排除场景内容')
  .option('-r, --requirement <id>', '仅 JSON：按 ID 显示特定需求（从 1 开始）')
  .option('--store <id>', STORE_OPTION_DESCRIPTION)
  // 需要显式注册：allowUnknownOption 否则会静默
  // 吞掉 --store-path，而非故意拒绝它。
  .addOption(hiddenStorePathOption())
  // 允许未知选项传递到底层命令实现
  .allowUnknownOption(true)
  .action(async (itemName?: string, options?: { json?: boolean; type?: string; noInteractive?: boolean; [k: string]: any }) => {
    try {
      const showCommand = new ShowCommand();
      await showCommand.execute(itemName, options ?? {});
    } catch (error) {
      failWithError(error, { enabled: options?.json, fallbackCode: 'show_error' });
      process.exit(1);
    }
  });

// Feedback 命令
program
  .command('feedback <message>')
  .description('提交关于 OpenSpec 的反馈')
  .option('--body <text>', '反馈的详细描述')
  .action(async (message: string, options?: { body?: string }) => {
    try {
      const feedbackCommand = new FeedbackCommand();
      await feedbackCommand.execute(message, options);
    } catch (error) {
      failWithError(error);
      process.exit(1);
    }
  });

// 带子命令的 completion 命令
const completionCmd = program
  .command('completion')
  .description('管理 OpenSpec CLI 的 shell 补全');

completionCmd
  .command('generate [shell]')
  .description('为 shell 生成补全脚本（输出到 stdout）')
  .action(async (shell?: string) => {
    try {
      const completionCommand = new CompletionCommand();
      await completionCommand.generate({ shell });
    } catch (error) {
      failWithError(error);
      process.exit(1);
    }
  });

completionCmd
  .command('install [shell]')
  .description('为 shell 安装补全脚本')
  .option('--verbose', '显示详细安装输出')
  .action(async (shell?: string, options?: { verbose?: boolean }) => {
    try {
      const completionCommand = new CompletionCommand();
      await completionCommand.install({ shell, verbose: options?.verbose });
    } catch (error) {
      failWithError(error);
      process.exit(1);
    }
  });

completionCmd
  .command('uninstall [shell]')
  .description('卸载 shell 的补全脚本')
  .option('-y, --yes', '跳过确认提示')
  .action(async (shell?: string, options?: { yes?: boolean }) => {
    try {
      const completionCommand = new CompletionCommand();
      await completionCommand.uninstall({ shell, yes: options?.yes });
    } catch (error) {
      failWithError(error);
      process.exit(1);
    }
  });

// 用于机器可读补全数据的隐藏命令
program
  .command('__complete <type>', { hidden: true })
  .description('以机器可读格式输出补全数据（内部使用）')
  .action(async (type: string) => {
    try {
      const completionCommand = new CompletionCommand();
      await completionCommand.complete({ type });
    } catch (error) {
      // 静默失败以获得流畅的 shell 补全体验
      process.exitCode = 1;
    }
  });

// ═══════════════════════════════════════════════════════════
// 工作流命令（原 experimental）
// ═══════════════════════════════════════════════════════════

// Status 命令
program
  .command('status')
  .description('显示变更的制品完成状态')
  .option('--change <id>', '要显示状态的变更名称')
  .option('--schema <name>', '配置覆盖（从 config.yaml 自动检测）')
  .option('--json', '以 JSON 格式输出')
  .option('--store <id>', STORE_OPTION_DESCRIPTION)
  .addOption(hiddenStorePathOption())
  .action(async (options: StatusOptions) => {
    try {
      await statusCommand(options);
    } catch (error) {
      failWithError(error, { enabled: options.json, fallbackCode: 'change_error' });
      process.exit(1);
    }
  });

// Instructions 命令
program
  .command('instructions [artifact]')
  .description('输出制品、apply 或 archive 的增强指令')
  .option('--change <id>', '变更名称')
  .option('--schema <name>', '配置覆盖（从 config.yaml 自动检测）')
  .option('--json', '以 JSON 格式输出')
  .option('--store <id>', STORE_OPTION_DESCRIPTION)
  .addOption(hiddenStorePathOption())
  .action(async (artifactId: string | undefined, options: InstructionsOptions) => {
    try {
      // 工作流指令表面是保留的命令分支，不是制品。
      if (artifactId === 'apply') {
        await applyInstructionsCommand(options);
      } else if (artifactId === 'archive') {
        await archiveInstructionsCommand(options);
      } else {
        await instructionsCommand(artifactId, options);
      }
    } catch (error) {
      failWithError(error, { enabled: options.json, fallbackCode: 'change_error' });
      process.exit(1);
    }
  });

// Templates 命令
program
  .command('templates')
  .description('显示配置中所有制品的解析模板路径')
  .option('--schema <name>', `使用的配置（默认：${DEFAULT_SCHEMA}）`)
  .option('--json', '以 JSON 格式输出，映射制品 ID 到模板路径')
  .action(async (options: TemplatesOptions) => {
    try {
      await templatesCommand(options);
    } catch (error) {
      failWithError(error);
      process.exit(1);
    }
  });

// Schemas 命令
program
  .command('schemas')
  .description('列出可用的工作流配置及其描述')
  .option('--json', '以 JSON 格式输出（供 agent 使用）')
  .option('--store <id>', STORE_OPTION_DESCRIPTION)
  .addOption(hiddenStorePathOption())
  .action(async (options: SchemasOptions) => {
    try {
      await schemasCommand(options);
    } catch (error) {
      failWithError(error, {
        enabled: options.json,
        payload: { schemas: [], root: null },
        fallbackCode: 'schemas_error',
      });
      process.exit(1);
    }
  });

// 带有 change 子命令的新命令组
const newCmd = program.command('new').description('创建新项目');

newCmd
  .command('change <name>')
  .description('创建新的变更目录')
  .option('--description <text>', '要添加到 README.md 的描述')
  .option('--goal <text>', '要存储的可选目标元数据')
  .option('--schema <name>', `使用的工作流配置（默认：${DEFAULT_SCHEMA}）`)
  .option('--json', '以 JSON 格式输出')
  .option('--store <id>', STORE_OPTION_DESCRIPTION)
  .addOption(hiddenStorePathOption())
  // 移除的选项保持注册（隐藏），以便用户得到明确的
  // 解释而非通用的未知选项错误。
  .addOption(new Option('--initiative <id>', '不再支持').hideHelp())
  .addOption(new Option('--areas <names>', '不再支持').hideHelp())
  .action(async (name: string, options: NewChangeOptions) => {
    try {
      await newChangeCommand(name, options);
    } catch (error) {
      failWithError(error);
      process.exit(1);
    }
  });

export { program };

export function runCli(argv = process.argv): void {
  program.parse(argv);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  runCli();
}
