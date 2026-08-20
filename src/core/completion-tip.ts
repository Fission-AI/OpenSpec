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
 * - completions are already installed, or the shell is one the installer would
 *   reject
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
 * Whether the tip is worth showing, once we know it is owed and readable.
 *
 * "retire" consumes the tip without printing: the user either already has
 * completions, or is on a shell `openspec completion install` would refuse.
 *
 * Without the installed check the tip tells people to install completions they
 * installed long ago — including on the run right after `completion install`,
 * whose own run only defers the tip. An undetected or unsupported shell retires
 * it too: `completion install` exits 1 for those users, so pointing them at it
 * is a dead end, and this tip is the only message about completions they would
 * ever get.
 *
 * Not free: detectShell() forks `ps` to read the parent process (except on
 * Windows), so this costs a spawn plus a stat. It runs only on interactive runs
 * that still owe the tip, which is normally exactly one — but a config that
 * cannot be written never records the flag, and then every interactive run pays
 * it. On any unexpected error we show the tip rather than swallow it.
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

/**
 * Record the flag, re-reading the config first and replacing the file by rename.
 *
 * Deciding whether to show the tip costs a `ps` spawn and a stat, and a sibling
 * `openspec` process can write the same file in that window — on a first run
 * that is exactly when telemetry mints `anonymousId`. Re-reading here keeps the
 * write down to this one key, and the rename keeps a reader from ever seeing a
 * half-written config.
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

    const decision = await decideTip();

    // Record before printing: if the flag cannot be persisted, staying quiet
    // beats reprinting the tip on every future run.
    markTipSeen();
    if (decision === 'show') {
      console.error(`\n${COMPLETION_TIP_MESSAGE}`);
    }
  } catch {
    // Silent failure - a hint should never break the CLI.
  }
}
