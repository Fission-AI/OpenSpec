/**
 * 首次运行提示，引导用户选择加入 shell 补全功能。
 *
 * 此提示曾经是一个 npm `postinstall` 脚本。改为从 CLI 打印
 * 让包完全不需要安装脚本，因此 `npm install`
 * 不再发出 `allow-scripts` 警告。补全功能保持选择加入状态：提示
 * 只提及命令，从不安装任何东西。
 *
 * 提示发送到 stderr，绝不到 stdout，因此不会污染管道命令
 * 输出。
 *
 * 在以下情况下提示会被抑制：
 * - 设置了 CI（npm/telemetry 会将任何值视为 CI）
 * - OPENSPEC_NO_COMPLETIONS=1
 * - 补全功能已安装，或 shell 是安装程序会拒绝的类型
 * - 调用方传入 `silent` — JSON 运行、`openspec completion ...` 和
 *   非 TTY 运行，这些会被延迟而不是被消费（见 `silent`）
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { getGlobalConfigPath } from './global-config.js';
import { isCiEnvironment } from '../utils/ci.js';
import { detectShell } from '../utils/shell-detection.js';
import { CompletionFactory } from './completions/factory.js';

export const COMPLETION_TIP_MESSAGE =
  '提示：运行 "openspec completion install" 安装 shell 补全功能';

export interface CompletionTipOptions {
  /**
   * 跳过打印而不标记提示为已读，以便它仍会在
   * 用户首次可以安全接收的后续运行中出现。用于没有人会
   * 读取提示的运行：JSON 输出，以及不是终端的 stderr。
   */
  silent?: boolean;
}

function isSuppressedByEnv(): boolean {
  // isCiEnvironment，不是 CI==='true' 字符串检查：提供程序将 CI 设置为 "True"、
  // "yes"、"on"，提示在这些构建中应该像 telemetry 一样保持安静。
  return isCiEnvironment() || process.env.OPENSPEC_NO_COMPLETIONS === '1';
}

/**
 * 判断提示是否值得显示，一旦我们知道它应该显示且可读。
 *
 * "retire" 消费提示而不打印：用户要么已经安装了
 * 补全功能，要么使用了 `openspec completion install` 会拒绝的 shell。
 *
 * 如果没有安装检查，提示会让人们安装他们很久以前就安装的补全功能 —
 * 包括在 `completion install` 之后的运行，
 * 该命令本身只会延迟提示。未检测到或不支持的 shell 也会使其退休：
 * `completion install` 对这些用户以退出码 1 退出，因此将他们指向该命令
 * 是一个死胡同，而此提示是他们唯一能看到的关于补全功能的消息。
 *
 * 并非免费：detectShell() 会 fork `ps` 来读取父进程（Windows 除外），
 * 因此这需要一次 spawn 加上一次 stat。它只在仍欠提示的交互式运行中执行，
 * 通常恰好一次 — 但无法写入的配置永远不会记录该标志，然后每次交互式运行都要付出代价。
 * 在任何意外错误上，我们显示提示而不是吞噬它。
 */
async function decideTip(): Promise<'show' | 'retire'> {
  try {
    const { shell } = detectShell();
    if (!shell) {
      return 'retire';
    }
    return (await CompletionFactory.createInstaller(shell).isInstalled())
      ? 'retire'
      : 'show';
  } catch {
    return 'show';
  }
}

/**
 * 原样读取磁盘上的全局配置。
 *
 * 有意不使用 `getGlobalConfig()`：该方法会合并默认值，写回
 * 合并后的结果会将 `profile`/`delivery` 印章写入用户从未
 * 设置过它们的文件中。`migrateIfNeeded` 将原始 `profile` 视为"已迁移"，
 * 因此该印章会永久抑制一次性的 profile 迁移并
 * 使用户失去已安装的工作流技能。
 *
 * 当文件存在但无法读取或解析时返回 null — 我们无法理解的配置
 * 将被严格保留而不是被覆盖。
 */
function readRawConfig(): Record<string, unknown> | null {
  const configPath = getGlobalConfigPath();
  if (!fs.existsSync(configPath)) {
    return {};
  }

  const parsed: unknown = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    return null;
  }
  return parsed as Record<string, unknown>;
}

/**
 * 记录标志，先重新读取配置并通过重命名替换文件。
 *
 * 判断是否显示提示需要一次 `ps` spawn 和一次 stat，同级的
 * `openspec` 进程可以在该窗口期内写入同一个文件 — 首次运行时
 * 恰好是 telemetry 铸造 `anonymousId` 的时候。此处重新读取保持
 * 写入仅限于这一个键，而重命名防止读取器看到
 * 半写入的配置。
 */
function markTipSeen(): void {
  const configPath = getGlobalConfigPath();
  const current = readRawConfig() ?? {};
  const tempPath = `${configPath}.${process.pid}.tmp`;

  fs.mkdirSync(path.dirname(configPath), { recursive: true });
  fs.writeFileSync(
    tempPath,
    JSON.stringify({ ...current, completionTipSeen: true }, null, 2) + '\n',
    'utf-8'
  );
  fs.renameSync(tempPath, configPath);
}

/**
 * 首次运行 CLI 时打印补全提示，仅打印一次。
 * 从不抛出 — 提示不得破坏命令。
 */
export async function maybeShowCompletionTip(
  options: CompletionTipOptions = {}
): Promise<void> {
  if (isSuppressedByEnv()) {
    return;
  }

  try {
    const raw = readRawConfig();
    if (raw === null || raw.completionTipSeen === true) {
      return;
    }

    if (options.silent) {
      return;
    }

    const decision = await decideTip();

    // 打印前先记录：如果标志无法持久化，保持静默
    // 比在每次后续运行中重新打印提示要好。
    markTipSeen();
    if (decision === 'show') {
      console.error(`\n${COMPLETION_TIP_MESSAGE}`);
    }
  } catch {
    // 静默失败 — 提示不应破坏 CLI。
  }
}
