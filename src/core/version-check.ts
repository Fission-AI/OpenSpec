import fs from 'fs';
import http from 'http';
import https from 'https';
import path from 'path';
import { createRequire } from 'module';
import chalk from 'chalk';
import { isCiEnvironment } from '../utils/ci.js';
import { getGlobalConfig } from './global-config.js';

const require = createRequire(import.meta.url);
const { name: PACKAGE_NAME, version: OPENSPEC_VERSION } = require('../../package.json');

const DEFAULT_REGISTRY = 'https://registry.npmjs.org';
const REQUEST_TIMEOUT_MS = 1500;
const MAX_RESPONSE_BYTES = 256 * 1024;
const VERSION_PROBE_TIMEOUT_MS = 5000;
const MAX_REDIRECTS = 3;

/**
 * A version we are willing to print. The registry only ever serves SemVer here,
 * so anything else is either a broken mirror or a hostile response — and since
 * this string lands in the terminal next to an install command, an unvalidated
 * one could smuggle ANSI cursor controls and repaint the lines around it.
 */
const SAFE_VERSION = /^\d{1,10}\.\d{1,10}\.\d{1,10}(?:-[0-9A-Za-z.-]{1,64})?(?:\+[0-9A-Za-z.-]{1,64})?$/;

/**
 * The check is opt-out and must never get in the way: no network in CI or
 * tests, an explicit escape hatch for anyone offline or air-gapped, and the
 * same privacy signals telemetry already honors — a user who set DO_NOT_TRACK
 * or telemetry.enabled false did not agree to a different outbound request.
 */
function isCheckEnabled(): boolean {
  if (process.env.OPENSPEC_NO_UPDATE_CHECK !== undefined) return false;
  if (process.env.DO_NOT_TRACK === '1') return false;
  if (process.env.OPENSPEC_TELEMETRY === '0') return false;
  if (isCiEnvironment()) return false;
  if (process.env.NODE_ENV === 'test') return false;
  // Same config opt-out as telemetry (env remains the hard override above).
  if (getGlobalConfig().telemetry?.enabled === false) return false;
  return true;
}

/**
 * The registry to ask: only the environment variable npm exports (under
 * `npm run`, or an explicit export). Deliberately not a `registry=` line from
 * any .npmrc — letting file contents choose the destination of an outbound
 * request is a flow worth avoiding for a convenience this small, and a project
 * file would travel with a cloned repository. Anyone on a private mirror can
 * export `npm_config_registry`, or turn the check off entirely.
 */
export function registryUrl(): string {
  const configured = process.env.npm_config_registry?.trim();
  const base = configured && /^https?:\/\//i.test(configured) ? configured : DEFAULT_REGISTRY;
  return `${base.replace(/\/+$/, '')}/${PACKAGE_NAME}/latest`;
}

/**
 * Compares two prerelease tags per SemVer: dot-separated identifiers compared
 * one by one, numeric identifiers numerically (so beta.10 > beta.2), numeric
 * ranking below alphanumeric, and a longer identifier list winning ties.
 */
function comparePrerelease(a: string, b: string): number {
  if (a === b) return 0;
  if (a === '') return 1;
  if (b === '') return -1;

  const left = a.split('.');
  const right = b.split('.');

  for (let i = 0; i < Math.max(left.length, right.length); i++) {
    const l = left[i];
    const r = right[i];
    if (l === undefined) return -1;
    if (r === undefined) return 1;

    const lNumeric = /^\d+$/.test(l);
    const rNumeric = /^\d+$/.test(r);

    if (lNumeric && rNumeric) {
      const diff = Number.parseInt(l, 10) - Number.parseInt(r, 10);
      if (diff !== 0) return diff > 0 ? 1 : -1;
      continue;
    }
    if (lNumeric !== rNumeric) return lNumeric ? -1 : 1;
    if (l !== r) return l > r ? 1 : -1;
  }

  return 0;
}

/**
 * Compares two semver-ish versions. Returns 1 when a > b, -1 when a < b, 0
 * otherwise. Prereleases sort below their release (1.7.0-beta.1 < 1.7.0).
 */
