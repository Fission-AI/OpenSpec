/**
 * Onboarding Helpers
 *
 * Shared output formatting for "getting started" and IDE-restart messages
 * used by both init and update commands.
 */

import chalk from 'chalk';
import type { Profile } from '../global-config.js';
import { getProfileWorkflows } from '../profiles.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface OnboardingContext {
  /** Effective profile ('core' | 'custom'). */
  profile: Profile;
  /** Custom workflows list (only relevant when profile === 'custom'). */
  customWorkflows?: string[];
  /** Whether any tools were created or refreshed in this run. */
  hasConfiguredTools: boolean;
}

// ---------------------------------------------------------------------------
// Getting-started message
// ---------------------------------------------------------------------------

/**
 * Returns the "Getting started" lines appropriate for the active profile.
 *
 * Both init and update previously had divergent implementations:
 * - init showed `/opsx:propose` or `/opsx:new` based on profile
 * - update showed a fixed `/opsx:new`, `/opsx:continue`, `/opsx:apply` set
 *
 * This function unifies the logic: show the primary entry-point command for the
 * active profile, keeping the output concise and consistent.
 */
export function formatGettingStarted(ctx: OnboardingContext): string[] {
  const activeWorkflows = [
    ...getProfileWorkflows(ctx.profile, ctx.customWorkflows),
  ];

  const lines: string[] = [];

  if (activeWorkflows.includes('propose')) {
    lines.push(chalk.bold('Getting started:'));
    lines.push('  Start your first change: /opsx:propose "your idea"');
  } else if (activeWorkflows.includes('new')) {
    lines.push(chalk.bold('Getting started:'));
    lines.push('  Start your first change: /opsx:new "your idea"');
  } else {
    lines.push(
      "Done. Run 'openspec config profile' to configure your workflows.",
    );
  }

  return lines;
}

// ---------------------------------------------------------------------------
// Links
// ---------------------------------------------------------------------------

export function formatLinks(): string[] {
  return [
    `Learn more: ${chalk.cyan('https://github.com/Fission-AI/OpenSpec')}`,
    `Feedback:   ${chalk.cyan('https://github.com/Fission-AI/OpenSpec/issues')}`,
  ];
}

// ---------------------------------------------------------------------------
// IDE-restart hint
// ---------------------------------------------------------------------------

export function formatIdeRestart(): string {
  return chalk.dim('Restart your IDE for changes to take effect.');
}

/**
 * Convenience: print the full onboarding footer (getting-started + links + IDE restart).
 */
export function printOnboardingFooter(ctx: OnboardingContext): void {
  const started = formatGettingStarted(ctx);
  console.log();
  for (const line of started) {
    console.log(line);
  }

  console.log();
  for (const line of formatLinks()) {
    console.log(line);
  }

  if (ctx.hasConfiguredTools) {
    console.log();
    console.log(formatIdeRestart());
  }

  console.log();
}
