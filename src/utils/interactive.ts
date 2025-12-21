type InteractiveOptions = {
  /**
   * Explicit "disable prompts" flag passed by internal callers.
   */
  noInteractive?: boolean;
  /**
   * Commander-style negated option: `--no-interactive` sets this to false.
   */
  interactive?: boolean;
};

function resolveNoInteractive(value?: boolean | InteractiveOptions): boolean {
  if (typeof value === 'boolean') return value;
  return value?.noInteractive === true || value?.interactive === false;
}

export function isInteractive(value?: boolean | InteractiveOptions): boolean {
  if (resolveNoInteractive(value)) return false;
  if (process.env.OPEN_SPEC_INTERACTIVE === '0') return false;
  return !!process.stdin.isTTY;
}

