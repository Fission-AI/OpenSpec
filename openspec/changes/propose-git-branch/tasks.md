## 1. Core Git Branch Utility

- [x] 1.1 Create `src/utils/git-utils.ts` with `isGitRepository(cwd: string): boolean` function using `execFileSync('git', ['rev-parse', '--git-dir'], { cwd, stdio: 'pipe' })`
- [x] 1.2 Add `createAndCheckoutBranch(cwd: string, branchName: string): void` function to `src/utils/git-utils.ts` that runs `git checkout -b <branchName>` via `execFileSync`
- [x] 1.3 Add `getBranchNameForChange(changeName: string): string` helper that returns `openspec/<changeName>`
- [x] 1.4 Export all new functions from `src/utils/git-utils.ts`

## 2. New Change Command Integration

- [x] 2.1 Add `branch?: boolean` to `NewChangeOptions` interface in `src/commands/workflow/new-change.ts`
- [x] 2.2 After successful change creation, check `options.branch` and if truthy call git utility functions
- [x] 2.3 Show spinner step for git branch creation (e.g., "Creating branch 'openspec/my-feature'...")
- [x] 2.4 On git failure (not a git repo, branch exists, git not found), show warning via `ora().warn()` and exit with code 1

## 3. CLI Flag Registration

- [x] 3.1 Add `.option('--branch', 'Create and checkout a git branch named openspec/<change-name>')` to the `new change` command in `src/cli/index.ts`
- [x] 3.2 Pass `branch` option through to `newChangeCommand` call

## 4. Tests

- [x] 4.1 Create `test/core/commands/new-change-git-branch.test.ts` with unit tests for `isGitRepository`, `createAndCheckoutBranch`, and `getBranchNameForChange` using mocked `execFileSync`
- [x] 4.2 Test: `isGitRepository` returns true when git command succeeds
- [x] 4.3 Test: `isGitRepository` returns false when git command throws (not a git repo or git not found)
- [x] 4.4 Test: `getBranchNameForChange('my-feature')` returns `'openspec/my-feature'`
- [x] 4.5 Test: `createAndCheckoutBranch` calls `execFileSync` with correct args `['checkout', '-b', 'openspec/my-feature']`
- [x] 4.6 Test: `newChangeCommand` with `--branch` calls git utilities when change creation succeeds
- [x] 4.7 Test: `newChangeCommand` with `--branch` exits nonzero when not in git repo (but change dir is still created)
- [x] 4.8 Test: `newChangeCommand` without `--branch` never calls git utilities

## 5. Verification

- [x] 5.1 Run `pnpm build` and ensure no TypeScript errors
- [x] 5.2 Run `pnpm test` and ensure all tests pass
- [x] 5.3 Manually test: `openspec new change test-branch-feature --branch` creates the branch and checks it out
- [x] 5.4 Verify with `git branch` that `openspec/test-branch-feature` is the current branch
- [x] 5.5 Clean up test branch: `git checkout main && git branch -D openspec/test-branch-feature`
- [x] 5.6 Delete the test change: `rm -rf openspec/changes/test-branch-feature`
