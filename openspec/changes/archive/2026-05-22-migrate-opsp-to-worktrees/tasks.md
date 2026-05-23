## 1. Spec updates

- [x] 1.1 Rewrite the four existing requirements in `openspec/specs/opsp-git-branching/spec.md` to describe worktree-based operations (initiative worktree creation, change worktree creation, merge + prune on archive, naming/path convention)
- [x] 1.2 Add a requirement for working-directory discipline (explicit cd + pwd + branch verification at every worktree transition)
- [x] 1.3 Add a requirement for orphan worktree recovery (`git worktree prune`, unresolved-orphan reporting)
- [x] 1.4 Validate updated spec parses cleanly via `openspec validate`

## 2. opsp:apply workflow rewrite

- [x] 2.1 Update Phase 1 initiative setup in `src/core/templates/workflows/opsp-apply.ts` to use `git worktree add -b` and `cd` into the initiative worktree
- [x] 2.2 Update Phase 1 resume detection to handle three states: branch + no worktree, branch + existing worktree, neither
- [x] 2.3 Update Phase 2c (change creation) to `git worktree add -b` from the initiative branch ref and `cd` into the change worktree
- [x] 2.4 Update Phase 2d (archive) to `cd` to the initiative worktree, merge, then `git worktree remove` the change worktree on success
- [x] 2.5 Rewrite the "Git Branch Management" section as "Worktree & Branch Management" with the new path convention and cwd model
- [x] 2.6 Add explicit `pwd` and `git branch --show-current` verification after every `cd` transition
- [x] 2.7 Update Phase 4 completion summary to display worktree paths alongside branch names
- [x] 2.8 Update Guardrails: "Worktree per change" replaces "Branch per change"; add "Verify cwd before file operations"
- [x] 2.9 Note in the workflow text that corrections to merged changes always produce a new opsx change with a fresh worktree — never re-attach a worktree to a merged branch

## 3. opsp:review workflow update

- [x] 3.1 Add a `git worktree list` step in Phase 1 of `src/core/templates/workflows/opsp-review.ts` so reviewers see physical paths
- [x] 3.2 Add a note that branches with an active worktree cannot be re-checked-out in the main tree (informational, not an error)
- [x] 3.3 Confirm existing read-only branch operations (`git log --graph`, `git branch --list`, `git branch --merged`) still function unchanged

## 4. opsp:archive worktree sweep

- [x] 4.1 In `src/core/templates/workflows/opsp-archive.ts`, add a worktree cleanup step after initiative resolution: `git worktree remove` for the initiative worktree, `git worktree prune` for stragglers
- [x] 4.2 Document orphan-recovery guidance in the workflow text

## 5. Tests

- [x] 5.1 Update workflow-template snapshot tests under `test/core/templates/` (or equivalent) to match new instruction strings
- [x] 5.2 Update any e2e tests that assert against rendered skill content
- [x] 5.3 Add coverage for the new spec scenarios via the validation suite
- [x] 5.4 Confirm cross-platform path expectations: branch names use `/`, filesystem paths use `-`

## 6. Verification

- [x] 6.1 `pnpm test`
- [x] 6.2 `pnpm exec tsc --noEmit`
- [x] 6.3 `pnpm lint`
- [x] 6.4 `pnpm run dev:cli -- init` in a scratch repo and inspect the regenerated `opsp:apply` skill to confirm the worktree instructions read cleanly end-to-end
