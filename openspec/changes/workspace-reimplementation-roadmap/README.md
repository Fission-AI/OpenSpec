# Workspace Reimplementation Roadmap

This change is the continuity layer for reimplementing workspace support across multiple sessions and branches.

Root entry point for fresh agents: `WORKSPACE_REIMPLEMENTATION_START_HERE.md`.

The user journey we are implementing is:

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

Use it to understand behavior, tests, and lessons learned. Do not merge it or preserve its architecture by default. The full source direction document from that branch is copied at the repository root as `WORKSPACE_REIMPLEMENTATION_DIRECTION.md`.

Fresh agents should read `POC_REFERENCE_GUIDE.md` before implementing any slice. That guide explains how to inspect the pinned POC commit, which files to read for each slice, and what findings to bring back into the OpenSpec artifacts.

## Change Order

Implement the flat sibling changes in this order:

1. `workspace-foundation`
2. `workspace-create-and-register-repos`
3. `workspace-open-agent-context`
4. `workspace-change-planning`
5. `workspace-apply-repo-slice`
6. `workspace-verify-and-archive`

OpenSpec currently discovers active changes as immediate directories under `openspec/changes/`, and change names are kebab-case identifiers. Keep these changes as flat siblings until formal change-stacking metadata is available.

## Dependency Notes

`workspace-foundation` establishes the storage, root detection, and naming model. Every later slice should build on that model instead of redefining workspace metadata.

`workspace-create-and-register-repos` creates the workspace and makes linked repos or folders visible before a change exists. Linked items may be full repos, monorepo modules, or planning-only folders. This preserves the product rule that workspace visibility is not change commitment.

`workspace-open-agent-context` gives the agent the workspace location, linked repos or folders, active changes, and selected change scope.

`workspace-change-planning` creates the workspace-level planning commitment and identifies target repo slices.

`workspace-apply-repo-slice` treats apply as implementation of one selected repo slice, not materialization of workspace planning files.

`workspace-verify-and-archive` makes cross-repo progress visible and separates partial repo completion from final workspace completion.

## Session Handoff Prompt

Use this prompt at the start of future implementation sessions:

```text
Continue the workspace reimplementation roadmap. Read
openspec/changes/workspace-reimplementation-roadmap/README.md and
openspec/changes/workspace-reimplementation-roadmap/POC_REFERENCE_GUIDE.md
first, then pick up the next unfinished flat sibling change in order. Use
workspace-poc at 79a45ac043f414e63d13e08b9da83b135cb20a39 as reference
material only. Preserve intended behavior, but reimplement cleanly from the
current base. Before editing, summarize the POC findings for the slice.
```

## Branching Guidance

Each sibling change may be implemented on its own branch or PR. Keep decisions that affect later slices in this README or in the relevant proposal so future sessions do not depend on chat history.
