import path from 'path';
import { createRequire } from 'module';
import chalk from 'chalk';

const require = createRequire(import.meta.url);
const { name: PACKAGE_NAME, version: OPENSPEC_VERSION } = require('../../package.json');

const DEFAULT_REGISTRY = 'https://registry.npmjs.org';
const REQUEST_TIMEOUT_MS = 1500;

/**
 * Values a CI provider may set. GitHub Actions uses "true", others use "1".
 */
const CI_ENABLED_VALUES = new Set(['true', '1']);

/**
 * A version we are willing to print. The registry only ever serves SemVer here,
 * so anything else is either a broken mirror or a hostile response — and since
 * this string lands in the terminal next to an install command, an unvalidated
 * one could smuggle ANSI cursor controls and repaint the lines around it.
 */
const SAFE_VERSION = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/;

/**
 * The check is opt-out and must never get in the way: no network in CI or
 * tests, an explicit escape hatch for anyone offline or air-gapped, and the
 * same privacy signals telemetry already honors — a user who set DO_NOT_TRACK
 * did not agree to a different outbound request.
 */
function isCheckEnabled(): boolean {
  if (process.env.OPENSPEC_NO_UPDATE_CHECK !== undefined) return false;
  if (process.env.DO_NOT_TRACK === '1') return false;
  if (process.env.OPENSPEC_TELEMETRY === '0') return false;
  if (CI_ENABLED_VALUES.has((process.env.CI ?? '').toLowerCase())) return false;
  if (process.env.NODE_ENV === 'test') return false;
  return true;
}

/**
 * Ask the registry the user's package manager is configured against, so people
 * on a private mirror get an answer their `npm install` can actually deliver.
 */
function registryUrl(): string {
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
 */
async function fetchLatestVersion(): Promise<string | null> {
  try {
    const response = await fetch(registryUrl(), {
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    if (!response.ok) return null;
    const body = (await response.json()) as { version?: unknown };
    if (typeof body.version !== 'string' || !SAFE_VERSION.test(body.version)) return null;
    return body.version;
  } catch {
    return null;
  }
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
  const segments = installDir.split(/[\\/]/);
  return segments.some((segment) => segment === '_npx' || segment === 'dlx' || segment === '_bunx');
}

/**
 * Builds the hint, with the upgrade command chosen for how this copy of the CLI
 * was installed. Pure so every branch is assertable.
 */
export function buildCliUpdateLines(
  latestVersion: string,
  installDir: string | null,
  projectPath: string
): string[] {
  const lines = [`A newer OpenSpec CLI is available (v${OPENSPEC_VERSION} → v${latestVersion}).`];

  if (isEphemeralRunnerInstall(installDir)) {
    lines.push(`  npx ${PACKAGE_NAME}@latest update`);
  } else if (isProjectLocalInstall(installDir, projectPath)) {
    lines.push(`  npm install ${PACKAGE_NAME}@latest`);
    lines.push('  (OpenSpec is a dependency of this project, not a global install.)');
  } else {
    lines.push(`  npm install -g ${PACKAGE_NAME}@latest`);
  }

  lines.push('  Then run "openspec update" again to pick up new workflows.');
  if (installDir) {
    lines.push(`  Running from: ${installDir}`);
  }

  return lines;
}

/**
 * Prints the upgrade hint. Instruction files are generated by the installed
 * CLI, so "up to date" only ever means "matches this CLI" — without this note
 * a stale install looks like a successful update.
 */
export function displayCliUpdateNote(latestVersion: string, projectPath: string = '.'): void {
  const [headline, ...rest] = buildCliUpdateLines(latestVersion, getInstallDir(), projectPath);

  console.log();
  console.log(chalk.yellow(headline));
  for (const line of rest) {
    console.log(chalk.dim(line));
  }
}
