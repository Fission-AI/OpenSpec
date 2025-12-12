#!/usr/bin/env node

/**
 * Postinstall script for auto-installing shell completions
 *
 * This script runs automatically after npm install unless:
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
 * Detect the user's shell
 */
async function detectShell() {
  try {
    const { detectShell } = await import('../dist/utils/shell-detection.js');
    const result = detectShell();
    return result.shell;
  } catch (error) {
    // Fail silently if detection module doesn't exist
    return undefined;
  }
}

/**
 * Install completions for the detected shell
 */
async function installCompletions(shell) {
  try {
    const { CompletionFactory } = await import('../dist/core/completions/factory.js');
    const { COMMAND_REGISTRY } = await import('../dist/core/completions/command-registry.js');

    // Check if shell is supported
    if (!CompletionFactory.isSupported(shell)) {
      console.log(`\nTip: Run 'openspec completion install' for shell completions`);
      return;
    }

    // Generate completion script
    const generator = CompletionFactory.createGenerator(shell);
    const script = generator.generate(COMMAND_REGISTRY);

    // Install completion script
    const installer = CompletionFactory.createInstaller(shell);
    const result = await installer.install(script);

    if (result.success) {
      // Show success message based on installation type
      if (result.isOhMyZsh) {
        console.log(`✓ Shell completions installed`);
        console.log(`  Restart shell: exec zsh`);
      } else if (result.zshrcConfigured) {
        console.log(`✓ Shell completions installed and configured`);
        console.log(`  Restart shell: exec zsh`);
      } else {
        console.log(`✓ Shell completions installed to ~/.zsh/completions/`);
        console.log(`  Add to ~/.zshrc: fpath=(~/.zsh/completions $fpath)`);
        console.log(`  Then: exec zsh`);
      }
    } else {
      // Installation failed, show tip for manual install
      console.log(`\nTip: Run 'openspec completion install' for shell completions`);
    }
  } catch (error) {
    // Fail gracefully - show tip for manual install
    console.log(`\nTip: Run 'openspec completion install' for shell completions`);
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

    // Detect shell
    const shell = await detectShell();
    if (!shell) {
      console.log(`\nTip: Run 'openspec completion install' for shell completions`);
      return;
    }

    // Install completions
    await installCompletions(shell);
  } catch (error) {
    // Fail gracefully - never break npm install
    // Show tip for manual install
    console.log(`\nTip: Run 'openspec completion install' for shell completions`);
  }
}

// Run main and handle any unhandled errors
main().catch(() => {
  // Silent failure - never break npm install
  process.exit(0);
});
