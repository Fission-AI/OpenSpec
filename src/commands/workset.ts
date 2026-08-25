/**
 * `workset` 命令组（切片 7.1）：组合、保存和打开
 * 个人工作视图。workset 纯粹是本地的和个人的——
 * 永远不提交、永远不共享、永远不从声明派生、
 * 永远不是成员关系的真值。打开时将视图交给用户的工具：
 * 编辑器获取生成的 .code-workspace；CLI agent 接管此
 * 终端，附加所有成员且不显示初始提示。
 */
import * as os from 'node:os';
import { createRequire } from 'node:module';
import type { spawn as nodeSpawn } from 'node:child_process';
import { Command, Option } from 'commander';

import {
  buildWorksetCodeWorkspaceJson,
  getWorkset,
  getWorksetCodeWorkspacePath,
  listWorksets,
  readWorksetsState,
  removeWorkset,
  updateWorksetsState,
  validateWorksetName,
  withWorkset,
  withWorksetsLock,
  worksetNotFoundError,
  type Workset,
  type WorksetMember,
} from '../core/worksets.js';
import {
  buildLaunchCommand,
  findOpener,
  isOpenerCommandAvailable,
  isOpenerEnabled,
  listOpenerChoices,
  mergeOpenerTable,
  type LaunchCommand,
  type OpenerDefinition,
} from '../core/openers.js';
import { pathIsDirectory, writeFileAtomically } from '../core/file-state.js';
import {
  getGlobalConfig,
  getGlobalConfigPath,
} from '../core/global-config.js';
import { StoreError, type StoreDiagnostic } from '../core/store/errors.js';
import { isInteractive } from '../utils/interactive.js';
import {
  asErrorMessage,
  emitFailure,
  isPromptCancellationError,
  printJson,
} from './shared-output.js';
import {
  finalizeWorkset,
  firstInstalledAlternative,
  formatMemberRows,
  noToolInstalledError,
  resolveMemberFlags,
  toolUnavailableError,
  toolUnknownError,
} from './workset-input.js';
import {
  composeInteractively,
  confirmRemoveInteractively,
  promptOpenNow,
  promptToolFromChoices,
} from './workset-prompts.js';
import { COMMAND_REGISTRY } from '../core/completions/command-registry.js';

// cross-spawn 是 CJS 且无类型定义，只有 `workset open` 需要它——
// 懒加载，以便所有其他 CLI 调用跳过其模块图谱。
let cachedSpawn: typeof nodeSpawn | undefined;
function defaultSpawn(): typeof nodeSpawn {
  if (cachedSpawn === undefined) {
    const require = createRequire(import.meta.url);
    cachedSpawn = require('cross-spawn') as typeof nodeSpawn;
  }
  return cachedSpawn;
}

interface WorksetCreateOptions {
  member?: string[];
  tool?: string;
  json?: boolean;
}

interface WorksetOpenOptions {
  tool?: string;
  json?: boolean;
}

interface WorksetRemoveOptions {
  yes?: boolean;
  json?: boolean;
}

function readOpenerTable(): OpenerDefinition[] {
  return mergeOpenerTable(getGlobalConfig().openers, getGlobalConfigPath());
}

function worksetCliOpenerDisabledError(
  opener: OpenerDefinition,
  name: string
): StoreError {
  return new StoreError(
    `在 ${opener.label} 中打开 workset 暂时禁用，因为 CLI-agent 打开功能正在重新开发。目前请在 IDE 中打开 workset。`,
    'workset_cli_opener_disabled',
    {
      target: 'workset.tool',
      fix: `在 VS Code 或 Cursor 中打开：openspec workset open ${name} --tool code`,
    }
  );
}

interface LaunchResult {
  code: number | null;
  signal: NodeJS.Signals | null;
}

export interface LaunchOptions {
  spawnFn?: typeof nodeSpawn;
}

