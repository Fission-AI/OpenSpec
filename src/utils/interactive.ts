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

