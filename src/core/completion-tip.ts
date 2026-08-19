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
 * - CI is set (any value npm/telemetry would treat as CI)
 * - OPENSPEC_NO_COMPLETIONS=1
 * - completions are already installed for the user's shell
 * - the caller passes `silent` — JSON runs, `openspec completion ...`, and
 *   non-TTY runs, which are deferred rather than consumed (see `silent`)
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { getGlobalConfigPath } from './global-config.js';
import { isCiEnvironment } from '../utils/ci.js';
import { detectShell } from '../utils/shell-detection.js';
import { CompletionFactory } from './completions/factory.js';

export const COMPLETION_TIP_MESSAGE =
  "Tip: Run 'openspec completion install' for shell completions";

export interface CompletionTipOptions {
  /**
   * Skip printing without marking the tip as seen, so it still appears on the
   * user's first later run that can safely carry it. Used for runs nobody would
   * read the tip from: JSON output, and stderr that is not a terminal.
   */
  silent?: boolean;
}

function isSuppressedByEnv(): boolean {
  // isCiEnvironment, not a CI==='true' string check: providers set CI to "True",
  // "yes", "on", and the tip should be as quiet in those builds as telemetry is.
  return isCiEnvironment() || process.env.OPENSPEC_NO_COMPLETIONS === '1';
}

/**
 * True when the user's shell already has an OpenSpec completion script.
 *
 * Without this the tip tells people to install completions they installed long
 * ago — including on the run right after `openspec completion install`, whose
 * own run only defers the tip. Costs one `stat`, and only until the tip is
 * consumed. Unknown or unsupported shells fall through to showing the tip.
 */
async function completionsAlreadyInstalled(): Promise<boolean> {
  try {
    const { shell } = detectShell();
    if (!shell) {
      return false;
    }
    return await CompletionFactory.createInstaller(shell).isInstalled();
  } catch {
    return false;
  }
}

/**
 * Read the global config exactly as it sits on disk.
 *
 * Deliberately NOT `getGlobalConfig()`: that merges in defaults, and writing the
 * merged result back would stamp `profile`/`delivery` into a file the user never
 * set them in. `migrateIfNeeded` treats a raw `profile` as "already migrated",
 * so that stamp would permanently suppress the one-time profile migration and
 * cost users their installed workflow skills.
 *
 * Returns null when the file exists but cannot be read or parsed — a config we
 * cannot understand is left strictly alone rather than overwritten.
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

function markTipSeen(raw: Record<string, unknown>): void {
  const configPath = getGlobalConfigPath();
  fs.mkdirSync(path.dirname(configPath), { recursive: true });
  fs.writeFileSync(
    configPath,
    JSON.stringify({ ...raw, completionTipSeen: true }, null, 2) + '\n',
    'utf-8'
  );
}

/**
 * Print the completion tip once, the first time the CLI runs.
 * Never throws — a hint must not break a command.
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

    // Already installed: retire the tip quietly rather than advertising it again.
    if (await completionsAlreadyInstalled()) {
      markTipSeen(raw);
      return;
    }

    // Record before printing: if the flag cannot be persisted, staying quiet
    // beats reprinting the tip on every future run.
    markTipSeen(raw);
    console.error(`\n${COMPLETION_TIP_MESSAGE}`);
  } catch {
    // Silent failure - a hint should never break the CLI.
  }
}
