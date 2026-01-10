## 1. Implementation

- [x] 1.1 Create `src/utils/git-stats.ts` module for Git statistics
  - [x] 1.1.1 Implement `getGitDiffStats()` function using `git diff --numstat`
  - [x] 1.1.2 Add error handling for non-Git directories
  - [x] 1.1.3 Return `{ added: number, removed: number }` or `null`

- [x] 1.2 Create `src/utils/spaceline-formatter.ts` for output formatting
  - [x] 1.2.1 Implement `generateProgressBar(percentage: number): string`
  - [x] 1.2.2 Implement `formatSpaceline(change: ChangeData, stats: SpacelineStats): string[]`
  - [x] 1.2.3 Add emoji constants for all UI elements

- [x] 1.3 Update `src/core/list.ts`
  - [x] 1.3.1 Add `spaceline` option to `execute()` method signature
  - [x] 1.3.2 Implement `executeSpaceline()` method for spaceline output
  - [x] 1.3.3 Integrate Git stats collection

- [x] 1.4 Update `src/cli/index.ts`
  - [x] 1.4.1 Add `--spaceline` option to list command
  - [x] 1.4.2 Add mutual exclusion check with `--json`
  - [x] 1.4.3 Pass spaceline flag to ListCommand

## 2. Testing

- [x] 2.1 Create `test/utils/git-stats.test.ts`
  - [x] 2.1.1 Test successful Git stats parsing
  - [x] 2.1.2 Test non-Git directory handling
  - [x] 2.1.3 Test error scenarios

- [x] 2.2 Create `test/utils/spaceline-formatter.test.ts`
  - [x] 2.2.1 Test progress bar generation at various percentages
  - [x] 2.2.2 Test full spaceline format output
  - [x] 2.2.3 Test minimal data fallbacks

- [x] 2.3 Update `test/core/list.test.ts`
  - [x] 2.3.1 Existing tests still pass
  - [x] 2.3.2 No breaking changes to existing functionality

- [x] 2.4 Manual testing with `pnpm link`
  - [x] 2.4.1 Verified spaceline output in real project
  - [x] 2.4.2 Tested with Git repository

## 3. Documentation

- [x] 3.1 Update `openspec/specs/cli-list/spec.md` (done via delta)
- [x] 3.2 Update help text in `src/cli/index.ts` (added --spaceline option description)
- [ ] 3.3 Add example output to README if needed (deferred - can be added later)