/**
 * 使用此终端的 stdio 生成打开器。以子进程的
 * 退出事实解析（对于非零退出从不拒绝——对于
 * 终端交接，会话即是命令）；仅当 spawn 本身失败时
 * 以 workset_launch_failed 拒绝。当子进程运行时，
 * 父进程忽略 SIGINT/SIGTERM：终端
 * 将 Ctrl-C 传递给子进程，父进程必须存活以报告
 * 子进程的真实退出事实（128+n 约定）。
 */
export function launchOpenerCommand(
  command: LaunchCommand,
  options: LaunchOptions = {}
): Promise<LaunchResult> {
  const spawnFn = options.spawnFn ?? defaultSpawn();

  return new Promise((resolve, reject) => {
    const launchFailure = (error: unknown): StoreError =>
      new StoreError(
        `无法启动 ${command.label}：${asErrorMessage(error)}`,
        'workset_launch_failed',
        {
          target: 'workset.tool',
          fix: `检查 '${command.executable}' 是否可从此终端运行，或使用 --tool 传递其他已安装的工具。`,
        }
      );

    let child: ReturnType<typeof spawnFn>;
    try {
      child = spawnFn(command.executable, command.args, {
        cwd: command.cwd,
        stdio: 'inherit',
        shell: false,
      });
    } catch (error) {
      // 某些 spawn 失败同步抛出（因平台而异）；
      // 它们属于同一启动失败。
      reject(launchFailure(error));
      return;
    }

    const ignoreSignal = (): void => undefined;
    process.on('SIGINT', ignoreSignal);
    process.on('SIGTERM', ignoreSignal);
    const cleanup = (): void => {
      process.removeListener('SIGINT', ignoreSignal);
      process.removeListener('SIGTERM', ignoreSignal);
    };

    child.on('error', (error) => {
      cleanup();
      reject(launchFailure(error));
    });

    child.on('close', (code, signal) => {
      cleanup();
      resolve({ code, signal });
    });
  });
}

/** SIGINT 为 130，SIGTERM 为 143——shell 的 128+n 约定。 */
export function exitCodeForLaunch(result: LaunchResult): number {
  if (result.signal !== null) {
    const signalNumber =
      os.constants.signals[result.signal as keyof typeof os.constants.signals];
    return 128 + (signalNumber ?? 1);
  }

  return result.code ?? 0;
}

interface PreparedOpen {
  workset: Workset;
  surviving: WorksetMember[];
  skipped: WorksetMember[];
  codeWorkspacePath: string;
}

class WorksetCommand {
  async create(
    name: string | undefined,
    options: WorksetCreateOptions = {}
  ): Promise<void> {
    try {
      const interactive = !options.json && isInteractive();

      let workset: Workset;
      let table: OpenerDefinition[] | undefined;
      if (interactive) {
        table = readOpenerTable();
        workset = await composeInteractively(
          name,
          { memberFlags: options.member ?? [], tool: options.tool },
          table
        );
      } else {
        workset = await this.composeFromFlags(name, options);
      }

      await updateWorksetsState((state) => withWorkset(state, workset));

      if (options.json) {
        printJson({ workset, status: [] });
        return;
      }

      console.log('');
      console.log(
        `已保存 workset '${workset.name}'（${workset.members.length} 个成员）到本机。`
      );

      if (interactive && workset.tool !== undefined && table !== undefined) {
        const label = findOpener(table, workset.tool)?.label ?? workset.tool;
        let openNow = false;
        try {
          openNow = await promptOpenNow(label);
        } catch (error) {
          // workset 已经持久保存：此处的 Ctrl-C 只是拒绝
          // 该提议，不会取消创建操作。
          if (!isPromptCancellationError(error)) {
            throw error;
          }
        }

        if (openNow) {
          console.log('');
          await this.open(workset.name, {});
          return;
        }
      }

      console.log(
        `随时使用以下命令打开：openspec workset open ${workset.name}`
      );
    } catch (error) {
      emitFailure(options.json, { workset: null, status: [] }, error, 'workset_error');
    }
  }

