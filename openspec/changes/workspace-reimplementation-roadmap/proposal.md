## Why

Workspace support needs to be reimplemented as a user-facing workflow, not carried forward as a direct port of the proof of concept.

A user should be able to say they have a multi-repo product goal, create a workspace, add the relevant repos, open that workspace with an agent, plan the change, implement one repo slice at a time, verify it, and archive it. The POC branch captured useful behavior and discovery, but its implementation should remain reference material rather than the base architecture.

This roadmap also needs to survive multiple sessions and branches. Current OpenSpec change discovery treats active changes as flat immediate directories under `openspec/changes/`, and change names are kebab-case identifiers rather than nested paths. This change is therefore a flat planning container with sibling proposal changes instead of nested child changes.

Reference material:

- `workspace-poc` at `79a45ac043f414e63d13e08b9da83b135cb20a39`
- `WORKSPACE_REIMPLEMENTATION_DIRECTION.md` on that branch
- `WORKSPACE_POC_FOLLOWUP_NOTES.md` on that branch

## What Changes

Add a lightweight roadmap for reimplementing workspace support as a stack of flat sibling OpenSpec changes:

- `workspace-foundation`
- `workspace-create-and-register-repos`
- `workspace-open-agent-context`
- `workspace-change-planning`
- `workspace-apply-repo-slice`
- `workspace-verify-and-archive`

Each sibling change owns one step in the lived user journey. Dependencies are documented in proposal prose for now. When change stacking metadata lands, this roadmap can be migrated to explicit `parent` and `dependsOn` metadata.

The intended order is:

```text
workspace-foundation
  -> workspace-create-and-register-repos
  -> workspace-open-agent-context
  -> workspace-change-planning
  -> workspace-apply-repo-slice
  -> workspace-verify-and-archive
```

## Capabilities

### New Capabilities

- `workspace-reimplementation-roadmap`: Coordinates the workspace reimplementation plan across multiple flat OpenSpec changes.

### Modified Capabilities

- `openspec-conventions`: Clarifies that this workspace effort uses flat sibling changes until nested or stacked change metadata is supported.

## Impact

- Planning only in this PR.
- Future changes will affect workspace metadata, workspace CLI flows, agent context construction, workspace change planning, repo-slice application, verification, and archive behavior.
- No runtime behavior changes are introduced by this roadmap proposal.
