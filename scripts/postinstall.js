#!/usr/bin/env node

/**
 * Postinstall script that hints about shell completions and CLI path visibility
 *
 * Completion installation is opt-in: the user must run
 * `openspec completion install` explicitly. This script only
 * prints lightweight tips after npm install.
 *
 * The tips are suppressed when:
 * - CI=true environment variable is set
 * - OPENSPEC_NO_COMPLETIONS=1 environment variable is set
 * - dist/ directory doesn't exist (dev setup scenario)
 *
 * The script never fails npm install - all errors are caught and handled gracefully.
 */

import { constants as fsConstants, promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const EXECUTABLE_NAMES = process.platform === 'win32'
  ? ['openspec.cmd', 'openspec.ps1', 'openspec']
  : ['openspec'];

function getEnv(name) {
  return process.env[name] || process.env[name.toUpperCase()];
}

function isTruthy(value) {
  return value ? ['1', 'true', 'yes'].includes(value.toLowerCase()) : false;
}

function isLikelyGlobalInstall() {
  return isTruthy(getEnv('npm_config_global')) || getEnv('npm_config_location') === 'global';
}

function normalizeForComparison(value) {
  const resolved = path.resolve(value);
  return process.platform === 'win32' ? resolved.toLowerCase() : resolved;
}

function pathEntries() {
  return (process.env.PATH || '')
    .split(path.delimiter)
    .filter(Boolean)
    .map(normalizeForComparison);
}

function isOnPath(dir) {
  const normalizedDir = normalizeForComparison(dir);
  return pathEntries().includes(normalizedDir);
}

function addCandidateDir(dirs, dir) {
  if (!dir) return;
  dirs.set(normalizeForComparison(dir), dir);
}

function getPrefixBinDir(prefix) {
  return process.platform === 'win32' ? prefix : path.join(prefix, 'bin');
}

function getCandidateCliBinDirs() {
  const dirs = new Map();

  addCandidateDir(dirs, getEnv('npm_config_global_bin_dir'));
  addCandidateDir(dirs, getEnv('npm_config_bin'));
  addCandidateDir(dirs, getEnv('PNPM_HOME'));

  const npmPrefix = getEnv('npm_config_prefix');
  if (npmPrefix) {
    addCandidateDir(dirs, getPrefixBinDir(npmPrefix));
  }

  const bunInstall = getEnv('BUN_INSTALL');
  if (bunInstall) {
    addCandidateDir(dirs, path.join(bunInstall, 'bin'));
  }

  return [...dirs.values()];
}

async function directoryHasOpenSpecBin(dir) {
  for (const executableName of EXECUTABLE_NAMES) {
    try {
      await fs.access(path.join(dir, executableName), fsConstants.X_OK);
      return true;
    } catch {
      // Continue checking other executable names.
    }
  }

  return false;
}

async function getCliBinDirsMissingFromPath() {
  if (!isLikelyGlobalInstall()) {
    return [];
  }

  const missingDirs = [];
  for (const dir of getCandidateCliBinDirs()) {
    if (isOnPath(dir)) continue;
    if (await directoryHasOpenSpecBin(dir)) {
      missingDirs.push(dir);
    }
  }

  return missingDirs;
}

function printPathVisibilityHint(missingDirs) {
  if (missingDirs.length === 0) return;

  console.log('');
  console.log(
    'OpenSpec was installed, but this shell may not find the CLI because these bin directories are not on PATH:'
  );
  for (const dir of missingDirs) {
    console.log(`  ${dir}`);
  }
  console.log('');
  console.log(
    'If `openspec --version` fails in an editor, agent, GUI app, or automation, add the relevant package-manager bin directory to the PATH used by that environment.'
  );
  console.log(
    'See: https://github.com/Fission-AI/OpenSpec/blob/main/docs/installation.md#troubleshooting-path-visibility'
  );
}

/**
 * Check if we should skip installation
 */
function shouldSkipInstallation() {
  // Skip in CI environments
  if (process.env.CI === 'true' || process.env.CI === '1') {
    return { skip: true, reason: 'CI environment detected' };
  }

  // Skip if user opted out
  if (process.env.OPENSPEC_NO_COMPLETIONS === '1') {
    return { skip: true, reason: 'OPENSPEC_NO_COMPLETIONS=1 set' };
  }

  return { skip: false };
}

/**
 * Check if dist/ directory exists
 */
async function distExists() {
  const distPath = path.join(__dirname, '..', 'dist');
  try {
    const stat = await fs.stat(distPath);
    return stat.isDirectory();
  } catch {
    return false;
  }
}

/**
 * Main function
 */
async function main() {
  try {
    // Check if we should skip
    const skipCheck = shouldSkipInstallation();
    if (skipCheck.skip) {
      // Silent skip - no output
      return;
    }

    // Check if dist/ exists (skip silently if not - expected during dev setup)
    if (!(await distExists())) {
      return;
    }

    // Completions are opt-in — just print a hint
    console.log(`\nTip: Run 'openspec completion install' for shell completions`);

    const missingDirs = await getCliBinDirsMissingFromPath();
    printPathVisibilityHint(missingDirs);
  } catch (error) {
    // Fail gracefully - never break npm install
  }
}

// Run main and handle any unhandled errors
main().catch(() => {
  // Silent failure - never break npm install
  process.exit(0);
});
