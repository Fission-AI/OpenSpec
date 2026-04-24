# Phase 18 Decision

Phase cycle: 1
Stage: `implementation`
Date: 2026-04-17 (Australia/Sydney)

## Shipped POC contract to preserve

This phase is explicitly non-blocking. The working POC contract stays as shipped:

- committed workspace repo identity is alias-keyed in `.openspec/workspace.yaml`
- machine-local repo attachment is alias-keyed in `.openspec/local.yaml` through `repoPaths`
- workspace changes target aliases through `targets: [<alias>]`
- per-target draft artifacts live at `changes/<id>/targets/<alias>/...`
- `openspec apply --change <id> --repo <alias>` materializes one repo-local bundle and reuses the same change ID
- repo linkage is recorded only through `.openspec.materialization.yaml`
- canonical specs still live in owner repos, not in the workspace

Nothing in this phase changes `new change`, `apply`, `status`, `archive`, fixture layout, or the existing workspace metadata shape.

## Concrete decision

The recommended post-POC direction is:

- shared-contract promotion should be a separate explicit workflow into a canonical owner repo, not an implicit side effect of `apply`, `status`, or `archive`
- stable project IDs should be added on top of the current alias-based contract first, not used as a flag-day replacement
- team-shared workspace semantics should remain out of scope until stable project identity and a real shared storage/conflict model exist

That keeps the POC honest:

- v0 proves centralized planning plus local execution
- future ownership and identity work can be layered on without rewriting the working demo contract
- current tests and fixtures remain a stable baseline instead of moving during signoff

## Recommended next-step design

### 1. Shared-contract promotion

Future shared contracts should move into a canonical owner repo through an explicit command, for example:

`openspec workspace promote-contract --change <id> --owner <alias> --spec <namespace/path>`

Recommended behavior:

1. Resolve the owner repo through the existing workspace registry.
2. Read the workspace change plus the shared-contract draft or summary being promoted.
3. Write or update the canonical owner-repo spec under `openspec/specs/<namespace/path>/spec.md`.
4. Record a promotion receipt back in the workspace change, but only as an opt-in artifact created by the promotion command.

Recommended receipt shape:

- location: `changes/<id>/promotions/<contract-id>.yaml`
- fields:
  - `ownerAlias`
  - `ownerProjectId` when available later
  - `specPath`
  - `promotedAt`
  - `sourceChangeId`

Why this shape:

- it keeps canonical truth in the owner repo
- it avoids turning the workspace into a second permanent spec store
- it does not change the current `apply` authority handoff contract
- it keeps any new file shape opt-in instead of changing default workspace scaffolding

### 2. Stable project IDs

Stable project identity should arrive additively in two layers.

First layer: committed metadata

- extend each repo entry in `.openspec/workspace.yaml` with an optional `projectId`
- keep the alias key as the local ergonomic handle for CLI commands and existing tests

Example:

```yaml
version: 1
name: happy-path
repos:
  app:
    projectId: github.com/acme/app
    description: Application repo
```

Second layer: machine-local bindings

- keep `.openspec/local.yaml` for machine-local path resolution
- add an optional `projectBindings` map keyed by stable `projectId`
- continue reading the existing `repoPaths` alias map during the migration window

Example additive shape:

```yaml
version: 2
repoPaths:
  app: ../repos/app
projectBindings:
  github.com/acme/app:
    path: ../repos/app
```

Resolver order in the first migration step should be:

1. target alias from the current CLI or workspace change
2. alias lookup in `.openspec/workspace.yaml`
3. `projectId` on that repo entry when present
4. `projectBindings[projectId].path` when present
5. legacy `repoPaths[alias]` fallback

Important boundary:

- do not change `targets: [<alias>]`
- do not change `changes/<id>/targets/<alias>/...`
- do not change `--repo <alias>`

Those can stay alias-based until the identity layer is proven. A later phase can decide whether user-facing targets ever need to become ID-based at all.

### 3. Team-shared workspace semantics

No multi-writer committed workspace semantics should be added immediately after the POC.

Recommended rule:

- keep the workspace as a planner-local coordination home
- keep shareable truth in committed workspace metadata, owner-repo specs, and optional promotion receipts
- do not treat `.openspec/local.yaml` or a git-cloned workspace root as a team-shared execution surface

If collaboration is revisited later, it should be based on:

- stable `projectId`
- owner-repo links and promotion receipts
- possibly a remote summary or review surface

It should not be based on:

- committed absolute paths
- shared mutable local overlays
- the workspace becoming the canonical home for cross-repo specs

## Backward-compatible migration seam

The safest migration seam is dual-read, additive metadata:

- keep alias keys and `targets/<alias>/` as they are
- add optional `repos.<alias>.projectId`
- add optional `local.yaml.projectBindings.<projectId>.path`
- keep reading legacy `repoPaths.<alias>` until every caller and fixture has migrated
- add optional `projectId` to `.openspec.materialization.yaml` later without removing `workspaceName` or `targetAlias`

This seam preserves backward compatibility because existing workspaces, tests, and fixtures continue to function unchanged while new workspaces can start carrying stable IDs.

## What future changes would break the current tests or fixture shape

The following changes would break current tests or fixture layout if done as a direct replacement instead of an additive migration:

- Replacing alias-keyed `repos` or `repoPaths` with ID-keyed maps.
  - Breaks `test/fixtures/workspace-poc/*/workspace/.openspec/*.yaml`.
  - Breaks `test/core/workspace/registry.test.ts`.
  - Breaks `test/helpers/workspace-sandbox.ts`.

- Replacing `targets: ['app', 'api']` or `targets/<alias>/...` with object or ID-based target records.
  - Breaks `test/core/workspace/change-create.test.ts`.
  - Breaks `test/helpers/workspace-assertions.ts`.
  - Breaks `test/core/workspace/apply.test.ts` and `test/core/workspace/status.test.ts`.

- Making `apply` auto-promote shared contracts into an owner repo.
  - Breaks the v0 create-only contract in `notes/workspace-poc/phase-10-materialization-contract-research/DECISION.md`.
  - Breaks tests that assert only the selected target repo is modified:
    - `test/core/workspace/apply.test.ts`
    - `test/cli-e2e/workspace/workspace-apply-cli.test.ts`

- Replacing `.openspec.materialization.yaml` fields with IDs only.
  - Breaks status/apply assertions that currently validate `workspaceName` and `targetAlias`:
    - `test/core/workspace/apply.test.ts`
    - `test/core/workspace/status.test.ts`

- Adding new default directories to every workspace change, such as `promotions/` or `shared-contracts/`.
  - Breaks the locked workspace-change layout assertion in `test/helpers/workspace-assertions.ts`.
  - Breaks `test/core/workspace/change-create.test.ts` if scaffolding changes by default.

## Rejected alternatives

### Rejected: promote shared contracts during `apply`

Why rejected:

- `apply` is currently a narrow per-target materialization step
- promotion has different ownership and overwrite concerns than repo-local execution
- coupling them would blur the current authority handoff contract and expand Phase 10 behavior retroactively

### Rejected: replace aliases with stable IDs in one cut

Why rejected:

- it would force fixture and test churn across the whole workspace POC at signoff time
- it would mix identity migration with unrelated execution behavior
- the current alias contract is already working and should be the compatibility baseline

### Rejected: commit a shared team workspace as the next step

Why rejected:

- local repo path bindings are still machine-specific
- multi-writer semantics need a conflict model the POC does not have
- canonical truth already belongs in owner repos, not in a shared mutable workspace clone

### Rejected: let the workspace become the canonical shared-contract store

Why rejected:

- it violates the POC principle that canonical specs live in owner repos
- it would create dual authority between workspace drafts and repo-owned specs
- it would make archive and review semantics less clear, not more

## Blockers and next-step notes

- No blockers remain for Phase 18.
- No new roadmap phase is required for the working POC because this decision is intentionally deferred and non-blocking.
- If this work is pursued after signoff, the first implementation step should be additive `projectId` support plus an explicit promotion command, not a redesign of the shipped workspace contract.