export function compareVersions(a: string, b: string): number {
  const parse = (version: string) => {
    const withoutBuild = version.trim().replace(/^v/, '').split('+', 1)[0] ?? '';
    const separator = withoutBuild.indexOf('-');
    const core = separator === -1 ? withoutBuild : withoutBuild.slice(0, separator);
    const prerelease = separator === -1 ? '' : withoutBuild.slice(separator + 1);
    const parts = core.split('.').map((n) => Number.parseInt(n, 10));
    return {
      numbers: [parts[0] || 0, parts[1] || 0, parts[2] || 0],
      prerelease,
    };
  };

  const left = parse(a);
  const right = parse(b);

  for (let i = 0; i < 3; i++) {
    if (left.numbers[i] > right.numbers[i]) return 1;
    if (left.numbers[i] < right.numbers[i]) return -1;
  }

  return comparePrerelease(left.prerelease, right.prerelease);
}

/**
 * Reads the `latest` dist-tag. Sends no custom Accept header: the registry
 * answers `/<pkg>/latest` with 406 for npm's abbreviated-metadata type, which
 * it only serves on the full packument.
 *
 * Uses node:http(s) rather than fetch so the timeout can destroy the socket.
 * Aborting a fetch that is still completing its TCP handshake — a firewall
 * dropping packets, a captive portal — leaves the connect handle open and the
 * CLI cannot exit until the OS gives up, long after the hint has printed.
 */
function fetchLatestVersion(): Promise<string | null> {
  return new Promise((resolve) => {
    let settled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const finish = (version: string | null) => {
      if (settled) return;
      settled = true;
      if (timer) clearTimeout(timer);
      resolve(version);
    };

    let url: URL;
    try {
      url = new URL(registryUrl());
    } catch {
      resolve(null);
      return;
    }

    // Mirrors and corporate front-ends redirect; without following one the
    // check would be permanently and silently dead for them.
    let redirectsLeft = MAX_REDIRECTS;

    // The budget timer must tear down whichever request is open when it
    // fires. Closing over the first hop's request would leave a redirected
    // socket alive: a target that trickles bytes keeps resetting its idle
    // timeout, and only the body-size cap would end it.
    let activeRequest: http.ClientRequest | undefined;

    const send = (target: URL): void => {
      const request = (target.protocol === 'http:' ? http : https).get(
        target,
        { timeout: REQUEST_TIMEOUT_MS },
        (response) => {
          const status = response.statusCode ?? 0;
          const location = response.headers.location;

          if (status >= 300 && status < 400 && location) {
            response.resume();
            request.destroy();
            if (redirectsLeft <= 0) {
              finish(null);
              return;
            }
            redirectsLeft -= 1;
            try {
              const next = new URL(location, target);
              // Never follow a downgrade to plain http: a MITM on the reply
              // would control the "newer version" answer.
              const downgrade = target.protocol === 'https:' && next.protocol === 'http:';
              if (!downgrade && (next.protocol === 'http:' || next.protocol === 'https:')) {
                send(next);
                return;
              }
            } catch {
              // Unparseable Location.
            }
            finish(null);
            return;
          }

          if (status !== 200) {
            response.resume();
            request.destroy();
            finish(null);
            return;
          }

          let body = '';
          response.setEncoding('utf-8');
          response.on('data', (chunk: string) => {
            body += chunk;
            // The dist-tag document is small; refuse to buffer a firehose.
            if (body.length > MAX_RESPONSE_BYTES) {
              request.destroy();
              finish(null);
            }
          });
          response.on('end', () => {
            try {
              const parsed = JSON.parse(body) as { version?: unknown };
              const version = parsed.version;
              finish(typeof version === 'string' && SAFE_VERSION.test(version) ? version : null);
            } catch {
              finish(null);
            }
          });
          response.on('error', () => finish(null));
        }
      );

      activeRequest = request;

      request.on('timeout', () => {
        request.destroy();
        finish(null);
      });
      request.on('error', () => finish(null));

      // One budget for the whole exchange, redirects included.
      if (!timer) {
        timer = setTimeout(() => {
          activeRequest?.destroy();
          finish(null);
        }, REQUEST_TIMEOUT_MS);
      }
    };

    send(url);
  });
}

