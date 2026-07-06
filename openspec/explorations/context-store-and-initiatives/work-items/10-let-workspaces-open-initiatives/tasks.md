# Let Workspaces Open Initiatives Tasks

## Decisions

- [x] Create Item 10 work-item tracking notes.
- [x] Lock the high-level direction: private local view record plus generated
  runtime files.
- [x] Decide command UX.
- [x] Decide default open target.
- [x] Decide private local view record shape.
- [x] Decide private local view record storage namespace and keying.
- [x] Decide generated runtime file location and lifetime.
- [x] Decide runtime identity rules.
- [x] Decide prepare/JSON surface.
- [x] Decide Codex Desktop behavior.
- [x] Decide Item 10 edit-boundary semantics.

## Implementation Scope To Confirm Later

- [x] Add or adapt workspace local-view state for initiative opening.
- [x] Preserve non-initiative custom workspaces as first-class local views.
- [x] Resolve initiative context through existing `initiative show` semantics.
- [x] Implement workspace-name reuse and collision behavior for initiative open.
- [x] Generate opener-specific runtime files.
- [x] Return explicit machine-readable view context from `workspace open --json`.
- [x] Launch agent/editor with generated workspace root plus initiative context and
  selected local repos/folders.
- [x] Warn and skip missing linked repos/folders at open time while failing on
  missing selected initiative/context.
- [x] Add doctor guidance for missing context stores, missing local links, stale
  view records, and advisory edit boundaries.
- [x] Ensure Item 10 opens known local paths only and does not clone, branch,
  create worktrees, or use submodules.

## Deferred

- [ ] Multiple saved views per initiative.
- [ ] Shared/exported workspace templates.
- [ ] Repo auto-discovery or Git remote matching.
- [ ] Strong edit-boundary enforcement.
- [ ] Codex Desktop multi-root automation if the Desktop contract is not clear
  enough for Item 10.
- [ ] Migration or removal of all existing beta workspace root artifacts.
