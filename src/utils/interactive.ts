import { createInterface } from 'node:readline';
import type { Readable, Writable } from 'node:stream';

export type InteractiveOptions = {
  /**
   * 内部调用方传递的显式"禁用提示"标志。
   */
  noInteractive?: boolean;
  /**
   * Commander 风格的否定选项：`--no-interactive` 将此设置为 false。
   */
  interactive?: boolean;
};

/**
 * 解析是否请求了非交互模式。
 * 同时处理显式的 `noInteractive: true` 和 Commander.js 风格的 `interactive: false`。
 * 使用此帮助函数而不是手动检查 options.noInteractive 以避免 bug。
 */
export function resolveNoInteractive(value?: boolean | InteractiveOptions): boolean {
  if (typeof value === 'boolean') return value;
  return value?.noInteractive === true || value?.interactive === false;
}

export function isInteractive(value?: boolean | InteractiveOptions): boolean {
  if (resolveNoInteractive(value)) return false;
  if (process.env.OPEN_SPEC_INTERACTIVE === '0') return false;
  // 遵循标准的 CI 环境变量（由 GitHub Actions、GitLab CI、Travis 等设置）
  if ('CI' in process.env) return false;
  return !!process.stdin.isTTY;
}

/**
 * 当提示因无法读取答案而失败时返回 true —— 例如 agent 或脚本在关闭 stdin 的情况下运行命令、
 * CI 任务、或 stdin 不是终端的 shell。@inquirer 将这些情况以
 * `User force closed the prompt with 0 null` 拒绝，这个描述准确但无用：
 * 没有提到任何标志或后续步骤 (#1479)。
 *
 * 它刻意不是以下两种情况：
 *
 * - 它不是 `isInteractive()` 的替代品。它用于分类一个*已经失败*的提示，
 *   因此通过管道传入的答案不受影响：到达的答案会解析提示且永远不会到此检查。
 *   预先拒绝提示会破坏 `printf 'y\n' | openspec archive ...`，而这个命令目前是可用的。
 * - 它不是取消检测。Ctrl-C 会引发相同的错误类，并且在 stdin 为管道的进程和终端的进程中同样容易触发，
 *   因此 SIGINT 信号 - 而不是终端 - 才是证明有人在那里并选择退出的证据。
 *
 * 除此之外，它依赖于 `isInteractive()`，因此 `CI`、`OPEN_SPEC_INTERACTIVE=0`
 * 和 `--no-interactive` 即使在运行器分配了 pty 的情况下也算数。
 * 它还算重定向的 stdout：`confirmPrompt` 在*任一*流不是 TTY 时都会降级到普通读取器，
 * 因此 stdin 为 TTY 但 stdout 被重定向的运行
 * （从终端执行的 `openspec archive x > log.txt`）遇到 EOF 时必须以与选择提示相同的方式分类 ——
 * 否则会泄露原始的 `ExitPromptError` 而不是 `--yes` 指引。
 */
export function isNonInteractivePromptError(
  error: unknown,
  value?: boolean | InteractiveOptions
): boolean {
  if (!(error instanceof Error)) return false;
  const failedPrompt =
    error.name === 'ExitPromptError' || error.message.includes('force closed the prompt');
  if (!failedPrompt) return false;
  if (error.message.includes('SIGINT')) return false;
  return !isInteractive(value) || !process.stdout.isTTY;
}

export type ConfirmPrompt = {
  message: string;
  default: boolean;
};

/**
 * 提出一个是/否问题。真正的终端使用 @inquirer 的丰富提示；
 * 其他一切 —— 管道、文件重定向、捕获 stdout 的 agent —— 改为读取一行普通文本。
 *
 * @inquirer 通过写入 ANSI 光标移动转义序列来渲染 `confirm`，
 * 即使 stdout 不是 TTY 时也会输出这些序列。重定向到文件时这些序列就是噪音，
 * 在某些非 TTY 主机上渲染循环永远不会停止，会重复输出 `ESC[NNG` 光标移动直到磁盘填满 (#1526)。
 * 自行读取答案可以保持 @inquirer 曾支持的单一管道答案
 * （`printf 'y\n' | openspec archive ...`）正常工作，且不会输出任何转义序列。
 *
 * `io` 覆盖流；这是为测试存在的，模仿 @inquirer 自己的 `{ input, output }` 上下文。
 * 生产调用方只传递提示。
 */
export async function confirmPrompt(
  prompt: ConfirmPrompt,
  io: { input?: Readable; output?: Writable } = {}
): Promise<boolean> {
  const input = io.input ?? process.stdin;
  const output = io.output ?? process.stdout;
  const isTerminal =
    Boolean((input as { isTTY?: boolean }).isTTY) &&
    Boolean((output as { isTTY?: boolean }).isTTY);
  if (isTerminal) {
    const { confirm } = await import('@inquirer/prompts');
    return confirm(prompt);
  }
  return readYesNo(prompt, input, output);
}

function readYesNo(
  prompt: ConfirmPrompt,
  input: Readable,
  output: Writable
): Promise<boolean> {
  return new Promise((resolve, reject) => {
    let settled = false;
    // 在结算时分离输入流错误监听器：`input` 是长期存在的 process.stdin，
    // 残留的监听器会在 archive 连续的提示中累积，吞掉后续不相关的 stdin 错误。
    const cleanup = () => {
      input.removeListener('error', onError);
    };
    const blockOnNoAnswer = () => {
      if (settled) return;
      settled = true;
      cleanup();
      // 无法读取任何行（stdin 关闭 / EOF）。模仿 @inquirer 的失败行为，
      // 以便分类它的调用方 —— isNonInteractivePromptError、#1479
      // "使用 --yes 重新运行" 指引 —— 保持不变。
      const error = new Error('User force closed the prompt');
      error.name = 'ExitPromptError';
      reject(error);
    };
    // stdin 错误会在接口上传达（readline 自 Node 16 起转发输入流错误）。
    // 没有处理器的话 Promise 会挂起，'error' 也不会被处理；
    // 用真正的错误来结算它。
    const onError = (err: unknown) => {
      if (settled) return;
      settled = true;
      cleanup();
      rl.close();
      reject(err instanceof Error ? err : new Error(String(err)));
    };
    // 之前的提示可能已经耗尽了 stdin（只支持过一个管道答案）。
    // 对已结束的流创建新的 readline 永远不会发出 'close'，
    // 所以在此处守卫而不是挂起并以无操作退出。
    if (input.readableEnded) {
      blockOnNoAnswer();
      return;
    }
    output.write(`${prompt.message} ${prompt.default ? '(Y/n)' : '(y/N)'} `);
    // terminal:false 确保 readline 永远不会发出自己的行编辑转义序列 ——
    // 无转义的读取才是关键所在。
    const rl = createInterface({ input, terminal: false });
    input.once('error', onError);
    rl.once('error', onError);
    rl.once('line', (line) => {
      if (settled) return;
      settled = true;
      cleanup();
      rl.close();
      output.write('\n');
      // 模仿 @inquirer/confirm 的解析器（y/yes 和 n/no 的前缀匹配，
      // 否则使用默认值），以便管道答案与它所替代的交互式提示以相同方式解析。
      const answer = line.trim();
      if (/^(y|yes)/i.test(answer)) {
        resolve(true);
      } else if (/^(n|no)/i.test(answer)) {
        resolve(false);
      } else {
        resolve(prompt.default);
      }
    });
    rl.once('close', () => {
      blockOnNoAnswer();
    });
  });
}