/**
 * Returns the published version when the installed CLI is behind it, otherwise
 * null. Never throws and never blocks for longer than the request timeout.
 */
export async function getAvailableCliUpdate(): Promise<string | null> {
  if (!isCheckEnabled()) return null;

  try {
    const latest = await fetchLatestVersion();
    if (!latest) return null;
    return compareVersions(latest, OPENSPEC_VERSION) > 0 ? latest : null;
  } catch {
    return null;
  }
}

/**
 * Directory the running CLI was loaded from, or null when it cannot be
 * resolved. Shown in the upgrade hint so anyone who upgraded but still runs an
 * old binary — a stale pnpm/volta/npx shim, or two installs on PATH — can see
 * which copy is actually answering.
 */
export function getInstallDir(): string | null {
  try {
    return path.dirname(require.resolve('../../package.json'));
  } catch {
    return null;
  }
}

/**
 * True when the running CLI resolves from a `node_modules` belonging to the
 * project being updated or any ancestor of it — the hoisted-root layout npm and
 * pnpm workspaces produce. Anchored on the target path rather than the working
 * directory, since `openspec update <path>` and running from a sub-package are
 * both normal. Never throws: process.cwd() fails when the directory has been
 * deleted, and a wrong upgrade hint must not take down a successful update.
 */
export function isProjectLocalInstall(
  installDir: string | null,
  projectPath: string = '.'
): boolean {
  if (!installDir) return false;

  // Windows paths differ in case and drive-letter casing between sources.
  const normalize = (value: string) =>
    process.platform === 'win32' ? value.toLowerCase() : value;

  try {
    let dir = path.resolve(projectPath);
    const target = normalize(installDir);

    for (;;) {
      if (target.startsWith(normalize(path.join(dir, 'node_modules') + path.sep))) {
        return true;
      }
      const parent = path.dirname(dir);
      if (parent === dir) return false;
      dir = parent;
    }
  } catch {
    return false;
  }
}

/**
 * True for the throwaway caches npx/pnpm dlx/bunx unpack into. Telling those
 * users to install globally would create the second copy on PATH they were
 * deliberately avoiding.
 */
export function isEphemeralRunnerInstall(installDir: string | null): boolean {
  if (!installDir) return false;
  const segments = installDir.split(/[\\/]/).map((segment) => segment.toLowerCase());
  return segments.some(
    (segment, i) =>
      segment === '_npx' ||
      segment === '_bunx' ||
      // Only a package manager's own cache, never a user directory that
      // happens to be called "dlx". Windows uses pnpm-cache for the same job.
      (segment === 'dlx' &&
        ['pnpm', 'bun', '.pnpm', 'pnpm-cache', 'bun-cache'].includes(segments[i - 1] ?? ''))
  );
}

/**
 * Directories npm installs global packages into. Derived from the running node
 * rather than by shelling out to `npm prefix -g`, which would cost more than
 * the version check itself. Only a hint: `process.execPath` is realpath'd, so
 * on Homebrew it lands in the Cellar rather than the brew prefix — which is
 * why the install's own layout is the primary signal below.
 */
export function npmGlobalRoots(): string[] {
  const roots: string[] = [];
  const nodeDir = path.dirname(process.execPath);

  if (process.platform === 'win32') {
    roots.push(path.join(nodeDir, 'node_modules'));
    if (process.env.APPDATA) {
      roots.push(path.join(process.env.APPDATA, 'npm', 'node_modules'));
    }
  } else {
    roots.push(path.resolve(nodeDir, '..', 'lib', 'node_modules'));
  }

  const prefix = process.env.npm_config_prefix;
  if (prefix) {
    roots.push(
      process.platform === 'win32'
        ? path.join(prefix, 'node_modules')
        : path.join(prefix, 'lib', 'node_modules')
    );
  }

  return roots;
}

