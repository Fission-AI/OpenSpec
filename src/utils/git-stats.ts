import { execSync } from 'child_process';
import path from 'path';

/**
 * Git statistics for file changes.
 */
export interface GitStats {
  /** Number of files with net additions */
  added: number;
  /** Number of files with net removals */
  removed: number;
  /** Current branch name */
  branch: string;
}

/**
 * Result type for Git stats operations.
 */
export type GitStatsResult = GitStats | null;

/**
 * Default Git stats when not in a Git repository.
 */
const DEFAULT_GIT_STATS: GitStats = {
  added: 0,
  removed: 0,
  branch: '(no branch)',
};

/**
 * Get the current Git branch name.
 *
 * @returns Branch name or '(no branch)' if not in a Git repo
 */
function getCurrentBranch(): string {
  try {
    return execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf-8' }).trim();
  } catch {
    return '(no branch)';
  }
}

/**
 * Get the default branch to diff against.
 * Tries 'main', then 'origin/main', then 'HEAD~1'.
 *
 * @returns The branch/ref to diff against
 */
function getDiffBase(): string {
  const branches = ['main', 'origin/main', 'HEAD~1'];
  for (const branch of branches) {
    try {
      execSync(`git rev-parse --verify ${branch}`, { encoding: 'utf-8', stdio: 'pipe' });
      return branch;
    } catch {
      // Continue to next option
    }
  }
  return 'HEAD~1';
}

/**
 * Get Git diff statistics for the current repository.
 *
 * Uses `git diff --numstat` to count file additions and removals.
 * Files with net additions (additions > deletions) count as "added".
 * Files with net removals (deletions > additions) count as "removed".
 *
 * @returns GitStats with added/removed counts, or null if Git is unavailable
 *
 * @example
 * ```ts
 * const stats = await getGitDiffStats();
 * if (stats) {
 *   console.log(`${stats.added}↑ ${stats.removed}↓`);
 * }
 * ```
 */
export function getGitDiffStats(): GitStatsResult {
  try {
    const branch = getCurrentBranch();
    if (branch === '(no branch)') {
      return { ...DEFAULT_GIT_STATS, branch };
    }

    const base = getDiffBase();
    const output = execSync(`git diff --numstat ${base}`, { encoding: 'utf-8' });

    let added = 0;
    let removed = 0;

    const lines = output.trim().split('\n');
    for (const line of lines) {
      if (!line) continue;

      // Format: "additions\tdeletions\tfilename"
      const parts = line.split('\t');
      if (parts.length < 2) continue;

      const additions = parseInt(parts[0], 10) || 0;
      const deletions = parseInt(parts[1], 10) || 0;

      if (additions > deletions) {
        added++;
      } else if (deletions > additions) {
        removed++;
      }
    }

    return { added, removed, branch };
  } catch {
    // Not in a Git repo or Git not available
    return null;
  }
}

/**
 * Get Git diff statistics for a specific path (e.g., a change directory).
 *
 * @param filePath - Path to the file or directory to get stats for
 * @returns GitStats with added/removed counts, or null if Git is unavailable
 */
export function getGitDiffStatsForPath(filePath: string): GitStatsResult {
  try {
    const branch = getCurrentBranch();
    if (branch === '(no branch)') {
      return { ...DEFAULT_GIT_STATS, branch };
    }

    const base = getDiffBase();
    const relativePath = path.relative(process.cwd(), filePath);
    const output = execSync(`git diff --numstat ${base} -- ${relativePath}`, { encoding: 'utf-8' });

    let added = 0;
    let removed = 0;

    const lines = output.trim().split('\n');
    for (const line of lines) {
      if (!line) continue;

      const parts = line.split('\t');
      if (parts.length < 2) continue;

      const additions = parseInt(parts[0], 10) || 0;
      const deletions = parseInt(parts[1], 10) || 0;

      if (additions > deletions) {
        added++;
      } else if (deletions > additions) {
        removed++;
      }
    }

    return { added, removed, branch };
  } catch {
    return null;
  }
}
