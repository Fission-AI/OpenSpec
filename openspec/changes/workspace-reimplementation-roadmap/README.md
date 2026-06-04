# Workspace Reimplementation Roadmap

This change is the continuity layer for reimplementing workspace support across multiple sessions and branches.

## Current Status

This roadmap is historical and has been reframed by
`openspec/initiatives/context-store-and-initiatives/`. Fresh agents should use
the initiative direction as product authority and this roadmap as reference for
POC lessons and preserved local-view behavior.

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

Do not pick up the next unfinished flat sibling change from this roadmap unless
a later initiative-linked repo-change design explicitly reactivates it.

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

Use it to understand behavior, tests, and lessons learned. Do not merge it or preserve its architecture by default. The full source direction document from that branch is captured in `HISTORICAL_DIRECTION.md`.

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

`workspace-apply-repo-slice` is deferred until initiative-linked repo-local changes define the implementation handoff.

`workspace-verify-and-archive` is deferred until initiative status and linked repo-local change lifecycle exist.

## Session Handoff Prompt

Use this prompt at the start of future implementation sessions:

```text
Continue the context-store-and-initiatives direction. Read
openspec/initiatives/context-store-and-initiatives/direction.md and
openspec/initiatives/context-store-and-initiatives/roadmap.md first. Use
openspec/changes/workspace-reimplementation-roadmap/START_HERE.md,
openspec/changes/workspace-reimplementation-roadmap/README.md,
openspec/changes/workspace-reimplementation-roadmap/HISTORICAL_DIRECTION.md,
openspec/changes/workspace-reimplementation-roadmap/POC_REFERENCE_GUIDE.md, and
workspace-poc at 79a45ac043f414e63d13e08b9da83b135cb20a39 as historical
reference material only. Preserve useful local-view workspace behavior, but do
not implement workspace apply, verify, or archive until initiative-linked
repo-local changes exist.
```

## Branching Guidance

Each sibling change may be implemented on its own branch or PR. Keep decisions that affect later slices in this README or in the relevant proposal so future sessions do not depend on chat history.