  private async composeFromFlags(
    name: string | undefined,
    options: WorksetCreateOptions
  ): Promise<Workset> {
    if (!name) {
      throw new StoreError('传递 workset 名称。', 'workset_name_required', {
        target: 'workset.name',
        fix: 'openspec workset create <name> --member <path>',
      });
    }

    validateWorksetName(name);

    const memberFlags = options.member ?? [];
    if (memberFlags.length === 0) {
      throw new StoreError(
        '至少传递一个成员文件夹。',
        'workset_members_required',
        {
          target: 'workset.member',
          fix: `openspec workset create ${name} --member <path> --member <name>=<path>`,
        }
      );
    }

    const members = await resolveMemberFlags(memberFlags);
    // 仅当工具被指定时才读取打开器表——
    // 无工具的脚本化创建不应因无关的配置行而失败。
    const table = options.tool !== undefined ? readOpenerTable() : [];
    if (options.tool !== undefined) {
      const chosen = findOpener(table, options.tool);
      if (chosen !== null && !isOpenerEnabled(chosen)) {
        throw worksetCliOpenerDisabledError(chosen, name);
      }
    }
    return finalizeWorkset(name, members, options.tool, table);
  }

  async list(options: { json?: boolean } = {}): Promise<void> {
    try {
      const state = await readWorksetsState();
      const worksets = listWorksets(state);

      if (options.json) {
        printJson({ worksets, status: [] });
        return;
      }

      if (worksets.length === 0) {
        console.log(
          '未保存任何 workset。使用以下命令创建一个：openspec workset create'
        );
        return;
      }

      // 仅查阅该表以渲染工具标签。
      const table = worksets.some((workset) => workset.tool !== undefined)
        ? readOpenerTable()
        : [];
      for (const workset of worksets) {
        const label = findOpener(table, workset.tool)?.label ?? workset.tool;
        const toolLabel =
          workset.tool !== undefined
            ? ` （在 ${label} 中打开）`
            : '';
        console.log(`${workset.name}${toolLabel}`);
        for (const row of formatMemberRows(workset.members)) {
          console.log(`  ${row}`);
        }
      }
    } catch (error) {
      emitFailure(options.json, { worksets: [], status: [] }, error, 'workset_error');
    }
  }