/**
 * The prefix of an npm global install, read from the install's own shape:
 * `<prefix>/lib/node_modules/<pkg>` on POSIX, `<prefix>/node_modules/<pkg>` on
 * Windows. Self-describing, so it holds for Homebrew, nvm, Debian and anywhere
 * else npm's prefix is not derivable from the node binary. Null when the
 * layout does not match.
 */
export function npmPrefixFromInstallDir(installDir: string | null): string | null {
  if (!installDir) return null;

  let dir = installDir;
  for (;;) {
    const parent = path.dirname(dir);
    if (parent === dir) return null;
    if (path.basename(dir).toLowerCase() === 'node_modules') break;
    dir = parent;
  }

  const container = path.dirname(dir);
  if (process.platform === 'win32') return container;
  // POSIX npm always nests the root under lib/.
  return path.basename(container).toLowerCase() === 'lib' ? path.dirname(container) : null;
}

/**
 * True only when npm itself owns this copy. Everything else — a pnpm, bun,
 * yarn or volta global — would be made worse by `npm install -g`, which adds a
 * second copy that may not even be the one on PATH.
 */
export function isNpmGlobalInstall(
  installDir: string | null,
  roots: string[] = npmGlobalRoots()
): boolean {
  if (!installDir) return false;
  // Another manager's layout can still look like npm's (volta nests a whole
  // node install), so who owns it is decided before where it sits.
  if (detectPackageManager(installDir) !== 'npm') return false;

  const normalize = (value: string) =>
    process.platform === 'win32' ? value.toLowerCase() : value;
  const target = normalize(installDir);
  if (roots.some((root) => target.startsWith(normalize(root + path.sep)))) return true;

  // The derived roots miss any prefix that is not beside the node binary, so
  // fall back to the install's own shape plus the bin directory npm would
  // have written the shim into.
  const prefix = npmPrefixFromInstallDir(installDir);
  if (!prefix) return false;
  try {
    // Corroborate with something npm itself wrote: the bin dir on POSIX, the
    // .cmd shim on Windows. The prefix alone proves nothing — it is just the
    // parent of the node_modules dir the CLI resolved from, so a hand-copied
    // portable tree would pass and be offered an npm upgrade it never had.
    return fs.existsSync(
      process.platform === 'win32' ? path.join(prefix, 'openspec.cmd') : path.join(prefix, 'bin')
    );
  } catch {
    return false;
  }
}

/**
 * True when the CLI is running from a clone rather than an install. Upgrade
 * advice is meaningless there: the version is whatever the branch says.
 */
export function isSourceCheckout(installDir: string | null): boolean {
  if (!installDir) return false;
  try {
    return fs.existsSync(path.join(installDir, '.git'));
  } catch {
    return false;
  }
}

export type PackageManager = 'npm' | 'pnpm' | 'bun' | 'yarn' | 'volta';

/**
 * The package manager that owns this copy, so the printed command is one the
 * user's setup will actually honor.
 */
export function detectPackageManager(installDir: string | null): PackageManager {
  // Lowercased because the Windows directories are capitalized and undotted:
  // %LOCALAPPDATA%\\Volta, \\Yarn\\Data, \\pnpm-cache.
  const segments = (installDir ?? '').split(/[\\/]/).map((segment) => segment.toLowerCase());
  const has = (...names: string[]) => names.some((name) => segments.includes(name));

  // The undotted spelling exists for Windows (%LOCALAPPDATA%\Volta), whose
  // layout nests tools\image; require both segments so a user or project
  // directory merely named "volta" (even one with its own "tools" dir) does
  // not steal the install.
  if (has('.volta') || (has('volta') && has('tools') && has('image'))) return 'volta';
  if (has('.bun')) return 'bun';
  // These two need a corroborating segment: a directory merely named "pnpm" or
  // "yarn" (a user's home, a project) is not a global install of one.
  if (has('.pnpm-global', 'pnpm-cache')) return 'pnpm';
  if (has('pnpm') && has('global', 'dlx', 'store')) return 'pnpm';
  if (has('.yarn') || (has('yarn') && has('global'))) return 'yarn';
  return 'npm';
}

