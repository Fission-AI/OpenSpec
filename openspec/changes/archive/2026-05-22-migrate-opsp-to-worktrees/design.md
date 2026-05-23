## Context

The `opsp:apply` workflow drives initiatives and their opsx changes through a strictly sequential cycle in a single working tree. Switching to worktrees is the prerequisite for ever running multiple agents concurrently. This change is bounded: it only swaps the mechanism (branch → worktree), not the cycle structure.

## Decisions

### Decision 1: Path scheme — sibling, flat, hyphen-flattened

Worktrees live as siblings of the main checkout. Branch slashes are flattened to hyphens for filesystem compatibility.

- Initiative: `../<repo>-opsp-<init>`
- Change: `../<repo>-opsx-<init>-<change>`

**Alternatives considered:**

- Nested under `.worktrees/` inside the main checkout. Rejected: git warns about worktrees inside the main tree, and tools that walk the repo (linters, formatters, test runners) can mistake them for real source.
- Slashed paths matching branch names. Rejected: Windows does not allow `/` in filesystem paths.

**Why this works:** Sibling directories are git's documented convention. The `<repo>` prefix prevents collisions when an operator runs initiatives across multiple repos checked out under the same parent directory. Flat hyphen-separated paths stay well under Windows' default 260-character limit for typical kebab-case names.

### Decision 2: Prune change worktrees immediately on merge

When an opsx change is merged into the initiative branch, the change worktree is removed in the same step. The change branch ref is preserved (for `git log` / diff inspection); only the working tree is destroyed.

**Alternatives considered:**

- Keep change worktrees until initiative archive. Rejected: review benefits are marginal (branch and diff remain inspectable from any worktree), and a long initiative would accumulate idle worktrees on disk.
- Operator decides at each checkpoint. Rejected: adds a question the operator does not need to think about.

**Why this works:** The change is sealed once merged. Our correction philosophy is that corrective work creates a *new* opsx change with a new worktree — we never reopen merged work to edit it. Pruning the worktree at merge enforces this at the filesystem layer.

### Decision 3: Operator's main checkout is never modified

Today's workflow runs `git checkout -b opsp/<init>` in whatever directory the agent was invoked from — typically the operator's working checkout — swapping the operator's working tree onto the initiative branch as a side effect.

With worktrees, the agent moves *itself* into the initiative worktree at Phase 1 instead. The operator's main checkout stays on whatever branch they had.

**Why this works:** It removes the implicit shared state between operator and agent. It also matches what an additional concurrent agent would need to do later: be told to work in a specific worktree.

### Decision 4: cwd discipline is explicit and verified

The workflow instructions gain a "you are here" model. Every transition between worktrees requires:

1. `cd <target-path>`
2. `pwd` (verify location)
3. `git branch --show-current` (verify expected branch)

This matches the existing pattern of verifying branch after a checkout. Without this, the agent's tool calls (Read, Edit, Bash) operate on the wrong worktree silently.

## Risks / Trade-offs

- **Disk usage.** Each worktree is a full checkout. For repos with large vendored assets, multiple concurrent worktrees multiply disk usage. Mitigation: changes are pruned on merge; in the sequential flow only the initiative + one active change exist at a time.
- **Per-worktree install state.** `node_modules`, `.env`, build caches are not shared. Each new change worktree may trigger a fresh `pnpm install`. Mitigation: out of scope here; pnpm's content-addressable store already hardlinks across worktrees by default, so practical disk impact is small for this project's primary toolchain. Operators on other toolchains adopt their own conventions.
- **Orphaned worktrees on crash.** If the agent crashes between `worktree add` and `worktree remove`, orphans remain. Mitigation: `opsp:archive` performs a sweep with `git worktree prune`, and the workflow doc notes this for the operator.
- **IDE / tooling assumptions.** Some tools assume one working tree (Docker bind mounts to a specific path, IDE workspaces with hardcoded paths). Operators discover this per-tool. Documented as a known caveat.

## Migration

In-flight initiatives at the time of this change land in a hybrid state: their branches were created via `git checkout -b`. On resume:

- If `opsp/<init>` exists as a branch with no worktree, the agent creates a worktree pointing at it (`git worktree add <path> opsp/<init>`, without `-b`).
- If the operator's main checkout currently *is* on `opsp/<init>`, the agent asks them to switch back to their preferred branch first, then creates the worktree.
- Existing change branches that were already merged are not re-materialized; they remain as refs only.

No history is rewritten. Existing branches are preserved.
