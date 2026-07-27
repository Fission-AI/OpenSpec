/**
 * Animated welcome screen for the experimental artifact workflow setup.
 * Shows side-by-side layout with animated ASCII art on left and welcome text on right.
 */

import chalk from 'chalk';
import {
  execFileSync,
  type ExecFileSyncOptionsWithStringEncoding,
} from 'node:child_process';
import { WELCOME_ANIMATION } from './ascii-patterns.js';
import { getOnboardingCommands } from '../core/onboarding-commands.js';

// Minimum terminal width for side-by-side layout
const MIN_WIDTH = 60;

// Width of the ASCII art column (with padding)
const ART_COLUMN_WIDTH = 24;

/**
 * Welcome text content (right column)
 */
function getWelcomeText(workflows: readonly string[]): string[] {
  const onboardingCommands = getOnboardingCommands(workflows);
  const quickStart: string[] = [];

  if (onboardingCommands.length > 0) {
    const commandWidth = Math.max(...onboardingCommands.map((c) => c.command.length));
    quickStart.push(chalk.white('Quick start after setup:'));
    for (const { command, description } of onboardingCommands) {
      quickStart.push(`  ${chalk.yellow(command.padEnd(commandWidth + 1))} ${chalk.dim(description)}`);
    }
    quickStart.push('');
  }

  return [
    chalk.white.bold('Welcome to OpenSpec'),
    chalk.dim('A lightweight spec-driven framework'),
    '',
    chalk.white('This setup will configure:'),
    chalk.dim('  • Agent Skills for AI tools'),
    chalk.dim('  • /opsx:* slash commands'),
    '',
    ...quickStart,
    chalk.cyan('Press Enter to select tools...'),
  ];
}

/**
 * Renders a single frame with side-by-side layout
 */
function renderFrame(artLines: string[], textLines: string[]): string {
  const maxLines = Math.max(artLines.length, textLines.length);
  const lines: string[] = [];

  for (let i = 0; i < maxLines; i++) {
    const artLine = artLines[i] || '';
    const textLine = textLines[i] || '';

    // Pad the art column to fixed width
    const paddedArt = artLine.padEnd(ART_COLUMN_WIDTH);

    // Color the ASCII art with cyan for visual appeal
    const coloredArt = chalk.cyan(paddedArt);

    // Clear line before writing to prevent residual characters
    lines.push(`\x1b[2K${coloredArt}${textLine}`);
  }

  return lines.join('\n');
}

const REDUCED_MOTION_EXEC_OPTIONS: ExecFileSyncOptionsWithStringEncoding = {
  encoding: 'utf8',
  timeout: 500,
  // SIGKILL so a wedged lookup can never outlive the timeout and stall init.
  killSignal: 'SIGKILL',
  stdio: ['ignore', 'pipe', 'ignore'],
};

/**
 * Best-effort check of the OS-level reduced-motion preference (#722).
 * Any lookup failure (missing binary, unset key, timeout) means
 * "no preference detected" and animation stays enabled.
 */
export function prefersReducedMotion(
  platform: NodeJS.Platform = process.platform
): boolean {
  try {
    if (platform === 'darwin') {
      // The key only exists once the user has toggled Reduce Motion; when it
      // is unset `defaults` exits non-zero and lands in the catch below.
      const out = execFileSync(
        'defaults',
        ['read', 'com.apple.universalaccess', 'reduceMotion'],
        REDUCED_MOTION_EXEC_OPTIONS
      );
      return out.trim() === '1';
    }
    if (platform === 'linux') {
      const out = execFileSync(
        'gsettings',
        ['get', 'org.gnome.desktop.interface', 'enable-animations'],
        REDUCED_MOTION_EXEC_OPTIONS
      );
      return out.trim() === 'false';
    }
  } catch {
    // Detection is best-effort only.
  }
  return false;
}

/**
 * Checks if the terminal supports animation
 */
function canAnimate(): boolean {
  // Must be TTY
  if (!process.stdout.isTTY) return false;

  // Respect NO_COLOR
  if (process.env.NO_COLOR) return false;

  // Manual override for users who need reduced motion (#722)
  if (process.env.OPENSPEC_NO_ANIMATION) return false;

  // Check terminal width
  const columns = process.stdout.columns || 80;
  if (columns < MIN_WIDTH) return false;

  // Last so only interactive terminals pay for the OS lookup
  if (prefersReducedMotion()) return false;

  return true;
}

/**
 * Wait for Enter key press
 */
async function waitForEnter(): Promise<void> {
  if (!process.stdin.isTTY) {
    return;
  }

  // Keep all interactive input on Inquirer's keypress lifecycle. Mixing a raw
  // `data` listener between Inquirer prompts breaks arrow/space keys on Windows.
  const { createPrompt, isEnterKey, useKeypress } = await import('@inquirer/core');
  const prompt = createPrompt<void, Record<string, never>>((_config, done) => {
    useKeypress((key) => {
      if (key.ctrl && key.name === 'c') {
        process.stdout.write('\n');
        process.exit(0);
      }

      if (isEnterKey(key)) {
        done(undefined);
      }
    });

    return '';
  });

  await prompt({});
}

/**
 * Shows the animated welcome screen.
 * Returns when user presses Enter.
 */
export async function showWelcomeScreen(
  workflows: readonly string[],
  options: { animate?: boolean } = {}
): Promise<void> {
  const textLines = getWelcomeText(workflows);

  if (options.animate === false || !canAnimate()) {
    // Fallback: show static welcome
    const frame = WELCOME_ANIMATION.frames[3]; // Peak frame
    process.stdout.write('\n' + renderFrame(frame, textLines) + '\n\n');
    return;
  }

  let frameIndex = 0;
  let running = true;
  let isFirstRender = true;

  // Content height for cursor movement between frames
  const numContentLines = Math.max(WELCOME_ANIMATION.frames[0].length, textLines.length);
  const frameHeight = numContentLines + 1; // internal newlines (11) + trailing newlines (2) = 13

  // Total height including initial newline (for cleanup)
  const totalHeight = frameHeight + 1; // 14

  // Initial render
  process.stdout.write('\n');

  // Animation loop
  const interval = setInterval(() => {
    if (!running) return;

    const frame = WELCOME_ANIMATION.frames[frameIndex];

    // Move cursor up to overwrite previous frame (always after first render)
    if (!isFirstRender) {
      process.stdout.write(`\x1b[${frameHeight}A`);
    }
    isFirstRender = false;

    // Render current frame
    process.stdout.write(renderFrame(frame, textLines) + '\n\n');

    // Advance to next frame
    frameIndex = (frameIndex + 1) % WELCOME_ANIMATION.frames.length;
  }, WELCOME_ANIMATION.interval);

  // Wait for Enter
  await waitForEnter();

  // Stop animation
  running = false;
  clearInterval(interval);

  // Clear the welcome screen and move on
  process.stdout.write(`\x1b[${totalHeight}A`);
  for (let i = 0; i < totalHeight; i++) {
    process.stdout.write('\x1b[2K\n'); // Clear line
  }
  process.stdout.write(`\x1b[${totalHeight}A`); // Move back up
}
