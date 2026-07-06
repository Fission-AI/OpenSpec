# Work Item 01: Lock The Direction

## Goal

Make the workspace-to-initiative pivot explicit enough that future agents and
contributors do not continue implementing the older "workspace owns the plan"
model.

The locked model is:

```text
Context stores sync truth.
Collections shape truth.
Initiatives coordinate work.
Workspaces open local views.
Changes implement repo-owned slices.
```

## Direction

This work item is a non-spec direction pass, not a runtime removal.

Specs should continue to describe the current behavioral contract behind the
code. Product intent, roadmap decisions, and future direction should live in the
initiative artifacts until a later implementation change intentionally updates
behavior and its specs together.

Keep:

- workspace setup, link, relink, list, open, update, and doctor
- linked repos and folders as local planning context
- workspace-local skills as local agent guidance
- "workspace visibility is not change commitment"

Mark as transitional:

- workspace-level `changes/` planning
- `workspace-planning` schema
- workspace-scoped status/instructions compatibility

Defer:

- workspace apply, verify, and archive as first-class lifecycle commands
- branch/worktree orchestration
- strong cross-repo validation
- dependency graph enforcement

Supersede:

- workspace as the durable shared planning home
- workspace-level planning artifacts as the canonical cross-repo plan
- workspace change planning as the long-term source of truth

## Files To Review Now

- `openspec/initiatives/context-store-and-initiatives/*.md`
- `openspec/initiatives/context-store-and-initiatives/work-items/**/*.md`
- `openspec/changes/workspace-reimplementation-roadmap/START_HERE.md`
- `openspec/changes/workspace-reimplementation-roadmap/HISTORICAL_DIRECTION.md`
- `openspec/changes/workspace-reimplementation-roadmap/*`
- active `openspec/changes/workspace-*` proposals
- `docs/cli.md`

## Files To Leave Alone For Now

- `openspec/specs/**/*.md`
- `schemas/workspace-planning/**`

Those files should change only when we intentionally change behavior or create a
repo-owned implementation change that updates the relevant behavioral contract.

## Non-Goals

- Do not remove current workspace-planning runtime behavior.
- Do not delete the `workspace-planning` schema.
- Do not add CLI deprecation warnings until the initiative replacement exists.
- Do not implement context stores in this work item.
- Do not edit OpenSpec specs as part of the initial direction lock.

## Done When

- Initiative artifacts clearly carry the product intent and roadmap decisions.
- Historical workspace roadmap artifacts no longer read as the active shipping
  queue.
- User-facing docs describe current workspaces as local views where that does
  not contradict current behavior.
- Existing workspace-planning behavior is clearly treated as current behavior,
  not the future product model, in initiative and roadmap artifacts.
- Workspace apply, verify, and archive are clearly deferred.
- Fresh agents can identify the initiative direction as the source of truth.
