/**
 * 命令组的共享 JSON/失败输出基础结构，其错误
 * 带有 StoreDiagnostic 信封。失败契约的一个定义：
 * 退出码 1、Error:/Fix: 行（人类模式）、状态
 * 数组（JSON 模式）。
 */
import { StoreError, type StoreDiagnostic } from '../core/store/errors.js';

export function printJson(payload: unknown): void {
  console.log(JSON.stringify(payload, null, 2));
}

export function asErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * @inquirer 提示在 Ctrl-C 时抛出 ExitPromptError；命令
 * 将其转换为 `Cancelled.` + 退出码 130（第七切片的第三个调用者）。
 */
export function isPromptCancellationError(error: unknown): boolean {
  return (
    error instanceof Error &&
    (error.name === 'ExitPromptError' ||
      error.message.includes('force closed the prompt with SIGINT'))
  );
}

export function asStatus(error: unknown, fallbackCode: string): StoreDiagnostic {
  if (error instanceof StoreError) {
    return error.diagnostic;
  }
  // RootSelectionError（及同类）共享相同的信封，但不共享
  // 类层次结构；在此对诊断进行鸭子类型检查。
  const diagnostic = (error as { diagnostic?: StoreDiagnostic }).diagnostic;
  if (diagnostic && typeof diagnostic.code === 'string') {
    return diagnostic;
  }
  return {
    severity: 'error',
    code: fallbackCode,
    message: asErrorMessage(error),
  };
}

export function emitFailure(
  json: boolean | undefined,
  payload: Record<string, unknown>,
  error: unknown,
  fallbackCode: string
): void {
  // 提示中的 Ctrl-C 是用户的选择，不是错误：每个
  // 命令组都通过此处获取 Cancelled./130 约定。
  if (!json && isPromptCancellationError(error)) {
    console.error('已取消。');
    process.exitCode = 130;
    return;
  }

  const status = asStatus(error, fallbackCode);
  if (json) {
    const prior = Array.isArray(payload.status) ? payload.status : [];
    printJson({ ...payload, status: [...prior, status] });
    process.exitCode = 1;
    return;
  }
  console.error(`错误：${status.message}`);
  if (status.fix) {
    console.error(`修复：${status.fix}`);
  }
  process.exitCode = 1;
}
