import { spawn } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import chalk from 'chalk';
import { findCopiesOnPath, samePath } from '../utils/executable-path.js';
import {
  getCliInstallInfo,
  getStandaloneBinaryPath,
  type CliInstallInfo,
} from '../core/version-check.js';

/**
 * `openspec install`: installs the standalone binary (no Node.js needed) by
 * running the same release installer the docs give users, then says how to
 * retire the package-manager copy. It never removes that copy itself: switching
 * is the user's choice, and so is when.
 */

// The installers come from main, which always has them; they then pick the
// newest release whose files are all attached (see install.sh).
const INSTALLER_BASE = 'https://raw.githubusercontent.com/Fission-AI/OpenSpec/main/scripts/binary';
const RELEASE_VERSION = /^v?\d{1,10}\.\d{1,10}\.\d{1,10}(?:-[0-9A-Za-z.-]{1,64})?$/;

export interface InstallTarget {
  dir: string;
  name: string;
}

/**
 * Where the installer will put the binary. Mirrors install.sh and install.ps1,
 * and is passed to them explicitly so both sides agree. The standalone binary
 * reinstalls itself where it is, under its own name.
 */
export function resolveInstallTarget(
  env: NodeJS.ProcessEnv = process.env,
  platform: NodeJS.Platform = process.platform,
  standalonePath: string | null = getStandaloneBinaryPath()
): InstallTarget {
  const defaultName = platform === 'win32' ? 'openspec.exe' : 'openspec';
  if (env.OPENSPEC_INSTALL_DIR) {
    return { dir: path.resolve(env.OPENSPEC_INSTALL_DIR), name: env.OPENSPEC_INSTALL_NAME || defaultName };
  }
  if (standalonePath) {
    return { dir: path.dirname(standalonePath), name: path.basename(standalonePath) };
  }
  if (platform === 'win32') {
    const localAppData = env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local');
    return { dir: path.join(localAppData, 'Programs', 'openspec'), name: defaultName };
  }
  return { dir: path.join(os.homedir(), '.local', 'bin'), name: defaultName };
}

/** The command that removes a package-manager install, or null when there is nothing to remove. */
export function removeCommandFor(install: CliInstallInfo): string | null {
  if (install.scope !== 'global') return null;
  // The Homebrew formula keeps its own npm tree under Cellar; brew owns it.
  if (install.location && /[\\/]Cellar[\\/]openspec[\\/]/i.test(install.location)) {
    return 'brew uninstall openspec';
  }
  switch (install.packageManager) {
    case 'npm':
      return 'npm uninstall -g @fission-ai/openspec';
    case 'pnpm':
      return 'pnpm remove -g @fission-ai/openspec';
    case 'yarn':
      return 'yarn global remove @fission-ai/openspec';
    case 'bun':
      return 'bun remove -g @fission-ai/openspec';
    case 'volta':
      return 'volta uninstall @fission-ai/openspec';
    default:
      return null;
  }
}

/**
 * Checks a download source given through the environment. Release files and
 * SHA256SUMS come from the same place, so a remote plain-HTTP source could
 * swap both: only https, or http to this machine. The host is parsed, not
 * prefix-matched, and a user part (http://localhost:80@evil.example/) is
 * refused.
 */
export function checkSource(label: string, value: string): string {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`${label} is not a URL: ${value}`);
  }
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  if (url.username || url.password || (url.protocol !== 'https:' && !(url.protocol === 'http:' && local))) {
    throw new Error(`${label} must use https (or http to localhost): ${value}`);
  }
  return url.href.replace(/\/+$/, '');
}

/** Where the installer script comes from: OPENSPEC_DOWNLOAD_URL when set (mirrors, tests), else main. */
export function installerBase(env: NodeJS.ProcessEnv = process.env): string {
  if (env.OPENSPEC_RELEASES_URL) checkSource('OPENSPEC_RELEASES_URL', env.OPENSPEC_RELEASES_URL);
  return env.OPENSPEC_DOWNLOAD_URL ? checkSource('OPENSPEC_DOWNLOAD_URL', env.OPENSPEC_DOWNLOAD_URL) : INSTALLER_BASE;
}

// Fixed scripts: the installer URL reaches them as data (an argument, or an
// environment variable), never as part of the command text.
const POSIX_RUNNER =
  'f=$(mktemp) || exit 1; { curl -fsSL "$1" -o "$f" 2>/dev/null || wget -q -O "$f" "$1"; } && sh "$f"; s=$?; rm -f "$f"; exit $s';
const WINDOWS_RUNNER = 'irm $env:OPENSPEC_INSTALLER_URL | iex';

/**
 * Downloads and runs the installer with the same tools as the documented
 * one-liners (curl or wget; PowerShell's irm), so proxies and certificates
 * behave as they do for those. Saved to a file first on macOS and Linux:
 * piped straight into sh, a failed download would look like a successful run.
 */
function runInstaller(scriptUrl: string, env: NodeJS.ProcessEnv): Promise<number> {
  const windows = process.platform === 'win32';
  const command = windows ? 'powershell.exe' : 'sh';
  const args = windows
    ? ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', WINDOWS_RUNNER]
    : ['-c', POSIX_RUNNER, 'openspec-install', scriptUrl];
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: 'inherit',
      env: windows ? { ...env, OPENSPEC_INSTALLER_URL: scriptUrl } : env,
    });
    child.on('error', reject);
    child.on('close', (code) => resolve(code ?? 1));
  });
}

export async function installStandalone(options: { version?: string } = {}): Promise<void> {
  const { version } = options;
  if (version && version !== 'latest' && !RELEASE_VERSION.test(version)) {
    throw new Error(`Not a release version: ${version}. Use one like 1.15.0, or leave it out for the latest.`);
  }

  const scriptUrl = `${installerBase()}/${process.platform === 'win32' ? 'install.ps1' : 'install.sh'}`;
  const target = resolveInstallTarget();
  const exitCode = await runInstaller(scriptUrl, {
    ...process.env,
    OPENSPEC_INSTALL_DIR: target.dir,
    OPENSPEC_INSTALL_NAME: target.name,
    ...(version && version !== 'latest' ? { OPENSPEC_VERSION: version } : {}),
  });
  if (exitCode !== 0) {
    throw new Error(`The standalone install did not finish (installer: ${scriptUrl}).`);
  }

  const installedPath = path.join(target.dir, target.name);
  const defaultName = process.platform === 'win32' ? 'openspec.exe' : 'openspec';
  // A custom file name is never what `openspec` on PATH finds, so skip that check.
  const first = target.name === defaultName ? findCopiesOnPath()[0] : undefined;
  const runsStandalone = first !== undefined && samePath(first, installedPath);
  // Run from a package manager, the old copy stays until the user removes it.
  const remove = getStandaloneBinaryPath() ? null : removeCommandFor(getCliInstallInfo());

  console.log();
  if (runsStandalone) {
    console.log('openspec now runs the standalone copy.');
  } else if (first) {
    console.log(`${first} comes first on your PATH, so it still runs.`);
  } else if (target.name === defaultName) {
    console.log('Open a new terminal so it picks up the new PATH.');
  }
  if (remove) {
    console.log(runsStandalone ? 'To remove your package-manager copy:' : 'To switch, remove your package-manager copy:');
    console.log(chalk.cyan(`  ${remove}`));
  }
  console.log(chalk.dim("Check with 'openspec version'; it shows (standalone)."));
}
