# Stabilize Workspace As Local View

## Status

Complete for the current local-view stabilization slice. Remaining workspace
planning/apply/verify/archive behavior stays deferred until initiative-linked
repo-local changes exist.

## Source Of Truth

Start from `../direction.md`.

The relevant model is:

```text
Context stores sync truth.
Collections shape truth.
Initiatives coordinate work.
Workspaces open local views.
Changes implement repo-owned slices.
```

## Goal

Keep workspace setup, link, relink, list, open, update, and doctor useful while
making it clear that a workspace is a regenerable machine-local view, not the
durable coordination object.

## Agreed Guidance Direction

Generated workspace guidance should route agents by ownership:

- Use the workspace to open the local view of coordinated work.
- Use initiatives for durable cross-team or cross-repo intent, decisions,
  requirements, and coordination context.
- Use repo-local OpenSpec changes for implementation plans owned by a repo or
  team.
- Use linked repos and folders to inspect context, understand ownership, and
  make edits in the place that owns the work.
- Keep workspace-local files focused on local paths, opener state, agent setup,
  and other machine-specific view state.
- Use OpenSpec workspace commands instead of hand-editing
  `.openspec-workspace/*.yaml`.
- If a workspace contains legacy or beta workspace-level planning files, treat
  them as compatibility context unless the user explicitly asks to use that beta
  flow.

## Guidance To Stop Reinforcing

Do not tell agents to use workspace-level `changes/` as the planning home for
coordinated work. That reinforces the superseded model where a workspace-level
`changes/` tree owned the canonical shared cross-repo plan.

Existing workspace-planning behavior may remain as beta or legacy
infrastructure, but it should not steer new lifecycle design.

## Likely Repo Slice

- Reword generated workspace guidance in
  `src/core/workspace/open-surface.ts`.
- Update focused guidance tests.
- Make `workspace update` refresh the guidance block for existing workspaces.
- Keep specs untouched until a behavior change intentionally updates them.

## Closeout

Implemented:

- generated workspace guidance now routes work by ownership
- `workspace update` refreshes workspace-local guidance/open-surface files and
  managed agent skills
- workspace-planning action context treats beta workspace artifacts as
  `workspace-local` compatibility context
- live docs describe workspaces as local views instead of durable planning homes

Deferred:

- normal doctor installed-skill inventory
- workspace apply, verify, and archive
- initiative-linked repo-local change orchestration
