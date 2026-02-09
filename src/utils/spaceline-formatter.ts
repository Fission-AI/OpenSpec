import type { GitStatsResult } from './git-stats.js';

/**
 * Emoji constants for spaceline formatting.
 */
export const EMOJI = {
  /** Change/document icon */
  CHANGE: '📝',
  /** Progress bar filled character */
  PROGRESS_FULL: '█',
  /** Progress bar empty character */
  PROGRESS_EMPTY: '░',
  /** Implementation status */
  STATUS_IMPLEMENTATION: '󰷫',
  /** Delta count icon */
  DELTA: '✎',
  /** Open items icon */
  OPEN: '📋',
  /** Git branch icon */
  BRANCH: '󰘬',
} as const;

/**
 * Change data for spaceline formatting.
 */
export interface ChangeData {
  /** Change ID (directory name) */
  id: string;
  /** Change title */
  title: string;
  /** Number of completed tasks */
  completedTasks: number;
  /** Total number of tasks */
  totalTasks: number;
  /** Number of spec deltas */
  deltaCount: number;
}

/**
 * Statistics for spaceline display.
 */
export interface SpacelineStats {
  /** Git statistics (may be null) */
  git: GitStatsResult;
  /** Number of open items (TODOs, PRs, etc.) */
  openItems: number;
}

/**
 * Map change ID prefix to category name.
 */
function getCategoryFromId(changeId: string): string {
  const prefix = changeId.split('-')[0];

  const categoryMap: Record<string, string> = {
    'add': 'Implementation',
    'update': 'Refactor',
    'remove': 'Deprecation',
    'fix': 'Bugfix',
    'refactor': 'Refactor',
    'improve': 'Enhancement',
  };

  return categoryMap[prefix] || 'Implementation';
}

/**
 * Generate a visual progress bar.
 *
 * @param percentage - Completion percentage (0-100)
 * @param width - Total width of the progress bar (default: 10)
 * @returns Progress bar string using █ and ░ characters
 *
 * @example
 * ```ts
 * generateProgressBar(75);   // "███████░░░"
 * generateProgressBar(100);  // "██████████"
 * generateProgressBar(0);    // "░░░░░░░░░░"
 * ```
 */
export function generateProgressBar(percentage: number, width: number = 10): string {
  const clamped = Math.max(0, Math.min(100, percentage));
  const filled = Math.round((clamped / 100) * width);
  const empty = width - filled;

  return EMOJI.PROGRESS_FULL.repeat(filled) + EMOJI.PROGRESS_EMPTY.repeat(empty);
}

/**
 * Format a change as a spaceline (multi-line compact format).
 *
 * Output format:
 * ```
 * 📝 {id} | {progress-bar} {percentage}%
 * {status} {category} ({tasks}) | {delta-icon} {count} | {open} {branch} ({git-stats})
 * ```
 *
 * @param change - Change data to format
 * @param stats - Statistics for display
 * @returns Array of formatted lines
 *
 * @example
 * ```ts
 * const lines = formatSpaceline(
 *   { id: 'add-feature', title: 'Add feature', completedTasks: 4, totalTasks: 7, deltaCount: 2 },
 *   { git: { added: 5, removed: 2, branch: 'main' }, openItems: 5 }
 * );
 * // Returns:
 * // [
 * //   "📝 add-feature | 󱃖 ██████░░░ 57.1%",
 * //   "󰷫  Implementation (4/7) | ✎ 2 | 📋 5 open | 󰘬 main (↑5 ↓2)"
 * // ]
 * ```
 */
export function formatSpaceline(change: ChangeData, stats: SpacelineStats): string[] {
  // Calculate percentage
  const percentage = change.totalTasks > 0
    ? Math.round((change.completedTasks / change.totalTasks) * 100)
    : 0;

  // Line 1: Icon, ID, progress bar, percentage
  const progressBar = generateProgressBar(percentage);
  const line1 = `${EMOJI.CHANGE} ${change.id} | ${EMOJI.STATUS_IMPLEMENTATION} ${progressBar} ${percentage}%`;

  // Line 2: Status, category, tasks, delta count, open items, git stats
  const category = getCategoryFromId(change.id);
  const tasks = `(${change.completedTasks}/${change.totalTasks})`;
  const deltas = `${EMOJI.DELTA} ${change.deltaCount}`;
  const open = `${EMOJI.OPEN} ${stats.openItems} open`;

  let gitStats = '';
  if (stats.git) {
    const branch = stats.git.branch;
    // Always show both values, even if zero
    const added = `↑${stats.git.added}`;
    const removed = `↓${stats.git.removed}`;
    const statsStr = `${added} ${removed}`;
    gitStats = `| ${EMOJI.BRANCH} ${branch} (${statsStr})`;
  } else {
    gitStats = '| (?)';
  }

  const line2 = `${EMOJI.STATUS_IMPLEMENTATION}  ${category} ${tasks} | ${deltas} | ${open} ${gitStats}`;

  return [line1, line2];
}
