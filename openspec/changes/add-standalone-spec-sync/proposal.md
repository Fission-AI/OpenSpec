# Let a change's specs be folded before it is archived

## Why

`archive` does two separable jobs in one command. It folds a change's deltas into
`openspec/specs/`, and it declares the change finished by moving its directory.
Welding them means the fold can only happen at the moment the move happens, which
on a team that reviews before merging is after the pull request closes.

So a team that wants CI to assert "the specs describe what shipped" has nothing to
assert during review. The only property expressible today is "nothing is left
unarchived", and that is violated by design for the entire life of every open PR:
the change sits in `changes/`, unarchived, precisely because it is not finished.
A gate that is red as its resting state is one everyone learns to ignore, and it
masks the real failures underneath (#1683).

The fix is to make the check conditional on the change's own claim — not "is
everything archived?" but "does anything claiming to be shipped still have deltas
missing from the specs?" A proposed change passes for free, so green is the
resting state and red means a real mistake.

## What Changes

- **`openspec sync [change]`** folds delta specs into the main specs without
  archiving. The merge engine already supports this: re-applying a folded delta
  is a no-op it names the "early-sync pattern", so `archive` afterwards behaves
  exactly as it always did.
- **`openspec sync --check`** asserts `shipped ⇒ folded` over the working tree and
  exits 1 with the offending changes named. A pure function of files on disk, so
  a pre-commit hook, a pre-push hook and CI run one command and agree.
- **`status: proposed | shipped`** becomes an optional field in a change's
  `.openspec.yaml`. Absent means `proposed`, which is what a change under
  `changes/` has always meant. Nothing writes it: not `new change`, not `archive`.
- **`openspec sync <change> --ship`** sets the field and folds in one working-tree
  diff, so no intermediate commit claims a change is shipped while the specs say
  otherwise.
- **`openspec list --status <state>`** filters by the field, and renders a
  lifecycle column only when some change in the root declares one.

Two deliberate limits, both to keep this additive rather than a second lifecycle:

- **Sync never deletes a spec.** Retiring a capability is the one irreversible
  operation in the system; it stays with `archive`, behind the
  `retire_capabilities` marker and its rollback-safe deletion. Sync reports the
  case and names archive.
- **Sync never examines archived changes.** Their deltas are history and later
  changes supersede them; re-applying a months-old delta over everything that
  came after is a merge conflict, not a drift check. The checked set is the
  active changes declaring `shipped`, which drains itself as they archive.

"Folded" is decided by running the merge builder and seeing that it applied zero
operations — the same predicate `archive` uses to decide it has nothing to write.
Not a byte-comparison of the rebuilt output: the rebuild normalizes blank lines,
so a hand-formatted main spec would compare unequal while being perfectly in
sync. Sharing archive's own predicate is also what stops the checker and the doer
from drifting apart (#1112).

## Impact

- Affected specs: `cli-sync` (ADDED), `cli-list` (MODIFIED: filtering)
- Affected code: `src/core/sync.ts` (new), `src/core/list.ts`,
  `src/utils/change-metadata.ts`, `src/core/change-metadata/schema.ts`,
  `src/cli/index.ts`, `src/core/completions/command-registry.ts`,
  `src/core/archive.ts` (two helpers exported, no behavior change)
- Affected docs: `docs/cli.md`, `docs/team-workflow.md`,
  `docs-lab/reference/cli.md`

Credit: the diagnosis and the `shipped ⇒ folded` framing are from Matan Bendix
Shenhav's proposal in #1683.
