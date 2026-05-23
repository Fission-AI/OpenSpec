## Why

The `opsp:apply` workflow materializes initiative and change branches inside a single working tree via `git checkout -b`. Every transition between branches mutates the operator's checkout: switching to the initiative branch swaps their files, creating a change branch swaps them again, merging swaps them back. While the agent is running, the operator cannot use the same checkout without interruption or contention.

This is the single largest obstacle to running multiple agents concurrently in the future. Two agents in one working tree clobber each other; the operator and the agent in one working tree fight over the filesystem.

Switching to git worktrees gives every initiative and change its own physical directory:

- The operator's main checkout is never touched by the agent
- Each branch lives in an isolated working tree, ready to be picked up by an additional agent later
- Build caches (`node_modules`, `dist/`) per worktree, no thrash from branch swaps

This change is the **building block** for concurrent execution. It does not introduce any concurrency primitives (no orchestrator, no escalation queue, no surrogate-version protocol). The workflow stays strictly sequential. Only the mechanics under it change: `git checkout -b` becomes `git worktree add`, and the agent learns to `cd` between worktrees.

## What Changes

### 1. Initiative worktree replaces initiative branch checkout

Phase 1 of `opsp:apply` no longer runs `git checkout -b opsp/<init>` in the operator's checkout. It runs `git worktree add ../<repo>-opsp-<init> -b opsp/<init>` and `cd`s into the new directory. The operator's main checkout is left on whatever branch they had.

### 2. Change worktree replaces change branch checkout

Phase 2c no longer runs `git checkout -b opsx/<init>/<change>` inside the initiative checkout. It runs `git worktree add ../<repo>-opsx-<init>-<change> -b opsx/<init>/<change> opsp/<init>` from anywhere and `cd`s in. Implementation, tests, and edits all happen in the change worktree.

### 3. Merge happens in the initiative worktree, then the change worktree is pruned

Phase 2d steps:

1. `cd` to the initiative worktree
2. `git merge opsx/<init>/<change>`
3. `git worktree remove ../<repo>-opsx-<init>-<change>` immediately on success

Pruning aligns with our correction philosophy: a merged worktree is sealed. If something needs correction, the operator raises a change request, which produces a new opsx change with its own fresh worktree — we do not reopen merged work to edit it.

### 4. Path scheme — sibling, flat, hyphen-flattened

Worktrees live as siblings of the main checkout. Branch names use forward slashes (`opsx/<init>/<change>`); filesystem paths flatten to hyphens because Windows cannot have `/` in paths. Convention:

- Initiative worktree: `../<repo>-opsp-<init>`
- Change worktree: `../<repo>-opsx-<init>-<change>`

Where `<repo>` is the basename of the main checkout's directory.

### 5. cwd discipline

The workflow gains an explicit "you are here" model. Every phase transition that crosses a worktree boundary requires `cd <path>` followed by `pwd` and `git branch --show-current` verification, matching the existing verification style. Implementation, tests, and merges only happen in the worktree they belong to.

### 6. Review skill picks up worktree visibility

`opsp:review` adds a `git worktree list` invocation so reviewers see physical paths alongside branches. Read-only branch operations (`git log --graph`, `git branch --merged`) are unchanged.

### 7. Archive cleanup pass

`opsp:archive` removes the initiative worktree and runs `git worktree prune` for any stragglers after the initiative is resolved.

## Out of Scope

- **Concurrent execution.** No orchestrator, no parallel workers, no escalation queue. Sequential one-agent-at-a-time stays the rule. This change makes concurrency *possible later*; it does not implement it.
- **Worktree-aware merging.** Conflict handling is unchanged — pause and ask the operator.
- **Surrogate concurrency semantics.** Single agent means single surrogate reader. No version stamps needed.
- **`node_modules` / build cache sharing across worktrees.** Each worktree is independent. Operators with heavy install times can adopt their own conventions later — out of scope here.
- **Capability folder rename.** The capability stays as `opsp-git-branching`; worktrees still use branches and the name remains accurate. A cosmetic rename can happen later as its own change.

## Impact

- Affected specs: `opsp-git-branching` (4 requirements modified, 2 new requirements added)
- Affected workflow templates: `opsp-apply.ts`, `opsp-review.ts`, `opsp-archive.ts`
- No CLI surface changes
- No global config changes
- Downstream projects regenerate their skill files on next `opensprint init`/`update`
