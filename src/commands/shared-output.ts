/**
 * Shared JSON/failure output plumbing for command groups whose errors
 * carry the StoreDiagnostic envelope. One definition of the failure
 * contract: exit code 1, Error:/Fix: lines in human mode, a status
 * array in JSON mode.
 */
import { StoreError, type StoreDiagnostic } from '../core/store/errors.js';

export function printJson(payload: unknown): void {
  console.log(JSON.stringify(payload, null, 2));
}

export function asErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * @inquirer prompts reject with ExitPromptError on Ctrl-C; commands
 * translate that to `Cancelled.` + exit 130 (third caller extracted
 * this here in slice 7.1).
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
  // RootSelectionError (and siblings) carry the same envelope without
  // sharing a class hierarchy; duck-type the diagnostic once, here.
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
  // Ctrl-C in a prompt is the user's choice, not an error: every
  // command group gets the Cancelled./130 convention through here.
  if (!json && isPromptCancellationError(error)) {
    console.error('Cancelled.');
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
  console.error(`Error: ${status.message}`);
  if (status.fix) {
    console.error(`Fix: ${status.fix}`);
  }
  process.exitCode = 1;
}