  async open(name: string, options: WorksetOpenOptions = {}): Promise<void> {
    let prepared: PreparedOpen | undefined;

    try {
      if (options.json) {
        throw new StoreError(
          'workset open 会将此终端交给所选工具，不支持 JSON 模式。',
          'workset_open_json_unsupported',
          {
            target: 'workset.tool',
            fix: '使用以下命令检查 workset：openspec workset list --json',
          }
        );
      }

      // 先重新生成派生文件（在锁下），以便下面
      // 每个无法驱动的失败都能指向一个已存在的、当前的文件。
      prepared = await withWorksetsLock(async (state): Promise<PreparedOpen> => {
        const workset = getWorkset(state, name);
        if (workset === null) {
          throw worksetNotFoundError(name, state);
        }

        const checks = await Promise.all(
          workset.members.map(async (member) => ({
            member,
            exists: await pathIsDirectory(member.path),
          }))
        );
        const surviving = checks
          .filter((check) => check.exists)
          .map((check) => check.member);
        const skipped = checks
          .filter((check) => !check.exists)
          .map((check) => check.member);

        if (surviving.length === 0) {
          throw new StoreError(
            `workset '${name}' 中没有成员文件夹存在于本机。`,
            'workset_no_members_available',
            {
              target: 'workset.member',
              fix: `重新组合：openspec workset remove ${name} --yes && openspec workset create ${name} --member <path>`,
            }
          );
        }

        const codeWorkspacePath = getWorksetCodeWorkspacePath(name);
        await writeFileAtomically(
          codeWorkspacePath,
          buildWorksetCodeWorkspaceJson(surviving)
        );

        return { workset, surviving, skipped, codeWorkspacePath };
      });

      for (const member of prepared.skipped) {
        console.error(
          `已跳过 '${member.name}'（${member.path} 不可用）。`
        );
      }
      if (prepared.workset.members[0] !== prepared.surviving[0]) {
        const primary = prepared.surviving[0];
        console.error(
          `使用 '${primary.name}'（${primary.path}）作为此次打开的主要成员。`
        );
      }

      const table = readOpenerTable();

      const tool = options.tool ?? prepared.workset.tool;
      let opener: OpenerDefinition;
      if (tool !== undefined) {
        const found = findOpener(table, tool);
        if (found === null) {
          throw toolUnknownError(tool, table);
        }
        if (!isOpenerEnabled(found)) {
          throw worksetCliOpenerDisabledError(found, name);
        }
        if (!isOpenerCommandAvailable(found.command)) {
          throw toolUnavailableError(found, table, name);
        }
        opener = found;
      } else {
        if (!isInteractive()) {
          throw new StoreError(
            `workset '${name}' 没有保存的工具。`,
            'workset_tool_required',
            {
              target: 'workset.tool',
              fix: `openspec workset open ${name} --tool <id>`,
            }
          );
        }

        // 提示仅提供可用的打开器，因此选择
        // 无需二次扫描。
        const available = listOpenerChoices(table).filter(
          (choice) => choice.available
        );
        if (available.length === 0) {
          throw noToolInstalledError(table, name);
        }
        const selectedId = await promptToolFromChoices(available);
        opener = available.find(
          (choice) => choice.opener.id === selectedId
        )!.opener;
      }

      const launch = buildLaunchCommand(opener, {
        members: prepared.surviving,
        codeWorkspacePath: prepared.codeWorkspacePath,
      });

      if (opener.style === 'workspace-file') {
        console.log(
          `在 ${opener.label} 中打开 '${name}'（将打开一个窗口；此命令返回）。`
        );
      } else {
        console.log(
          `将此终端交给 ${opener.label} 处理 '${name}'（退出时会话结束）。`
        );
      }

      let result: LaunchResult;
      try {
        result = await launchOpenerCommand(launch);
      } catch (error) {
        // 当有替代方案已安装时，使启动失败的修复方案可直接复制
        // （启动器本身不知道该表）。
        if (
          error instanceof StoreError &&
          error.diagnostic.code === 'workset_launch_failed'
        ) {
          const alternative = firstInstalledAlternative(table, opener.id);
          if (alternative !== null) {
            throw new StoreError(error.message, 'workset_launch_failed', {
              target: 'workset.tool',
              fix: `运行：openspec workset open ${name} --tool ${alternative}`,
            });
          }
        }
        throw error;
      }

      const exitCode = exitCodeForLaunch(result);
      if (exitCode !== 0) {
        process.exitCode = exitCode;
      }
    } catch (error) {
      emitFailure(options.json, { status: [] }, error, 'workset_error');

      // 永远不要让用户陷入困境：一旦派生文件被重新生成，
      // 每个失败（除了提示取消）都带有
      // 手动路径——文件路径及其包含的成员。
      if (
        !options.json &&
        prepared !== undefined &&
        !isPromptCancellationError(error)
      ) {
        console.error('手动打开：');
        console.error(`  工作区文件：${prepared.codeWorkspacePath}`);
        console.error('  成员：');
        for (const row of formatMemberRows(prepared.surviving)) {
          console.error(`    ${row}`);
        }
      }
    }
  }

  async remove(name: string, options: WorksetRemoveOptions = {}): Promise<void> {
    try {
      if (!options.yes) {
        // 预读取用于找不到优先级和确认
        // 显示；--yes 路径跳过（removeWorkset 无论如何在锁下重新检查）。
        const state = await readWorksetsState();
        const workset = getWorkset(state, name);
        if (workset === null) {
          throw worksetNotFoundError(name, state);
        }

        if (options.json || !isInteractive()) {
          throw new StoreError(
            '传递 --yes 以非交互式删除 workset。',
            'workset_remove_confirmation_required',
            {
              target: 'workset.name',
              fix: `openspec workset remove ${name} --yes`,
            }
          );
        }

        const confirmed = await confirmRemoveInteractively(workset);
        if (!confirmed) {
          throw new StoreError(
            'Workset 删除已取消。',
            'workset_remove_cancelled',
            {
              target: 'workset.name',
              fix: '准备好后重新运行删除操作。',
            }
          );
        }
      }

      await removeWorkset(name);

      if (options.json) {
        printJson({ removed: { name }, status: [] });
        return;
      }

      console.log(`已删除 workset '${name}'。成员文件夹未受影响。`);
    } catch (error) {
      emitFailure(options.json, { removed: null, status: [] }, error, 'workset_error');
    }
  }
}