const GLOBAL_UPGRADE_COMMANDS: Record<PackageManager, string> = {
  npm: `npm install -g ${PACKAGE_NAME}@latest`,
  pnpm: `pnpm add -g ${PACKAGE_NAME}@latest`,
  bun: `bun add -g ${PACKAGE_NAME}@latest`,
  yarn: `yarn global add ${PACKAGE_NAME}@latest`,
  volta: `volta install ${PACKAGE_NAME}@latest`,
};

/**
 * Builds the hint, with the upgrade command chosen for how this copy of the CLI
 * was installed. Pure so every branch is assertable.
 */
export function buildCliUpdateLines(
  latestVersion: string,
  installDir: string | null,
  projectPath: string,
  options: { withCommand?: boolean } = {}
): string[] {
  const lines = [`A newer OpenSpec CLI is available (v${OPENSPEC_VERSION} → v${latestVersion}).`];

  // Omitted when we are about to offer to run it — printing a command and then
  // asking to run that same command reads like the user has to do both.
  if (options.withCommand !== false) {
    lines.push(...buildUpgradeCommandLines(installDir, projectPath));
  }
  if (installDir) {
    lines.push(`  Running from: ${installDir}`);
  }

  return lines;
}

/**
 * The upgrade command for however this copy was installed, plus the reminder
 * that instruction files come from the CLI and so need a second pass.
 */
export function buildUpgradeCommandLines(
  installDir: string | null,
  projectPath: string
): string[] {
  const lines: string[] = [];

  if (isEphemeralRunnerInstall(installDir)) {
    // That command *is* the update, so there is nothing to run afterwards.
    lines.push(`  npx ${PACKAGE_NAME}@latest update`);
    return lines;
  }

  if (isProjectLocalInstall(installDir, projectPath)) {
    // Its package manager owns the lockfile; naming npm could be wrong.
    lines.push(`  Update the ${PACKAGE_NAME} dependency in this project.`);
  } else {
    lines.push(`  ${GLOBAL_UPGRADE_COMMANDS[detectPackageManager(installDir)]}`);
  }

  lines.push('  Then run "openspec update" again to pick up new workflows.');
  return lines;
}

// cross-spawn resolves npm's shim on Windows, where spawning "npm" directly
// fails. Loaded lazily so ordinary runs skip its module graph.
let cachedSpawn: typeof import('child_process').spawn | undefined;
function loadSpawn(): typeof import('child_process').spawn {
  if (cachedSpawn === undefined) {
    cachedSpawn = require('cross-spawn') as typeof import('child_process').spawn;
  }
  return cachedSpawn;
}

/**
 * Whether we can run the upgrade for the user instead of only printing it.
 *
 * Only an npm-owned global install qualifies, because `npm install -g` is the
 * only command we run: a pnpm/bun/yarn/volta global would get a second copy
 * that may not be the one on PATH, a project dependency belongs to that
 * project's package manager, an npx/dlx cache has nothing to upgrade, and a
 * source checkout is not an install at all.
 */
export function canSelfUpgrade(installDir: string | null, projectPath: string): boolean {
  if (!installDir) return false;
  if (isEphemeralRunnerInstall(installDir)) return false;
  // Both anchors matter: `openspec update ../other` from a project that owns
  // the CLI as a dependency is still a project-local install.
  if (isProjectLocalInstall(installDir, projectPath)) return false;
  if (isProjectLocalInstall(installDir)) return false;
  if (isSourceCheckout(installDir)) return false;
  return isNpmGlobalInstall(installDir);
}

/**
 * Whether to offer the upgrade rather than just print the command. Kept here,
 * as a pure function of the environment, because the interesting mistakes live
 * in this decision: offering where `npm install -g` cannot help, or asking a
 * question no one can answer.
 */
export function shouldOfferUpgrade(params: {
  installDir: string | null;
  projectPath: string;
  interactive: boolean;
  stdoutIsTty: boolean;
}): boolean {
  // A prompt written to a redirected stdout is a question the user never sees
  // and the command waits on forever.
  if (!params.interactive || !params.stdoutIsTty) return false;
  return canSelfUpgrade(params.installDir, params.projectPath);
}

