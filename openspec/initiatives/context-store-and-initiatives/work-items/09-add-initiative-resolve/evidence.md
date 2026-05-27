# Reject Initiative Resolve Evidence

## Decision Summary

Date: 2026-05-25.

After review, the standalone `openspec initiative resolve <id>` command should
not be implemented, now or later.

The useful distinction is already covered by existing concepts:

- `initiative show` resolves canonical shared initiative context.
- A workspace is the local view over repos and folders.
- Repo-local changes link themselves to initiatives through checked-in metadata.
- Repo-local status reports implementation progress.

A standalone resolve command would mostly duplicate workspace local-view state
or provide weak output when no workspace is present.

## Pressure Test

Scenario:

```bash
git clone git@github.com:acme/context.git
openspec context-store register ./context --id platform
openspec initiative show billing-launch --json
```

This can locate:

```text
platform/billing-launch
./context/initiatives/billing-launch
./context/initiatives/billing-launch/initiative.yaml
```

It cannot know:

```text
which implementation repos should exist locally
where those repos are on this machine
which repos the user intends to work in
which repos should be cloned
which workspace view the user wants
```

That knowledge belongs to the user and the workspace, not the initiative.

## Why Workspace Changes The Answer

When a user has a workspace, the local view is already resolved by the
workspace:

```text
workspace -> link names -> machine-local paths
```

The agent can operate from the workspace context. A separate
`initiative resolve` command would add another layer that mostly reprints what
the workspace already owns.

If future UX needs initiative-aware opening, it should be part of workspace
behavior, such as opening or preparing a workspace around a selected initiative.
It should not be a standalone initiative command pretending to infer local repo
availability.

## Research Notes Retained

The earlier investigation is still useful as background:

- `initiative show` already has correct context-store lookup behavior,
  ambiguity handling, incomplete lookup handling, and JSON locator output.
- Item 8 stores initiative links in repo-local `.openspec.yaml` as
  `{ store, id }`.
- Workspace state owns local path mappings and generated open surfaces.
- Existing repo-local status and instructions expose initiative links but do not
  resolve or summarize the initiative.

Those findings support the final decision: do not add a standalone command; keep
each responsibility in its existing owner.

## Rejected Scope

Rejected for Item 9:

- `openspec initiative resolve <id>`
- path-resolution dashboards
- progress dashboards
- all-workspace scans
- all-repo scans
- explicit path scanning as an initiative command
- Git remote matching
- repo ownership inference
- cloning or branch/worktree orchestration
- initiative backlinks

## Verification

This pass updates decision artifacts only.

```bash
git diff --check
```

Result: passed after this revision.
