import { execSync, execFileSync } from 'child_process';
import { createRequire } from 'module';
import os from 'os';

const require = createRequire(import.meta.url);
const MAX_TITLE_LENGTH = 72;
const TITLE_PREFIX = 'Feedback: ';

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
 * Get OpenSpec version from package.json
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
Submitted via OpenSpec CLI
- Version: ${version}
- Platform: ${platform}
- Timestamp: ${timestamp}`;
}

/**
 * Format the feedback title
 */
function formatTitle(message: string): string {
  const normalizedMessage = message.replace(/\s+/g, ' ').trim();
  const title = `${TITLE_PREFIX}${normalizedMessage}`;

  if (Array.from(title).length <= MAX_TITLE_LENGTH) {
    return title;
  }

  const availableLength = MAX_TITLE_LENGTH - TITLE_PREFIX.length - 1;
  const candidate = Array.from(normalizedMessage).slice(0, availableLength).join('').trimEnd();
  const lastSpace = candidate.lastIndexOf(' ');
  const summary = lastSpace > 0 ? candidate.slice(0, lastSpace) : candidate;
  return `${TITLE_PREFIX}${summary}…`;
}

/**
 * Format the full feedback body
 */
function formatBody(message: string, bodyText?: string): string {
  const parts = ['## Summary', '', message.trim()];

  if (bodyText) {
    parts.push('', '## Details', '', bodyText.trim());
  }

  parts.push('', generateMetadata());

  return parts.join('\n');
}

/**
 * Generate a pre-filled GitHub issue URL for manual submission
 */
function generateManualSubmissionUrl(title: string, body: string): string {
  const repo = 'Fission-AI/OpenSpec';
  const encodedTitle = encodeURIComponent(title);
  const encodedBody = encodeURIComponent(body);
  const encodedLabels = encodeURIComponent('feedback');

  return `https://github.com/${repo}/issues/new?title=${encodedTitle}&body=${encodedBody}&labels=${encodedLabels}`;
}

/**
 * Display formatted feedback content for manual submission
 */
function displayFormattedFeedback(title: string, body: string): void {
  console.log('\n--- FORMATTED FEEDBACK ---');
  console.log(`Title: ${title}`);
  console.log(`Labels: feedback`);
  console.log('\nBody:');
  console.log(body);
  console.log('--- END FEEDBACK ---\n');
}

/**
 * Check whether gh refused the issue because the repository does not define
 * the label. gh resolves label names before creating the issue, so this
 * failure means no issue was created.
 *
 * Only gh's stderr is inspected. The error message also embeds the command
 * line, which carries the user's own feedback text.
 */
function isMissingLabelError(error: any): boolean {
  return /could not add label/i.test(error?.stderr?.toString() ?? '');
}

/**
 * Report a gh CLI failure and exit, preserving gh's exit code.
 *
 * gh failed after the user already typed their feedback (issues disabled,
 * network, rate limit, ...), so show the same manual-submission path the
 * missing-gh and unauthenticated flows get instead of discarding the text.
 */
function reportGhFailure(error: any, title: string, body: string): void {
  // Display the error output from gh CLI
  if (error.stderr) {
    console.error(error.stderr.toString());
  } else if (error.message) {
    console.error(error.message);
  }

  displayFormattedFeedback(title, body);

  const manualUrl = generateManualSubmissionUrl(title, body);
  console.log('Please submit your feedback manually:');
  console.log(manualUrl);

  // Exit with the same code as gh CLI
  process.exit(error.status ?? 1);
}

/**
 * Create the feedback issue via gh CLI
 * Uses execFileSync to prevent shell injection vulnerabilities
 */
function createIssue(title: string, body: string, labels: string[]): string {
  const args = [
    'issue',
    'create',
    '--repo',
    'Fission-AI/OpenSpec',
    '--title',
    title,
    '--body',
    body,
  ];

  for (const label of labels) {
    args.push('--label', label);
  }

  const result = execFileSync('gh', args, { encoding: 'utf-8', stdio: 'pipe' });

  return result.trim();
}

/**
 * Submit feedback via gh CLI
 */
function submitViaGhCli(title: string, body: string): void {
  let issueUrl: string;
  let labelApplied = true;

  try {
    issueUrl = createIssue(title, body, ['feedback']);
  } catch (error: any) {
    if (!isMissingLabelError(error)) {
      reportGhFailure(error, title, body);
      return;
    }

    // The repository does not define the 'feedback' label. Nothing was
    // created, so retry unlabeled rather than dropping the feedback.
    try {
      issueUrl = createIssue(title, body, []);
      labelApplied = false;
    } catch (retryError: any) {
      reportGhFailure(retryError, title, body);
      return;
    }
  }

  console.log(`\n✓ Feedback submitted successfully!`);
  console.log(`Issue URL: ${issueUrl}\n`);

  if (!labelApplied) {
    console.log(
      "Note: created without the 'feedback' label because the repository does not define it.\n"
    );
  }
}

/**
 * Handle fallback when gh CLI is not available or not authenticated
 */
function handleFallback(title: string, body: string, reason: 'missing' | 'unauthenticated'): void {
  if (reason === 'missing') {
    console.log('⚠️  GitHub CLI not found. Manual submission required.');
  } else {
    console.log('⚠️  GitHub authentication required. Manual submission required.');
  }

  displayFormattedFeedback(title, body);

  const manualUrl = generateManualSubmissionUrl(title, body);
  console.log('Please submit your feedback manually:');
  console.log(manualUrl);

  if (reason === 'unauthenticated') {
    console.log('\nTo auto-submit in the future: gh auth login');
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
    const body = formatBody(message, options?.body);

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