/**
 * Runs `npm install -g <pkg>@latest`, inheriting stdio so npm's own output —
 * including any auth or permission prompt — reaches the user directly.
 * Resolves true only on a clean exit.
 */
async function runGlobalUpgrade(): Promise<boolean> {
  const spawn = loadSpawn();

  return new Promise((resolve) => {
    const child = spawn('npm', ['install', '-g', `${PACKAGE_NAME}@latest`], {
      stdio: 'inherit',
    });
    child.on('error', () => resolve(false));
    child.on('close', (code) => resolve(code === 0));
  });
}

/**
 * The `openspec` npm installs alongside its global package, so the upgrade can
 * be handed to the copy npm just wrote rather than to whatever PATH resolves.
 * Null when it cannot be found, in which case PATH is the only option left.
 */
export function upgradedBinPath(
  roots: string[] = npmGlobalRoots(),
  installDir: string | null = getInstallDir()
): string | null {
  // The copy npm just replaced tells us exactly which prefix it wrote to;
  // a root derived from the node binary can point at an unrelated install.
  const ownPrefix = npmPrefixFromInstallDir(installDir);
  const ordered = ownPrefix
    ? [
        process.platform === 'win32'
          ? path.join(ownPrefix, 'node_modules')
          : path.join(ownPrefix, 'lib', 'node_modules'),
        ...roots,
      ]
    : roots;

  for (const root of ordered) {
    // npm writes the shim beside the global root on Windows
    // (%APPDATA%\\npm\\openspec.cmd) and in <prefix>/bin on POSIX.
    const candidates =
      process.platform === 'win32'
        ? [path.join(path.dirname(root), 'openspec.cmd')]
        : [path.resolve(root, '..', '..', 'bin', 'openspec')];

    for (const candidate of candidates) {
      try {
        if (fs.existsSync(candidate)) return candidate;
      } catch {
        // Unreadable candidate; try the next one.
      }
    }
  }
  return null;
}

/**
 * Asks a CLI binary its version. Used to confirm an upgrade actually landed:
 * `npm install -g` exits 0 even when it installed nothing, so its exit code
 * alone cannot justify telling the user they are on a new version.
 */
export function readCliVersion(binPath: string): Promise<string | null> {
  const spawn = loadSpawn();

  return new Promise((resolve) => {
    let output = '';
    let child;
    try {
      child = spawn(binPath, ['--version'], { stdio: ['ignore', 'pipe', 'ignore'] });
    } catch {
      resolve(null);
      return;
    }

    // Never let a probe hold the CLI open: a wrapper that traps SIGTERM would
    // otherwise keep the process alive for as long as it runs.
    child.unref();
    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      resolve(null);
    }, VERSION_PROBE_TIMEOUT_MS);

    child.stdout?.on('data', (chunk: Buffer) => {
      output += chunk.toString();
    });
    child.on('error', () => {
      clearTimeout(timer);
      resolve(null);
    });
    child.on('close', () => {
      clearTimeout(timer);
      // A line that is only a version, not the first version-shaped token
      // anywhere: a wrapper banner ("Node.js v25.8.1 | OpenSpec") would
      // otherwise be read as the answer.
      const version = output
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => SAFE_VERSION.test(line.replace(/^v/, '')))
        .pop();
      resolve(version ? version.replace(/^v/, '') : null);
    });
  });
}

export type UpgradeOutcome = 'upgraded' | 'declined' | 'failed' | 'cancelled' | 'not-on-path';

function isPromptCancellation(error: unknown): boolean {
  const name = (error as { name?: string } | undefined)?.name;
  return name === 'ExitPromptError' || name === 'AbortPromptError';
}

/**
 * Offers to run the upgrade and reports what actually happened. The version is
 * read back from the installed binary rather than assumed, so "upgraded" is a
 * fact and a PATH that still answers with the old copy is caught here instead
 * of silently doing nothing.
 */
