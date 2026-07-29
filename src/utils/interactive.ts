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
 * True when a prompt failed because there was nobody at a terminal to answer
 * it — an agent or a script that ran the command with stdin closed. @inquirer
 * rejects those with `User force closed the prompt with 0 null`, which is
 * accurate and useless: it names no flag and no next step (#1479).
 *
 * Ctrl-C raises the same error class, so the TTY check is what separates "the
 * user quit" from "there was never anyone there". Answers piped into the
 * command still work — this only inspects a prompt that already failed.
 */
export function isNonInteractivePromptError(error: unknown): boolean {
  if (process.stdin.isTTY) return false;
  return (
    error instanceof Error &&
    (error.name === 'ExitPromptError' || error.message.includes('force closed the prompt'))
  );
}

