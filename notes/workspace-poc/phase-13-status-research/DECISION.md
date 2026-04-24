# Phase 13 Decision

Phase cycle: 1
Stage: `implementation`
Date: 2026-04-17 (Australia/Sydney)

## Recommended v0 status model

Phase 14 should implement workspace-aware roll-up instead of reusing raw artifact-graph status for workspace changes.

The minimum honest v0 model is:

- overall workspace-change state: `planned`, `in-progress`, `blocked`, `soft-done`, `hard-done`
- per-target state: `planned`, `materialized`, `in-progress`, `blocked`, `complete`
- coordination state: `planned`, `in-progress`, `blocked`, `complete`

This split is necessary because the current generic `status --change` command assumes repo-local topology:

- root-level `tasks.md`
- root-level `specs/`
- artifact completion by file existence

A workspace change does not have that layout. The direct manual probe for this phase showed that running `status --change shared-refresh --json` from a workspace root reports `proposal` and `design` as done, `specs` as ready, and `tasks` as blocked because it is looking for repo-local root artifacts that do not exist in workspace topology. That output is valid for the existing command, but it is not an honest workspace roll-up.

The current implementation surface already gives the right raw signals for a custom roll-up:

- `src/core/workspace/change-create.ts` creates workspace coordination tasks at `tasks/coordination.md` and per-target draft tasks at `targets/<alias>/tasks.md`
- `src/core/workspace/apply.ts` reuses the workspace change ID in the target repo and writes `.openspec.materialization.yaml`
- `src/utils/task-progress.ts` and `src/core/list.ts` already define tracked progress in terms of checkbox counts inside `tasks.md`

The practical conclusion is:

- use task-progress counts for progress and completion
- use repo-local materialization plus trace metadata for execution provenance
- do not infer archive from repo-local task completion

## One precise derivation rule per state

### `planned`

Rule:

- A target is `planned` when it is declared in the workspace change metadata, the target repo alias resolves cleanly, and no valid repo-local materialization exists at `<resolved-repo>/openspec/changes/<change-id>/`.
- The overall workspace change is `planned` only when coordination is `planned` and every target is `planned`.

Why:

- an unmaterialized target is still using the workspace draft as its current authority
- absence of repo-local execution state is not by itself a failure

### `materialized`

Rule:

- A target is `materialized` when a valid repo-local materialization exists and its repo-local task progress is either `0/<n>` or `0/0`.

Why:

- the current repo-local `list --json` surface collapses `0/<n>` into `in-progress`
- the workspace roll-up needs one extra state to distinguish "execution surface exists" from "tracked work has started"

### `in-progress`

Rule:

- A coordination slice or target is `in-progress` when its tracked task progress is `0 < completed < total`.
- The overall workspace change is `in-progress` when it is not `blocked`, `soft-done`, or `hard-done`, and at least one target is `materialized`, `in-progress`, or `complete`, or coordination is `in-progress` or `complete`.

Why:

- task progress is the only current product signal that distinguishes "some execution happened" from "nothing started"

### `blocked`

Rule:

- A coordination slice or target is `blocked` when status cannot classify it honestly because a required workspace or repo-local inspection surface is missing or inconsistent.
- The overall workspace change is `blocked` when coordination is `blocked` or any target is `blocked`.

For v0, target-blocked conditions are:

- the target alias is declared on the workspace change but is missing from workspace repo metadata
- the target alias is missing from `.openspec/local.yaml`
- the resolved repo path is missing, not a directory, or no longer contains `openspec/`
- a same-ID repo-local change exists, but `.openspec.materialization.yaml` is missing, malformed, or does not match this workspace and target alias
- a traced repo-local change exists, but `tasks.md` cannot be read for progress derivation

For v0, coordination-blocked conditions are:

- `tasks/coordination.md` is missing or unreadable

Why:

- `blocked` should mean "the status command cannot tell the truth from the current state"
- v0 should not invent softer warning labels when the underlying surface is actually broken

### `complete`

Rule:

- A coordination slice or target is `complete` when its tracked task progress is `n/n` with `n > 0`.

Why:

- `complete` is task-complete, not archive-complete
- this keeps completion aligned with the current repo-local `list` semantics

### `soft-done`

Rule:

- The overall workspace change is `soft-done` when coordination is `complete` and every target is `complete`.

Why:

- this matches the PRD and decision-record definition of "all known coordination work and tracked target work are complete"
- it still leaves explicit top-level archive for the final lifecycle step

### `hard-done`

Rule:

- The overall workspace change is `hard-done` only when an explicit workspace-level archive/completion marker exists for that workspace change.

