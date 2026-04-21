import { execFileSync } from 'child_process';

/**
 * Check if the given directory is inside a git repository.
 * Uses `git rev-parse --git-dir` which exits nonzero when not in a git repo.
 */
export function isGitRepository(cwd: string): boolean {
  try {
    execFileSync('git', ['rev-parse', '--git-dir'], { cwd, stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

/**
 * Create a new git branch and check it out.
 * Throws if the branch already exists or git is not available.
 */
export function createAndCheckoutBranch(cwd: string, branchName: string): void {
  execFileSync('git', ['checkout', '-b', branchName], { cwd, stdio: 'pipe' });
}

/**
 * Derive the git branch name for a given change name.
 * Always returns `openspec/<changeName>`.
 */
export function getBranchNameForChange(changeName: string): string {
  return `openspec/${changeName}`;
}
