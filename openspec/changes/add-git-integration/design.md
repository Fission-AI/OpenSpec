# Git Integration Design

## Context

OpenSpec currently manages spec-driven development through file system operations, but doesn't integrate with Git workflows. Users manually create branches, commit changes, and manage Git state. This design adds automated Git integration while maintaining backward compatibility and user control.

**Constraints:**
- Must work in non-Git repositories (graceful degradation)
- Must not break existing workflows
- Must handle Git command failures elegantly
- Must support different Git providers (GitHub, GitLab, Bitbucket)
- Must respect user preferences (opt-out with `--no-git`)

**Stakeholders:**
- OpenSpec users following spec-driven development
- Teams using various Git branching strategies
- AI assistants automating OpenSpec workflows

## Goals / Non-Goals

**Goals:**
- Automate branch creation for spec and implementation phases
- Reduce cognitive load for Git operations
- Enforce separation between spec review and implementation
- Support standard Git workflows (GitHub Flow, Git Flow compatible)
- Provide clear guidance at each workflow stage

**Non-Goals:**
- Replace user's Git knowledge or tool choices
- Handle PR creation (left to user's Git provider CLI: gh, glab, etc.)
- Support all Git edge cases (rebase, squash, advanced operations)
- Implement custom Git authentication or credentials management
- Replace existing Git workflows (only augment OpenSpec workflow)

## Decisions

### Decision 1: Two-Phase Branching Strategy

**What:** Use separate branches for spec review (`spec/<change-id>`) and implementation (`feature/<change-id>`)

**Why:**
- Aligns with spec-driven development philosophy (specs reviewed before code)
- Clear separation of concerns in Git history
- Allows teams to review and approve specs independently
- Supports parallel work (multiple specs can be reviewed simultaneously)

**Alternatives considered:**
- Single branch for both phases: Mixes spec and code changes, harder to review separately
- No branching: Current state, doesn't follow Git best practices
- Manual branching only: Adds cognitive overhead, inconsistent across users

### Decision 2: Auto-Detect Default Branch

**What:** Detect default branch from Git config (main, master, custom) with fallback chain

**Why:**
- Supports both legacy (master) and modern (main) conventions
- Handles custom default branches (develop, trunk, etc.)
- Reduces configuration burden on users

**Detection strategy:**
1. Try `git symbolic-ref refs/remotes/origin/HEAD` (remote default)
2. Try `git config init.defaultBranch` (local config)
3. Fallback to "main" (modern convention)

**Alternatives considered:**
- Hardcode "main": Breaks for legacy repos using master
- Always prompt user: Too much friction for every operation
- Config file setting: Extra configuration step, less automatic

### Decision 3: Archive Timing - Before Merge

**What:** Archive happens on feature branch after implementation approval, before merge to main

**Why:**
- Keeps Git history clean (single PR with code + archive + updated specs)
- Archive becomes part of implementation review
- Ensures specs are updated atomically with code merge
- Follows spec-driven principle: specs reflect implemented reality

**Flow:**
```
feature/add-2fa:
  ├─ Implementation commits
  ├─ Archive commit (openspec archive)
  └─ Merge to main → complete feature
```

**Alternatives considered:**
- Archive after merge: Requires second PR, messy history
- Archive before implementation starts: Specs not yet validated by code
- Separate archive branch: Unnecessary complexity

### Decision 4: Graceful Degradation

**What:** Continue without Git if not available or commands fail

**Why:**
- Non-Git workflows still work (e.g., copying OpenSpec into existing project)
- Network issues or Git failures don't block OpenSpec operations
- Users can opt-out with `--no-git` flag when needed
- Maintains backward compatibility

**Fallback behavior:**
- Not a Git repo: Inform user, continue without Git
- Git command fails: Show error, ask to continue without Git
- User provides `--no-git`: Skip all Git operations silently

### Decision 5: User Control for PR Creation

**What:** Leave PR creation to user's choice of tooling

**Why:**
- Supports multiple Git providers (GitHub, GitLab, Bitbucket, etc.)
- Users have different PR workflows (templates, labels, reviewers)
- Avoids coupling OpenSpec to specific Git provider APIs
- Keeps OpenSpec CLI lightweight and provider-agnostic

**Guidance provided:**
- Suggest next steps after operations (push, create PR)
- Document examples for common tools (gh, glab)
- But don't execute PR creation commands

## Technical Architecture

### Git Utility Layer (`src/utils/git.ts`)

**Purpose:** Low-level Git operations wrapper

**Key Functions:**
- `isGitRepo()` - Check if in Git repository
- `getDefaultBranch()` - Detect default branch with fallback
- `getCurrentBranch()` - Get active branch name
- `branchExists()` - Check branch existence
- `checkoutNewBranch()` - Create and switch to branch
- `checkout()` - Switch to existing branch
- `hasUncommittedChanges()` - Check working directory state
- `add()` - Stage files
- `commit()` - Create commit
- `deleteBranch()` - Remove branch

**Error Handling:**
- Throws `GitError` with descriptive messages
- Captures Git command output for debugging
- Distinguishes between Git unavailable vs. operation failed

### Git Integration Layer (`src/utils/git-integration.ts`)

**Purpose:** High-level workflow integration with user interaction

**Key Functions:**
- `initGitIntegration()` - Check availability and initialize
- `handleBranchConflict()` - Interactive conflict resolution
- `createSpecBranch()` - Proposal phase branch creation
- `createFeatureBranch()` - Implementation phase branch creation
- `commitArchive()` - Archive phase commit

**User Interaction:**
- Prompts for branch conflicts (continue, rename, recreate, no-git)
- Warnings for wrong branch or uncommitted changes
- Confirmation dialogs for potentially destructive operations

### Command Integration Points

**Proposal Command:**
```typescript
async createProposal(changeId: string, options: { noGit?: boolean }) {
  // 1. Validate change ID unique
  // 2. Create spec branch if Git enabled
  // 3. Scaffold proposal files
  // 4. Commit proposal if Git enabled
  // 5. Show next steps (validate, push, PR)
}
```

**Apply Command:**
```typescript
async applyChange(changeId: string, options: { noGit?: boolean }) {
  // 1. Validate change exists
  // 2. Warn if not on default branch
  // 3. Create feature branch if Git enabled
  // 4. Display tasks for implementation
  // 5. Show next steps (implement, commit, push, PR, archive)
}
```

**Archive Command:**
```typescript
async archiveChange(changeId: string, options: { yes?: boolean, noGit?: boolean }) {
  // 1. Validate on correct branch
  // 2. Check for uncommitted changes
  // 3. Perform archive operation
  // 4. Commit archive if Git enabled
  // 5. Show next steps (push, merge PR)
}
```

## Risks / Trade-offs

### Risk: Git Command Availability
**Mitigation:** Graceful degradation, `--no-git` flag, clear error messages

### Risk: Complex Git States (Rebase, Conflicts)
**Mitigation:** Only handle simple operations, defer complex scenarios to user

### Risk: Breaking Existing Workflows
**Mitigation:** Opt-in behavior (only in Git repos), non-breaking changes, `--no-git` escape hatch

### Risk: Cross-Platform Git Differences
**Mitigation:** Use portable Git commands, test on Windows/Mac/Linux

### Trade-off: Automatic vs. Manual Control
**Decision:** Automatic by default, manual override available
**Reasoning:** Reduces friction for common case, flexibility for edge cases

### Trade-off: Single PR vs. Separate PRs
**Decision:** Encourage two PRs (spec review, then implementation)
**Reasoning:** Better for spec-driven methodology, optional for teams

## Migration Plan

### For New Projects
- `openspec init` prompts for Git integration preference
- Default: enabled if Git repository detected
- Templates include Git workflow documentation

### For Existing Projects
- `openspec update` adds Git integration docs to AGENTS.md
- Existing changes work without Git integration
- Users can opt-in gradually by using new workflow
- No breaking changes to existing change folders

### Rollout Strategy
1. **Phase 1:** Release with `--no-git` as default (opt-in testing)
2. **Phase 2:** Enable by default after community feedback
3. **Phase 3:** Document best practices and Git hook examples

## Open Questions

1. **Q:** Should we support custom branch prefixes (e.g., `proposal/`, `impl/`)?
   **A:** No initially. Keep simple with `spec/` and `feature/`. Add config later if requested.

2. **Q:** How to handle mono-repos with multiple OpenSpec directories?
   **A:** Out of scope. Assume single OpenSpec per repo root.

3. **Q:** Should we validate branch naming conventions?
   **A:** Yes. Ensure change-id is kebab-case, warn about special characters.

4. **Q:** What about Git hooks for automation?
   **A:** Document examples (pre-push auto-archive), but don't install automatically.

5. **Q:** Support for commit signing (GPG)?
   **A:** Inherit from user's Git config. Don't override signing settings.
