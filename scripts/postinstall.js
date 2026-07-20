#!/usr/bin/env node

/**
 * Postinstall script that hints about shell completions
 *
 * Completion installation is opt-in: the user must run
 * `openspec completion install` explicitly. This script only
 * prints a one-line tip after npm install.
 *
 * The tip is suppressed when:
 * - CI=true environment variable is set
 * - OPENSPEC_NO_COMPLETIONS=1 environment variable is set
 * - dist/ directory doesn't exist (dev setup scenario)
 *
 * The script never fails npm install - all errors are caught and handled gracefully.
 */

import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
  } catch (error) {
    // Fail gracefully - never break npm install
  }
}

// Run main and handle any unhandled errors
main().catch(() => {
  // Silent failure - never break npm install
  process.exit(0);
});
