## Context

`archive` conflates a state transition with a text merge. The merge itself is fine; welding it to a directory move is what makes it hard to schedule. On a solo repo the two are indistinguishable. On a team with review, every possible moment to run `archive` is wrong somewhere:

| Moment | Why it breaks |
|---|---|
| During the PR | Review feedback invalidates the fold; un-archive does not exist and re-archive is not a no-op |
| After merge | A bot commit to a protected branch, racing concurrent merges |
| At approval | GitLab has no approval event (`CI_MERGE_REQUEST_APPROVED` is pre-pipeline), and pushes reset approvals |

## Goals / Non-Goals

**Goals**

- Make lifecycle state a first-class fact that merges trivially and can be edited to correct a mistake.
- Make the fold a standalone, idempotent operation that is safe to run late, twice, or never-yet.
- Make "is this repo consistent?" a pure function of the working tree, so one predicate gates pre-commit, pre-push and CI.
- Change nothing for projects that do not opt in.

**Non-Goals**

- Concurrent modification of the same requirement by two open changes (see #1669 and the parallel-merge plan).
- Replacing the archive workflow. This is an experiment with an exit; if it does not graduate, it is removed.
- Capability maturity tags. Those describe requirements, not changes.

## Decisions

### The state set is closed, and every state has machine consequences

`status: proposed | shipped`. Two states, because a state with no attached consequence is a comment:

- `shipped` means "these deltas belong in `specs/`" — what `sync` folds and what `--check` gates.
- `proposed` means "this change holds a live claim on the requirements it touches" — what overlap and drift tooling can reason over without inferring liveness from a directory path.

An `applied` state was prototyped and dropped: "implementation done" is already recorded by `tasks.md` checkboxes, and a duplicate record drifts. Further states are possible later — `abandoned` would release the live claim — but each must earn its place with a consequence.

### "Folded" is decided by regeneration, not bookkeeping

A change is in sync when re-applying its delta to the current spec produces byte-identical output. No lockfile, no hash sidecar, no timestamp comparison — the check rebuilds and compares.

This costs O(shipped history) per run rather than O(active changes), which is negligible for young histories and is the reason a `--changed` scope is named as future work rather than shipped here. In exchange the gate has no state of its own to corrupt, and — importantly — `--check` and the fold share one code path. A checker that reimplements the doer is how #1112 happened: `validate` passed what `archive` then refused. Here the only difference between checking and doing is whether the rebuilt bytes get written.

### The gate is a tree predicate, not a timing condition

`shipped ⇒ folded`. This is what makes the mode enforceable rather than merely conventional. A timing condition ("archive ran at the right moment") cannot be evaluated mid-PR, precisely when the invariant is supposed to be violated. A tree predicate can be evaluated on any tree by anyone:

```sh
openspec sync --check   # pre-commit · pre-push · CI — same command, same verdict
```

Hooks are advisory (`--no-verify` skips them), so CI remains the authority for the tree-level property. The one property that inverts this is atomicity: whether declaring and folding happened in the *same commit* is a history-level fact that CI, which sees only the head tree, is structurally blind to. `ship` makes the atomic path the default one, and a pre-push sweep over the pushed range can enforce it where a team cares.

### `archive` refuses rather than coexists

Under `lifecycle: status`, `openspec archive` throws and names the alternative. Two models that can both claim a change is finished would let `specs/` disagree with itself. The refusal is what keeps `specs/` = shipped reality true in both modes, which is also what makes migration between them a pure relayout: neither mode's `specs/` content differs.

### Layout shards by creation date, which is immutable

If nothing ever moves, `changes/` accumulates. The layout shards by a date **assigned at birth**: `changes/2026/03/15-add-oauth/`. Creation date is chosen precisely because it can never change — sharding by *shipped* date would smuggle the move back in, which is the thing this design removes. The day prefix keeps the full date in the path and `ls` chronological, carrying the same information today's `archive/YYYY-MM-DD-<name>/` carries, relocated from the contested end of the lifecycle to the fixed one.

Discovery reads both layouts by rule: `YYYY` and `MM` directories are shards to walk into, anything else is a change. That keeps flat projects working untouched and makes the layout a storage detail rather than a new contract.

This is the decision most likely to be superseded. [#1367](https://github.com/Fission-AI/OpenSpec/pull/1367) proposes user-chosen *domains* under `changes/`, discovered by a leaf marker (`.openspec.yaml`/`proposal.md` present) rather than a naming convention. That is a better mechanism, and domains carry meaning a calendar cannot. If it lands, this sharding should be dropped in favor of it, and discovery here should be replaced by that walk — the mode above does not depend on which one wins, only on nothing moving. Noted here rather than resolved because it is upstream's call, not ours.

### Migration is bidirectional, because an experiment must be leaveable

`openspec migrate` converts in both directions, and neither direction touches spec text: archive-mode `specs/` is folded shipped reality, which is exactly what status-mode maintains. Reversal is therefore a pure relayout, covered by a round-trip test.

The reverse direction refuses while any shipped change has unfolded deltas, because the archive layout asserts a fold that must actually exist. It reuses the gate itself rather than reimplementing its verdict — the same anti-drift reasoning as `--check` sharing the fold's code path.

Two hazards the forward direction has to handle, both consequences of bare change ids: a legacy name reused across archive eras would shard into two directories no bare id can address (refused up front, with the collisions named), and an interrupted run leaves shards that a naive re-run would try to move into themselves (skipped, so the migration resumes).

## Risks / Trade-offs

- **`ls` stops being the answer to "what's active."** Once state is data, the filesystem is no longer the UI for state; `openspec list --status proposed` is. This is the honest cost of the whole design and is why the mode is opt-in.
- **The fold diff relocates, it does not disappear.** It lands wherever `sync` ran instead of in the archive commit. Deterministic output makes it reviewable the way a lockfile is: regenerate and compare.
- **Editing a delta after it was folded** re-merges over an earlier fold, which needs base snapshots to do correctly. This window pre-exists; making fold-anytime first-class means it sees more traffic. `sync --check` detects the state and fails closed rather than corrupting `specs/`. `sync` is a natural recording point for the parallel-merge plan's base snapshots when those arrive.

## Migration

`openspec migrate` converts a legacy project: archived changes become `status: shipped` sharded by the date their archive folder recorded, in-flight changes become `status: proposed` sharded by their `created` date, the now-empty `archive/` directory is removed, and the config line is written last so an interrupted run is resumable. Nothing is deleted, and `sync --check` verifies the result by regeneration — the engine's own folds re-apply byte-identically, so the gate is green immediately after migrating.

`openspec migrate --to archive` converts back: shipped changes return to `changes/archive/<created>-<name>/`, proposed changes return to flat `changes/<name>/`, the `status` key is stripped (under archive mode, location is the state), and empty shard directories are pruned. One caveat worth stating: a change shipped under status mode carries its *creation* date into an archive folder name where convention reads an *archival* date. That is the only information the round trip cannot preserve, because archive mode never recorded the other one.