export async function offerCliUpgrade(latestVersion: string): Promise<UpgradeOutcome> {
  const { confirm } = await import('@inquirer/prompts');

  let accepted = false;
  try {
    accepted = await confirm({
      message: `Upgrade to v${latestVersion} now?`,
      default: true,
    });
  } catch (error) {
    // Ctrl-C means stop, not "no thanks, carry on with everything else".
    return isPromptCancellation(error) ? 'cancelled' : 'declined';
  }
  if (!accepted) return 'declined';

  console.log();
  const installed = await runGlobalUpgrade();
  console.log();

  if (!installed) {
    console.log(chalk.yellow('The upgrade did not complete. A global install may need'));
    console.log(chalk.yellow('elevated permissions, or a different package manager.'));
    return 'failed';
  }

  const binPath = upgradedBinPath();
  const version = await readCliVersion(binPath ?? 'openspec');

  if (!version) {
    console.log(chalk.yellow('Upgrade finished, but no "openspec" could be run to confirm it.'));
    return 'not-on-path';
  }
  if (compareVersions(version, OPENSPEC_VERSION) <= 0) {
    console.log(chalk.yellow(`Upgrade finished, but "openspec" still reports v${version}.`));
    console.log(
      chalk.dim(
        binPath
          ? // We asked the installed copy directly, so PATH is not the story.
            `  npm reported success, but ${binPath} did not change.`
          : '  Another install earlier on your PATH is answering first.'
      )
    );
    return 'not-on-path';
  }

  console.log(chalk.green(`✓ Upgraded to v${version}.`));
  return 'upgraded';
}

/**
 * Runs `openspec update` again with the CLI that was just installed — this
 * process is still the old code, so it cannot write the new workflows itself.
 * Resolves the exit code to pass along; when no `openspec` is on PATH the
 * upgrade still landed but nothing was regenerated, so it says so and
 * resolves 0 rather than reporting a failure the upgrade did not have.
 */
export async function rerunUpdateWithUpgradedCli(
  projectPath: string,
  options: { force?: boolean; binPath?: string } = {}
): Promise<number> {
  const spawn = loadSpawn();
  const binPath = options.binPath ?? upgradedBinPath() ?? 'openspec';
  // The re-run stands in for the command the user typed, so it has to carry
  // the flags they typed with it.
  const args = ['update'];
  if (options.force) args.push('--force');
  // `--` so a path that looks like a flag stays a path.
  args.push('--', projectPath);

  return new Promise((resolve) => {
    const child = spawn(binPath, args, {
      stdio: 'inherit',
      env: {
        ...process.env,
        // The child must not offer the upgrade again: if PATH still resolves
        // to the old binary, prompting would loop forever.
        OPENSPEC_NO_UPDATE_CHECK: '1',
        // This is a continuation of the command the user already ran, and the
        // parent recorded it; counting it twice would overstate usage.
        OPENSPEC_TELEMETRY: '0',
      },
    });
    child.on('error', () => {
      // Nothing to hand off to: the upgrade landed but the instruction files
      // are still the old ones, so this run did not do what was asked.
      console.log(chalk.yellow('Instruction files were not regenerated.'));
      console.log(chalk.dim('  Run "openspec update" to pick up the new workflows.'));
      resolve(1);
    });
    // A child killed by a signal reports no code; that is not success.
    child.on('close', (code) => resolve(code ?? 1));
  });
}

/**
 * Prints the upgrade hint. Instruction files are generated by the installed
 * CLI, so "up to date" only ever means "matches this CLI" — without this note
 * a stale install looks like a successful update.
 */
export function displayCliUpdateNote(
  latestVersion: string,
  projectPath: string = '.',
  options: { withCommand?: boolean } = {}
): void {
  const [headline, ...rest] = buildCliUpdateLines(
    latestVersion,
    getInstallDir(),
    projectPath,
    options
  );

  console.log();
  console.log(chalk.yellow(headline));
  for (const line of rest) {
    console.log(chalk.dim(line));
  }
}

/**
 * Prints just the manual command, for when the offer was declined or failed.
 */
export function displayUpgradeCommand(projectPath: string = '.'): void {
  for (const line of buildUpgradeCommandLines(getInstallDir(), projectPath)) {
    console.log(chalk.dim(line));
  }
}
