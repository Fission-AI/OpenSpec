---
name: opensprint-review
description: Review an initiative — show commit graph, branch status, and assist with branch-level code review.
license: MIT
compatibility: Requires openspec CLI and git.
metadata:
  author: opensprint
  version: "1.0"
  generatedBy: "0.0.6"
---

Review an initiative's branches and commit history to assist with code review.

**Input**: Specify the initiative name after `/opsp:review` (e.g., `/opsp:review migrate-to-serverless`). If omitted, list active initiatives and let the operator choose.

---

## Phase 1: Verify Initiative Exists

1. **Check for initiative branch**:
   ```bash
   git branch --list "opsp/<initiative-name>"
   ```

   If no branch exists, inform the operator:
   > "No branches found for initiative '<initiative-name>'. Run `/opsp:apply <initiative-name>` to start."

2. **Show worktree status**:
   ```bash
   git worktree list
   ```

   This displays which initiative and change worktrees are currently active on disk alongside their physical paths. Branches listed here have active working trees; others exist as refs only (merged and pruned).

   Note: A branch with an active worktree cannot be checked out in another location. This is informational — it does not affect read-only review operations.

3. **Read the initiative descriptor** at `opensprint/initiatives/<initiative-name>.md`
   - Get the milestone list and their completion status
   - Get the opsx change names associated with each milestone

## Phase 2: Show Commit Graph

Display the git commit graph for all initiative-related branches:

```bash
git log --graph --oneline --decorate opsp/<initiative-name> $(git branch --list "opsx/<initiative-name>/*" --format="%(refname:short)")
```

This shows the branching structure: where change branches forked from the initiative branch and where they were merged back.

## Phase 3: Branch Listing with Status

List all branches for this initiative with their merge status:

```bash
# Initiative branch
git log --oneline -1 opsp/<initiative-name>

# Change branches
git branch --list "opsx/<initiative-name>/*"
```

For each change branch, determine if it has been merged into the initiative branch:
```bash
git branch --merged opsp/<initiative-name> --list "opsx/<initiative-name>/*"
```

Display a table:
```
## Initiative: migrate-to-serverless
Branch: opsp/migrate-to-serverless

### Milestone 1: Extract Auth Service ✓
  ✓ opsx/migrate-to-serverless/extract-auth-service (merged)

### Milestone 2: Migrate Payment Endpoints (in progress)
  ✓ opsx/migrate-to-serverless/payment-api (merged)
  → opsx/migrate-to-serverless/payment-webhooks (open)

### Milestone 3: Deprecate Monolith Routes
  (not started)

Initiative branch is 47 commits ahead of main.
```

## Phase 4: Review Assistance

After displaying the overview, ask the operator what they want to review:

**Options:**
1. **Review a specific change** — Show the diff for one change branch
2. **Review a full milestone** — Show combined changes for a milestone
3. **Compare initiative to main** — Show overall diff
4. **Done** — Exit review

### Reviewing a Specific Change

Show what a change branch introduced relative to its merge base on the initiative branch:
```bash
git diff opsp/<initiative-name>...opsx/<initiative-name>/<change-name>
```

Summarize:
- Files changed (count and names)
- Nature of changes (new files, modifications, deletions)
- Key code changes at a high level

### Reviewing a Full Milestone

Identify all change branches for the milestone from the initiative descriptor. Show a combined diff covering all changes in that milestone:
```bash
# Find the commit where this milestone's first change branched off
git diff <milestone-start-commit>...<milestone-end-commit>
```

Summarize the milestone's cumulative changes.

### Comparing Initiative to Main

```bash
git diff main...opsp/<initiative-name>
```

Show a high-level summary of all changes the initiative has introduced.

---

## Guardrails

- **Read-only** — This skill only reads git history and displays information. It does not modify branches, commits, or files.
- **Always show context** — Map branches to milestones and changes using the initiative descriptor, not just raw branch names.
- **Handle pruned worktrees** — Change worktrees are removed after merge; the branch ref is kept. If `git worktree list` does not show a change branch, note it as "(worktree pruned, was merged)" rather than erroring. The branch ref still exists for diff and log operations.
- **Relative to main** — When showing "ahead/behind" counts, compare the initiative branch to main (or the branch it was created from).

