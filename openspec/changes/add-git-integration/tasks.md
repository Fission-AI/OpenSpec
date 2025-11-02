# Implementation Tasks

## 1. Git Utility Module
- [ ] 1.1 Create `src/utils/git.ts` with GitUtils class
- [ ] 1.2 Implement `isGitRepo()` check
- [ ] 1.3 Implement `getDefaultBranch()` with fallback chain (remote → config → 'main')
- [ ] 1.4 Implement `getCurrentBranch()`, `branchExists()`
- [ ] 1.5 Implement `checkoutNewBranch()`, `checkout()`
- [ ] 1.6 Implement `hasUncommittedChanges()`, `getModifiedFiles()`
- [ ] 1.7 Implement `add()`, `commit()`, `deleteBranch()`
- [ ] 1.8 Add GitError class for proper error handling
- [ ] 1.9 Use promisify for async exec operations

## 2. Git Integration Helper
- [ ] 2.1 Create `src/utils/git-integration.ts`
- [ ] 2.2 Implement `initGitIntegration()` - checks if Git is available
- [ ] 2.3 Implement `handleBranchConflict()` - interactive prompts for conflicts
- [ ] 2.4 Implement `createSpecBranch()` - for proposal phase
- [ ] 2.5 Implement `createFeatureBranch()` - for implementation phase
- [ ] 2.6 Implement `commitArchive()` - for archive phase
- [ ] 2.7 Add proper error recovery and fallback to no-git mode

## 3. Command Enhancements
- [ ] 3.1 Update proposal command (`src/core/init.ts` or separate proposal command)
- [ ] 3.2 Add Git integration to proposal creation workflow
- [ ] 3.3 Update apply command with Git integration
- [ ] 3.4 Update archive command (`src/core/archive.ts`) with Git integration
- [ ] 3.5 Add `--no-git` flag to all three commands
- [ ] 3.6 Add helpful next steps messages after each operation
- [ ] 3.7 Update CLI command definitions in `src/cli/index.ts`

## 4. Template Updates
- [ ] 4.1 Update `src/core/templates/agents-template.ts` with Git workflow section
- [ ] 4.2 Update `src/core/templates/project-template.ts` with Git config
- [ ] 4.3 Add Git integration section to generated AGENTS.md
- [ ] 4.4 Include branch naming conventions and workflow examples

## 5. Documentation
- [ ] 5.1 Update README.md with Git integration examples
- [ ] 5.2 Add complete workflow example (spec branch → feature branch → archive)
- [ ] 5.3 Document `--no-git` flag usage
- [ ] 5.4 Add Git hook examples (optional pre-push automation)
- [ ] 5.5 Document branch conflict resolution options
- [ ] 5.6 Add troubleshooting section for Git errors

## 6. Testing
- [ ] 6.1 Test Git repository detection (isGitRepo)
- [ ] 6.2 Test default branch detection (main, master, custom)
- [ ] 6.3 Test branch creation and checkout
- [ ] 6.4 Test branch conflict handling prompts
- [ ] 6.5 Test `--no-git` flag behavior across all commands
- [ ] 6.6 Test non-Git repository graceful degradation
- [ ] 6.7 Test uncommitted changes detection before archive
- [ ] 6.8 Test wrong branch warning during archive
- [ ] 6.9 Test complete end-to-end workflow
- [ ] 6.10 Test Git command failures and error recovery

## 7. Error Handling & Edge Cases
- [ ] 7.1 Handle Git command not found (git not installed)
- [ ] 7.2 Handle Git operation failures gracefully
- [ ] 7.3 Provide clear error messages with recovery steps
- [ ] 7.4 Offer to continue without Git on failures
- [ ] 7.5 Handle branch name conflicts with interactive prompts
- [ ] 7.6 Validate branch naming conventions
- [ ] 7.7 Handle detached HEAD state
- [ ] 7.8 Handle merge conflicts during branch creation
