/**
 * First-run hint pointing users at opt-in shell completions.
 *
 * This hint used to be an npm `postinstall` script. Printing it from the CLI
 * instead lets the package ship with no install scripts at all, so `npm install`
 * no longer emits an `allow-scripts` warning. Completions stay opt-in: the tip
 * only names the command, it never installs anything.
 *
 * The tip goes to stderr, never stdout, so it cannot contaminate piped command
 * output.
 *
 * The tip is suppressed when:
 * - CI=true / CI=1
 * - OPENSPEC_NO_COMPLETIONS=1
 * - the run asked for JSON output (deferred, not consumed — see `silent`),
 *   whose consumers read stderr for failures
 * - the user is already running `openspec completion ...`
 */
import { getGlobalConfig, saveGlobalConfig } from './global-config.js';

export const COMPLETION_TIP_MESSAGE =
  "Tip: Run 'openspec completion install' for shell completions";

export interface CompletionTipOptions {
  /**
   * Skip printing without marking the tip as seen, so it still appears on the
   * user's first later run that can safely carry it.
   */
  silent?: boolean;
}

function isSuppressedByEnv(): boolean {
  return (
    process.env.CI === 'true' ||
    process.env.CI === '1' ||
    process.env.OPENSPEC_NO_COMPLETIONS === '1'
  );
}

/**
 * Print the completion tip once, the first time the CLI runs.
 * Never throws — a hint must not break a command.
 */
export function maybeShowCompletionTip(options: CompletionTipOptions = {}): void {
  if (isSuppressedByEnv()) {
    return;
  }

  try {
    const config = getGlobalConfig();
    if (config.completionTipSeen === true) {
      return;
    }

    if (options.silent) {
      return;
    }

    console.error(`\n${COMPLETION_TIP_MESSAGE}`);
    saveGlobalConfig({ ...config, completionTipSeen: true });
  } catch {
    // Silent failure - a hint should never break the CLI.
  }
}
