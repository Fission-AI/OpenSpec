import { execSync, execFileSync } from 'child_process';
import { createRequire } from 'module';
import os from 'os';
import { FEEDBACK_MESSAGES } from '../messages/index.js';

const require = createRequire(import.meta.url);

/**
 * Check if gh CLI is installed and available in PATH
 * Uses platform-appropriate command: 'where' on Windows, 'which' on Unix/macOS
 */
function isGhInstalled(): boolean {
  try {
    const command = process.platform === 'win32' ? 'where gh' : 'which gh';
    execSync(command, { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if gh CLI is authenticated
 */
function isGhAuthenticated(): boolean {
  try {
    execSync('gh auth status', { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

/**
 * Get BR-OpenSpec version from package.json
 */
function getVersion(): string {
  try {
    const { version } = require('../../package.json');
    return version;
  } catch {
    return 'unknown';
  }
}

/**
 * Get platform name
 */
function getPlatform(): string {
  return os.platform();
}

/**
 * Get current timestamp in ISO format
 */
function getTimestamp(): string {
  return new Date().toISOString();
}

/**
 * Generate metadata footer for feedback
 */
function generateMetadata(): string {
  const version = getVersion();
  const platform = getPlatform();
  const timestamp = getTimestamp();

  return `---
${FEEDBACK_MESSAGES.submittedVia}
${FEEDBACK_MESSAGES.versionLabel(version)}
${FEEDBACK_MESSAGES.platformLabel(platform)}
${FEEDBACK_MESSAGES.timestampLabel(timestamp)}`;
}

/**
 * Format the feedback title
 */
function formatTitle(message: string): string {
  return FEEDBACK_MESSAGES.feedbackTitle(message);
}

/**
 * Format the full feedback body
 */
function formatBody(bodyText?: string): string {
  const parts: string[] = [];

  if (bodyText) {
    parts.push(bodyText);
    parts.push(''); // Empty line before metadata
  }

  parts.push(generateMetadata());

  return parts.join('\n');
}

/**
 * Generate a pre-filled GitHub issue URL for manual submission
 */
function generateManualSubmissionUrl(title: string, body: string): string {
  const repo = 'fkmatsuda/BR-OpenSpec';
  const encodedTitle = encodeURIComponent(title);
  const encodedBody = encodeURIComponent(body);
  const encodedLabels = encodeURIComponent('feedback');

  return `https://github.com/${repo}/issues/new?title=${encodedTitle}&body=${encodedBody}&labels=${encodedLabels}`;
}

/**
 * Display formatted feedback content for manual submission
 */
function displayFormattedFeedback(title: string, body: string): void {
  console.log(FEEDBACK_MESSAGES.formattedFeedbackHeader);
  console.log(FEEDBACK_MESSAGES.titleLabel(title));
  console.log(FEEDBACK_MESSAGES.labelsFeedback);
  console.log(FEEDBACK_MESSAGES.bodyLabel);
  console.log(body);
  console.log(FEEDBACK_MESSAGES.endFeedback);
}

/**
 * Submit feedback via gh CLI
 * Uses execFileSync to prevent shell injection vulnerabilities
 */
function submitViaGhCli(title: string, body: string): void {
  try {
    const result = execFileSync(
      'gh',
      [
        'issue',
        'create',
        '--repo',
        'fkmatsuda/BR-OpenSpec',
        '--title',
        title,
        '--body',
        body,
        '--label',
        'feedback',
      ],
      { encoding: 'utf-8', stdio: 'pipe' }
    );

    const issueUrl = result.trim();
    console.log(FEEDBACK_MESSAGES.feedbackSubmitted);
    console.log(FEEDBACK_MESSAGES.issueUrl(issueUrl));
  } catch (error: any) {
    // Display the error output from gh CLI
    if (error.stderr) {
      console.error(error.stderr.toString());
    } else if (error.message) {
      console.error(error.message);
    }

    // Exit with the same code as gh CLI
    process.exit(error.status ?? 1);
  }
}

/**
 * Handle fallback when gh CLI is not available or not authenticated
 */
function handleFallback(title: string, body: string, reason: 'missing' | 'unauthenticated'): void {
  if (reason === 'missing') {
    console.log(FEEDBACK_MESSAGES.githubCliNotFound);
  } else {
    console.log(FEEDBACK_MESSAGES.githubAuthRequired);
  }

  displayFormattedFeedback(title, body);

  const manualUrl = generateManualSubmissionUrl(title, body);
  console.log(FEEDBACK_MESSAGES.submitManually);
  console.log(manualUrl);

  if (reason === 'unauthenticated') {
    console.log(FEEDBACK_MESSAGES.autoSubmitHint);
  }

  // Exit with success code (fallback is successful)
  process.exit(0);
}

/**
 * Feedback command implementation
 */
export class FeedbackCommand {
  async execute(message: string, options?: { body?: string }): Promise<void> {
    // Format title and body once for all code paths
    const title = formatTitle(message);
    const body = formatBody(options?.body);

    // Check if gh CLI is installed
    if (!isGhInstalled()) {
      handleFallback(title, body, 'missing');
      return;
    }

    // Check if gh CLI is authenticated
    if (!isGhAuthenticated()) {
      handleFallback(title, body, 'unauthenticated');
      return;
    }

    // Submit via gh CLI
    submitViaGhCli(title, body);
  }
}
