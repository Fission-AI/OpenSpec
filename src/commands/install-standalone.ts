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

const RELEASES_URL = 'https://github.com/Fission-AI/OpenSpec/releases';
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

function releaseBase(version: string | undefined): string {
  if (process.env.OPENSPEC_DOWNLOAD_URL) return process.env.OPENSPEC_DOWNLOAD_URL.replace(/\/+$/, '');
  if (!version || version === 'latest') return `${RELEASES_URL}/latest/download`;
  return `${RELEASES_URL}/download/${version.startsWith('v') ? version : `v${version}`}`;
}

/**
 * Downloads and runs the installer with the same tools as the documented
 * one-liners (curl or wget; PowerShell's irm), so proxies and certificates
 * behave as they do for those. Saved to a file first: piped straight into sh,
 * a failed download would look like a successful run.
 */
function runInstaller(scriptUrl: string, env: NodeJS.ProcessEnv): Promise<number> {
  const [command, args] =
    process.platform === 'win32'
      ? [
          'powershell.exe',
          ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', `irm '${scriptUrl.replace(/'/g, "''")}' | iex`],
        ]
      : [
          'sh',
          [
            '-c',
            'f=$(mktemp) || exit 1; ' +
              '{ curl -fsSL "$1" -o "$f" 2>/dev/null || wget -q -O "$f" "$1"; } && sh "$f"; ' +
              's=$?; rm -f "$f"; exit $s',
            'openspec-install',
            scriptUrl,
          ],
        ];
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: 'inherit', env });
    child.on('error', reject);
    child.on('close', (code) => resolve(code ?? 1));
  });
}

export async function installStandalone(options: { version?: string } = {}): Promise<void> {
  const { version } = options;
  if (version && version !== 'latest' && !RELEASE_VERSION.test(version)) {
    throw new Error(`Not a release version: ${version}. Use one like 1.15.0, or leave it out for the latest.`);
  }

  const base = releaseBase(version);
  const scriptUrl = `${base}/${process.platform === 'win32' ? 'install.ps1' : 'install.sh'}`;
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