function collectMember(value: string, previous: string[]): string[] {
  return [...previous, value];
}

export function registerWorksetCommand(program: Command): void {
  const worksetCommand = new WorksetCommand();
  const groupDescription =
    COMMAND_REGISTRY.find((entry) => entry.name === 'workset')?.description ??
    '组合、保存和打开个人工作视图（纯本地）';
  const workset = program.command('workset').description(groupDescription);
  // 在组级别解析，以便 `openspec workset --json` 保持
  // 一个 JSON 文档的约定，而不是原始 Commander 错误。
  // 父级选项在任意位置匹配；action 使用 optsWithGlobals() 读取。
  workset.addOption(new Option('--json', '以 JSON 格式输出').hideHelp());

  workset
    .command('create [name]')
    .description('组合并保存您选择的文件夹的命名工作视图')
    .option(
      '--member <member>',
      '成员文件夹，格式为 <path> 或 <name>=<path>；可重复，第一个为主要成员',
      collectMember,
      [] as string[]
    )
    .option('--tool <id>', '打开此 workset 的首选工具')
    .option('--json', '以 JSON 格式输出')
    .action(async (name: string | undefined, _options: WorksetCreateOptions, command: Command) => {
      await worksetCommand.create(name, command.optsWithGlobals());
    });

  workset
    .command('list')
    .alias('ls')
    .description('显示已保存的 workset 及其成员')
    .option('--json', '以 JSON 格式输出')
    .action(async (_options: { json?: boolean }, command: Command) => {
      await worksetCommand.list(command.optsWithGlobals());
    });

  workset
    .command('open <name>')
    .description('在您的工具中打开已保存的 workset（编辑器窗口或 agent 会话）')
    .option('--tool <id>', '仅此一次使用此工具打开')
    .addOption(
      // 解析，这样 Commander 永远不会拥有该错误；在
      // action 中以一个 JSON 文档拒绝。隐藏是因为帮助不应
      // 宣传仅拒绝的模式。
      new Option('--json', 'open 不支持').hideHelp()
    )
    .action(async (name: string, _options: WorksetOpenOptions, command: Command) => {
      await worksetCommand.open(name, command.optsWithGlobals());
    });

  workset
    .command('remove <name>')
    .description('删除已保存的 workset（成员文件夹不受影响）')
    .option('--yes', '非交互式确认删除')
    .option('--json', '以 JSON 格式输出')
    .action(async (name: string, _options: WorksetRemoveOptions, command: Command) => {
      await worksetCommand.remove(name, command.optsWithGlobals());
    });

  const subcommandsLine = workset.commands
    .map((subcommand) => {
      const aliases = subcommand.aliases();
      return aliases.length > 0
        ? `${subcommand.name()}（${aliases.join(', ')}）`
        : subcommand.name();
    })
    .join(', ');

  // 一个处理器同时处理缺失和未知的子命令：已知
  // 子命令在上面分发；其他所有内容都进入此 action
  // （allowExcessArguments 将未知操作数路由到此），保持
  // `--json` 探测的一个 JSON 文档约定。
  workset.allowExcessArguments(true);
  workset.action(() => {
    const attempted = workset.args.filter(
      (operand) => !operand.startsWith('-')
    );
    const message =
      attempted.length > 0
        ? `'openspec workset' 的未知命令 '${attempted[0]}'。Workset 子命令：${subcommandsLine}。`
        : `'openspec workset' 缺少子命令。Workset 子命令：${subcommandsLine}。`;
    if (workset.opts().json) {
      printJson({
        status: [
          {
            severity: 'error',
            code: 'unknown_workset_subcommand',
            message,
            fix: '运行 workset 子命令之一。',
          } satisfies StoreDiagnostic,
        ],
      });
    } else {
      console.error(`错误：${message}`);
    }
    process.exitCode = 1;
  });
}