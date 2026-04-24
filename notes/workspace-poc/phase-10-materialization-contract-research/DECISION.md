# Phase 10 Decision

Phase cycle: 1
Stage: `implementation`
Date: 2026-04-17 (Australia/Sydney)

## Recommended v0 contract

The v0 materialization contract for `openspec apply --change <id> --repo <alias>` is:

- create-only at the selected target repo
- zero overwrite behavior
- no refresh or re-materialize path in v0
- reuse the workspace change ID as the repo-local change ID
- keep the repo-local bundle self-contained enough to execute without going back to the workspace
- keep workspace planning artifacts intact after apply

In concrete terms, a successful v0 apply writes exactly one repo-local change at:

`<resolved-repo>/openspec/changes/<change-id>/`

The repo-local bundle should contain:

- `.openspec.yaml` with the workspace change schema and a repo-local `created` date
- `proposal.md` copied from the workspace change root
- `design.md` copied from the workspace change root
- `tasks.md` copied from `targets/<alias>/tasks.md`
- `specs/` copied from `targets/<alias>/specs/`
- `.openspec.materialization.yaml` as the minimum trace sidecar

The trace sidecar should be the smallest machine-readable link needed for later roll-up without redesigning core change metadata:

```yaml
source: workspace
workspaceName: <workspace metadata name>
targetAlias: <alias>
materializedAt: <ISO-8601 timestamp>
```

This file intentionally does not store absolute paths.

What stays in the workspace only:

- `tasks/coordination.md`
- any other workspace-only planning notes outside the selected target slice
- the original `targets/` tree

## Why this contract

Evidence reviewed for this phase:

- `src/core/workspace/open.ts` explicitly keeps `workspace open` read-only and tells the user that repo-local materialization happens later with `openspec apply --change <id> --repo <alias>`.
- `src/core/workspace/change-create.ts` already stores the shared planning truth centrally: schema, created date, and explicit target aliases in the workspace change.
- `src/utils/change-metadata.ts` and `src/core/artifact-graph/types.ts` currently model normal change metadata as `schema`, `created`, and optional `targets`; adding traceability through a sidecar is less invasive than expanding `.openspec.yaml` first.
- `schemas/spec-driven/schema.yaml` expects repo-local execution artifacts in their normal locations, especially root-level `tasks.md` and `specs/`.
- The current CLI surface has schema-aware apply instructions, but no repo-aware `apply --repo` materialization implementation yet, so Phase 11 should land a narrow write contract instead of a refresh engine.

The practical conclusion is:

- create-only is the smallest honest contract for the POC
- repo-local execution should not depend on the workspace remaining mounted in context
- traceability should be explicit, but minimal

## Exact v0 behavior

### Preconditions

`openspec apply --change <id> --repo <alias>` should hard-fail unless all of the following are true:

- the command is run from a managed workspace root
- `changes/<id>/` exists in that workspace
- the workspace change metadata contains `targets`
- `<alias>` is one of those targets
- `<alias>` resolves through workspace metadata and local overlay to a live repo containing `openspec/`
- the workspace change has the source files needed for a repo-local execution bundle:
  - `proposal.md`
  - `design.md`
  - `targets/<alias>/tasks.md`
  - `targets/<alias>/specs/` (may be empty, but the directory must exist)
- the destination repo does not already contain `openspec/changes/<id>/`

### Successful materialization

A materialization counts as successful only when:

- the command exits `0`
- only the selected target repo is modified
- the destination repo now contains one complete repo-local change at `openspec/changes/<id>/`
- that repo-local change includes the exact files listed in the recommended contract above
- the workspace change remains intact and unchanged after the write

At the selected-repo scope, success is all-or-nothing:

- validate every source and destination condition before writing
- stage the repo-local bundle in a fresh temp directory
- move it into place only after the bundle is complete
- if staging fails, clean up the temp directory and leave the final destination absent

### Repeat `apply` behavior

The repeat-call behavior in v0 is:

- first successful apply for a target repo creates that repo-local change and transfers execution authority for that target
- repeating apply for the same `<change-id>` and the same `<alias>` fails clearly because v0 is create-only
- repeating apply for a different targeted alias is allowed if that other target repo does not already have `openspec/changes/<id>/`
- editing workspace planning artifacts after one repo has already been materialized does not refresh that repo on a repeat apply; divergence is expected until a future refresh contract exists

The user-facing rule is simple:

- if the repo-local change already exists, OpenSpec protects it and refuses to overwrite it

### Conflict handling

These cases should fail non-zero with no partial success:

- unknown repo alias
- alias registered in the workspace but not targeted by the selected workspace change
- stale or missing target repo path
- target repo missing `openspec/`
- missing workspace source files for the selected target slice
- pre-existing destination change directory or destination file collision

The error should say whether the failure is:

- a target-selection problem
- a repo-resolution problem
- a source-artifact problem
- or a create-only collision

## Explicit non-goals

The v0 contract explicitly does not include:

- refresh or re-materialize behavior
- selective overwrite of existing repo-local files
- sync-back from repo-local execution into workspace drafts
- automatic workspace status updates during apply
- automatic promotion of shared drafts into a canonical owner repo
- copying workspace coordination tasks into repo-local execution bundles
- expanding `.openspec.yaml` with richer workspace-link metadata in this phase

## Rejected alternatives

### Rejected: support refresh in v0

Why rejected:

- refresh immediately forces overwrite rules, merge semantics, and conflict resolution policy
- the roadmap already leans toward create-only unless this phase proved otherwise
- the POC does not need refresh to prove the planning-to-execution handoff

### Rejected: overwrite an existing repo-local change on repeat apply

Why rejected:

- it risks destroying real repo-local execution state
- it hides authority transfer instead of making it explicit
- it makes repeat behavior harder to explain and harder to test honestly

### Rejected: copy coordination tasks into the repo-local change

Why rejected:

- coordination remains a workspace concern
- copying it into one repo would blur local execution with cross-repo planning
- the target repo should receive only the shared context plus its own execution slice

### Rejected: store trace metadata by expanding `.openspec.yaml` first

Why rejected:

- current change metadata support is intentionally small
- a sidecar is enough for Phase 11 and Phase 13 follow-on work
- it avoids coupling the workspace POC to a broader metadata-schema change

## Phase 11 implications

Phase 11 should implement only this contract:

- one selected repo per apply call
- create-only destination semantics
- normal repo-local change layout
- explicit minimal sidecar trace metadata

No new roadmap phase is required from this decision.
