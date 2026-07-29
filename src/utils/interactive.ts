export type InteractiveOptions = {
  /**
   * Explicit "disable prompts" flag passed by internal callers.
   */
  noInteractive?: boolean;
  /**
   * Commander-style negated option: `--no-interactive` sets this to false.
   */
  interactive?: boolean;
};

/**
 * Resolves whether non-interactive mode is requested.
 * Handles both explicit `noInteractive: true` and Commander.js style `interactive: false`.
 * Use this helper instead of manually checking options.noInteractive to avoid bugs.
 */
export function resolveNoInteractive(value?: boolean | InteractiveOptions): boolean {
  if (typeof value === 'boolean') return value;
  return value?.noInteractive === true || value?.interactive === false;
}

export function isInteractive(value?: boolean | InteractiveOptions): boolean {
  if (resolveNoInteractive(value)) return false;
  if (process.env.OPEN_SPEC_INTERACTIVE === '0') return false;
  // Respect the standard CI environment variable (set by GitHub Actions, GitLab CI, Travis, etc.)
  if ('CI' in process.env) return false;
  return !!process.stdin.isTTY;
}

/**
 * True when a prompt failed because no answer could be read — an agent or a
 * script that ran the command with stdin closed, a CI job, or a shell whose
 * stdin is not a terminal. @inquirer rejects those with `User force closed
 * the prompt with 0 null`, which is accurate and useless: it names no flag
 * and no next step (#1479).
 *
 * Two things it deliberately is not:
 *
 * - It is not a substitute for `isInteractive()`. This classifies a prompt
 *   that has *already failed*, so piped answers are unaffected: an answer
 *   that arrives resolves the prompt and never reaches this check. Refusing
 *   to prompt up front would break `printf 'y\n' | openspec archive ...`,
 *   which works today.
 * - It is not a cancellation check. Ctrl-C raises the same error class, and
 *   it reaches a process whose stdin is a pipe just as easily as one at a
 *   terminal, so the SIGINT signal - not the terminal - is what proves
 *   somebody was there and chose to quit.
 *
 * Beyond that it defers to `isInteractive()`, so `CI`, `OPEN_SPEC_INTERACTIVE=0`
 * and `--no-interactive` count even when a runner allocated a pty.
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
  return !isInteractive(value);
}

