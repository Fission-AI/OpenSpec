/**
 * One-time note telling package-manager users that the standalone install
 * exists. It only offers: people who chose npm may have a reason, so it is
 * shown once, never repeated, and never changes anything.
 *
 * Shown on stderr after `openspec update` (the moment people think about
 * versions), and only for a global package-manager install. Deferred, not
 * consumed, when nobody would read it: stderr that is not a terminal (agents,
 * pipes) and CI.
 */
import { isCiEnvironment } from '../utils/ci.js';
import { markConfigFlag, readRawConfig } from './completion-tip.js';
import { getCliInstallInfo, getStandaloneBinaryPath } from './version-check.js';

export const STANDALONE_TIP_MESSAGE =
  "Tip: OpenSpec also comes as a standalone app that runs without Node.js. To switch, run 'openspec install'.";

/** Never throws: a hint must not break a command. */
export async function maybeShowStandaloneTip(options: { silent?: boolean } = {}): Promise<void> {
  if (isCiEnvironment() || getStandaloneBinaryPath()) {
    return;
  }
  try {
    const raw = readRawConfig();
    if (raw === null || raw.standaloneTipSeen === true || options.silent) {
      return;
    }
    // Project dependencies, npx runs and source checkouts have nothing to switch.
    if (getCliInstallInfo().scope !== 'global') {
      return;
    }
    // Record before printing: if the flag cannot be saved, staying quiet beats
    // repeating the note on every run.
    await markConfigFlag('standaloneTipSeen');
    console.error(`\n${STANDALONE_TIP_MESSAGE}`);
  } catch {
    // Silent failure - a hint should never break the CLI.
  }
}
