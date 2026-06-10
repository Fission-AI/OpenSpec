# Workspace Reimplementation Roadmap

This change is the continuity layer for reimplementing workspace support across multiple sessions and branches.

## Current Status

Status: obsolete / pending deletion review.

This roadmap is no longer active and should not be used as an implementation
queue. Current product authority lives in:

1. `openspec/work/simplify-context-and-workspace-model/goal.md`
2. `openspec/work/simplify-context-and-workspace-model/roadmap.md`

Keep this folder temporarily only to review whether it contains unique POC
lessons or historical evidence that should be promoted, linked, or deliberately
discarded before deletion.

Keep:

- workspace setup, link, relink, list, open, update, and doctor
- linked repos and folders as local planning context
- workspace-local skills as local agent guidance
- the POC as research material only

Supersede:

- workspace as the durable shared planning home
- workspace-level planning artifacts as the canonical cross-repo plan
- workspace change planning as the long-term source of truth

Defer:

- workspace apply, verify, and archive as first-class lifecycle commands
- branch/worktree orchestration, strong cross-repo validation, and dependency
  graph enforcement

Do not pick up the next unfinished flat sibling change from this roadmap. The
workspace-owned planning/apply/verify/archive model is obsolete for current
roadmap purposes.

Root entry point for fresh agents: `START_HERE.md`.

The user journey this historical roadmap was implementing is:

```text
create workspace
  -> add repos
  -> open workspace with agent context
  -> plan a cross-repo change
  -> implement one repo slice
  -> verify and archive
```

The POC branch is reference material only:

```text
workspace-poc @ 79a45ac043f414e63d13e08b9da83b135cb20a39
```

Use it only while reviewing whether behavior, tests, or lessons learned should
be preserved elsewhere. Do not merge it or preserve its architecture by
default. The full source direction document from that branch is captured in
`HISTORICAL_DIRECTION.md`.

Fresh agents should read `POC_REFERENCE_GUIDE.md` before implementing any slice. That guide explains how to inspect the pinned POC commit, which files to read for each slice, and what findings to bring back into the OpenSpec artifacts.

## Historical Change Order

The original flat sibling changes were:

1. `workspace-foundation`
2. `workspace-create-and-register-repos`
3. `workspace-open-agent-context`
4. `workspace-change-planning`
5. `workspace-agent-guidance`
6. `workspace-apply-repo-slice`
7. `workspace-verify-and-archive`

OpenSpec currently discovers active changes as immediate directories under `openspec/changes/`, and change names are kebab-case identifiers. These changes remain useful reference artifacts, but they are no longer a direct implementation queue.

## Dependency Notes

`workspace-foundation` establishes the storage, root detection, and naming model. Every later slice should build on that model instead of redefining workspace metadata.

`workspace-create-and-register-repos` creates the workspace and makes linked repos or folders visible before a change exists. Linked items may be full repos, monorepo modules, or planning-only folders. This preserves the product rule that workspace visibility is not change commitment.

`workspace-open-agent-context` gives the agent the workspace location, linked repos or folders, active changes, and selected change scope.

`workspace-change-planning` created the beta workspace-level planning commitment and identified target repo slices. Under the initiative direction, this model is legacy or transitional rather than the durable shared plan.

`workspace-agent-guidance` makes workspace-local workflow skills use the planning model deliberately: inspect linked context, seed workspace changes with goal and known affected areas, and preserve linked repos as read-only planning context until apply selects an edit root.

`workspace-apply-repo-slice` is obsolete for current roadmap purposes. Review
it only for unique handoff evidence before deletion.

`workspace-verify-and-archive` is obsolete for current roadmap purposes. Review
it only for unique progress or archive evidence before deletion.

## Deletion Review Prompt

Use this prompt only when reviewing this artifact before deletion:

```text
Review obsolete workspace roadmap artifacts before deletion. Read
openspec/work/simplify-context-and-workspace-model/goal.md and
openspec/work/simplify-context-and-workspace-model/roadmap.md first. Then use
openspec/changes/workspace-reimplementation-roadmap/START_HERE.md,
openspec/changes/workspace-reimplementation-roadmap/README.md,
openspec/changes/workspace-reimplementation-roadmap/HISTORICAL_DIRECTION.md,
openspec/changes/workspace-reimplementation-roadmap/POC_REFERENCE_GUIDE.md, and
workspace-poc at 79a45ac043f414e63d13e08b9da83b135cb20a39 as historical
reference material only. Promote or link unique evidence worth keeping, then
delete or deliberately retain the reviewed artifacts.
```

## Branching Guidance

Each sibling change may be implemented on its own branch or PR. Keep decisions that affect later slices in this README or in the relevant proposal so future sessions do not depend on chat history.