Why:

- repo-local archive remains repo-local
- repo-local task completion or repo-local archive alone must never imply top-level finality

## Workspace-only versus repo-local inspection

The minimum source split for v0 is:

### Uses workspace state alone

- workspace metadata and target membership
- coordination task progress from `changes/<id>/tasks/coordination.md`
- pre-materialization draft task progress from `changes/<id>/targets/<alias>/tasks.md`
- overall `hard-done` once Phase 16 adds explicit workspace archive state

### Requires repo-local inspection

- whether a target has been materialized at all
- whether the materialized change belongs to this workspace target rather than just sharing the same change ID
- repo-local execution progress and completion from `<repo>/openspec/changes/<id>/tasks.md`
- blocked states caused by stale repo paths, missing `openspec/`, or malformed materialization traces

### Mixed roll-up states

- overall `planned` depends on workspace coordination plus every target still being `planned`
- overall `in-progress` depends on both workspace coordination and any materialized target state
- overall `blocked` depends on any blocked coordination or target slice
- overall `soft-done` depends on coordination plus every target reaching `complete`

## Reverse-link decision

Decision:

- reverse links are required in v0, but the minimum required reverse link is the existing `.openspec.materialization.yaml` sidecar

What is required:

- keep reusing the workspace change ID as the repo-local change ID
- keep writing `.openspec.materialization.yaml`
- Phase 14 status should validate:
  - `source: workspace`
  - `workspaceName` matches the current workspace
  - `targetAlias` matches the target being inspected

What is not required:

- no new backlink fields in `.openspec.yaml`
- no absolute workspace paths
- no extra workspace change ID field beyond the repo-local directory name, because Phase 11 already made the directory name match the workspace change ID

Why this is the minimum honest choice:

- without the sidecar, a same-ID repo-local change could be mistaken for a materialized workspace target even if it did not originate from this workspace flow
- with the sidecar, Phase 14 can distinguish "materialized from this workspace" from "same change name exists locally for some other reason"

## Minimum JSON shape to lock down in Phase 14

Phase 14 should keep the JSON contract small and stable:

```json
{
  "change": {
    "id": "shared-refresh",
    "state": "planned"
  },
  "coordination": {
    "state": "planned",
    "tasks": {
      "completed": 0,
      "total": 2
    }
  },
  "targets": [
    {
      "alias": "api",
      "state": "planned",
      "source": "workspace",
      "tasks": {
        "completed": 0,
        "total": 2
      },
      "problems": []
    },
    {
      "alias": "app",
      "state": "materialized",
      "source": "repo",
      "tasks": {
        "completed": 0,
        "total": 2
      },
      "problems": []
    }
  ]
}
```

Contract notes:

- `change.id` is the workspace change ID
- `change.state` is only `planned`, `in-progress`, `blocked`, `soft-done`, or `hard-done`
- `coordination.state` is only `planned`, `in-progress`, `blocked`, or `complete`
- target `state` is only `planned`, `materialized`, `in-progress`, `blocked`, or `complete`
- `targets` are sorted by alias for deterministic tests
- `source` is `workspace` before materialization and `repo` after materialization
- `tasks` always reflects the authority for the current `source`
- `problems` is empty unless the slice is `blocked`
- the JSON should not include spinner text, ANSI codes, or absolute repo paths

## Rejected alternatives

### Rejected: reuse raw artifact-graph `status --change` for workspace roll-up

Why rejected:

- the current command is correct for repo-local change topology, not workspace topology
- it looks for root `specs/` and root `tasks.md`, which the workspace change intentionally does not have
- it would misreport workspace state instead of clarifying it

### Rejected: treat `0/<n>` repo-local task progress as `in-progress` in workspace roll-up

Why rejected:

- that loses the important distinction between "materialized, but untouched" and "work has actually started"
- the roadmap explicitly wants both `materialized` and `in progress`

### Rejected: trust any same-ID repo-local change without a workspace trace sidecar

Why rejected:

- same-name repo-local changes are not strong enough provenance
- status would risk claiming a workspace target was materialized when it was not

### Rejected: infer `hard-done` from repo-local archive or repo-local task completion

Why rejected:

- the PRD and roadmap keep workspace archive as an explicit top-level action
- different repos can finish or archive at different times without closing the whole workspace change

## Phase 14 implications

Phase 14 should implement only this contract:

- custom workspace-aware roll-up logic
- checkbox-based task progress for coordination and target completion
- materialization provenance validated through `.openspec.materialization.yaml`
- target states distinct from overall workspace states

No new roadmap phase is required from this decision.
