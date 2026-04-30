# Workspace Reimplementation Direction

Date: 2026-04-30

Fresh-agent entry point: read `WORKSPACE_REIMPLEMENTATION_START_HERE.md` first, then return to this document for the full product direction.

This document captures the intended direction for reimplementing OpenSpec workspace support from scratch, based on what we learned from the workspace POC.

The reimplementation should be ordered around the path a real user takes through OpenSpec:

```text
create workspace
  -> add repos
  -> open workspace
  -> explore across repos
  -> create proposal
  -> apply one repo slice
  -> verify
  -> archive
```

The goal is not to rebuild every POC mechanism. The goal is to get one user-facing capability working at a time, in the same order a user would naturally create, implement, verify, and archive a change.

## North Star

A user should think:

```text
I have a multi-repo product goal.
I create an OpenSpec workspace.
I open it with my agent.
The agent can see the registered repos.
We explore until the scope is clear.
Then we create a proposal.
Then we implement one repo slice at a time.
```

They should not think:

```text
I need to create a change so repos become visible.
I need to materialize repo-local artifacts.
I need to understand workspace overlays.
I need to manage target metadata separately from proposal files.
```

The core product rule is:

```text
Repository visibility is not change commitment.
```

Registered repos are the workspace working set. Creating a change is a planning commitment. Applying a change is an implementation workflow.

## Build Order

### 1. Workspace Creation

First make workspace creation boring and solid.

User goal:

```text
Create a place where cross-repo planning lives.
```

Expected surface:

```bash
openspec workspace create my-workspace
openspec workspace add-repo openspec /path/to/openspec
openspec workspace add-repo landing /path/to/openspec-landing
```

Expected outcome:

```text
workspace/
  AGENTS.md
  changes/
  .openspec-workspace/
```

Product decisions:

- Use `.openspec-workspace/`, not `.openspec/`, for workspace metadata.
- Keep `changes/` visible at the workspace root.
- Treat registered repos as the workspace working set.
- Make `doctor` show human-readable repo names and resolved paths.

Defer:

- Branches.
- Worktrees.
- Apply.
- Archive.
- Complex target lifecycle.

Done when a user can create a workspace, register repos, and run `doctor` to see exactly what OpenSpec knows.

### 2. Workspace Open

Next make the workspace openable in the way users expect.

User goal:

```text
Open this multi-repo working set with my coding agent.
```

Expected surface:

```bash
openspec workspace open
openspec workspace open --agent codex
openspec workspace open --agent github-copilot
```

Product behavior:

- `workspace open` opens the coordination workspace plus registered repos.
- Repo visibility is default.
- Change selection is optional focus, not the mechanism for repo access.
- `--agent` should be a one-session override by default. Persisting the preferred agent should require an explicit preference-setting action.

For GitHub Copilot, generate or open a `.code-workspace` file with:

```text
workspace root
registered repo A
registered repo B
```

For Claude and Codex, attach the registered repo directories through the agent's supported mechanism.

Defer:

- `workspace open --change`.
- In-session upgrade flows.
- Per-change attachment restrictions.

Done when opening a workspace gives the agent visibility into the coordination root and all registered repos.

### 3. Agent Guidance And Explore

Then make exploration work.

User goal:

```text
Tell the agent a rough product goal and have it inspect the repos before creating a proposal.
```

Expected user prompt:

```text
Explore how we should make the OpenSpec docs available on the landing page.
Look across the registered repos, but do not implement yet.
```

Agent behavior:

- Understand it is in workspace mode.
- Inspect registered repos.
- Explain likely affected repos.
- Ask for clarification only when needed.
- Avoid implementation edits during explore.

Build:

- Workspace-level `AGENTS.md` guidance.
- Normal OpenSpec skills and commands in workspace sessions.
- Workspace-specific guidance layered on top of normal `/explore`, not replacing it.

Defer:

- Proposal artifact generation.
- Target confirmation commands.
- Apply context providers.

Done when a user can open a workspace and run a useful cross-repo exploration without creating a dummy change.

### 4. Proposal Creation

Only after explore works, build proposal creation.

User goal:

```text
Now that we understand the scope, capture the plan.
```

Expected user prompt:

```text
Create a proposal for this change.
Target the repos that are actually affected.
```

Preferred artifact shape:

```text
changes/integrate-docs/
  proposal.md
  design.md
  tasks.md
  specs/
    openspec/
      docs-conventions/spec.md
    landing/
      docs-routing/spec.md
```

Key workflow rule:

```text
/explore may leave targets unknown.
/propose may discover targets.
/propose must confirm targets before saying ready for apply.
```

Targets should be represented by the proposal artifacts themselves where possible. If there is `specs/landing/...`, then `landing` is in scope. Avoid a separate required `targets: [...]` metadata list as the active source of truth.

Defer:

- Repo-local materialization.
- Worktree selection.
- Multi-repo implementation.
- Archive.

Done when a user can explore, then create a workspace proposal with repo-scoped specs and tasks.

### 5. Status

Before implementation, make status excellent.

User goal:

```text
Where are we, what repos are involved, and is this ready to implement?
```

Expected surface:

```bash
openspec status
openspec status --change integrate-docs
```

Human output should answer:

```text
Change: integrate-docs
Scope: openspec, landing
Proposal: present
Design: present
Tasks: present
Ready for apply: yes/no
```

Status should also catch structural mistakes:

- Unknown repo folder under `specs/`.
- Missing tasks.
- No confirmed affected repo.
- Registered repo path missing.

Done when the agent and user can trust status before applying.

### 6. Apply One Repo Slice

Only now build `/apply`.

User goal:

```text
Implement the planned slice for one repo.
```

Expected user prompt:

```text
/apply integrate-docs for landing
```

Product contract:

```text
/apply means implement.
```

It does not mean:

```text
copy planning files
materialize repo-local OpenSpec state
create the proposal files for the first time
```

Agent behavior:

1. Ask OpenSpec for apply context.
2. Read proposal, design, tasks, and relevant specs.
3. Confirm the target repo checkout.
4. Edit only that repo.
5. Update workspace tasks.
6. Run relevant checks.

This likely wants a normalized context command internally, but that is supporting machinery:

```json
{
  "mode": "workspace",
  "change": "integrate-docs",
  "target": "landing",
  "implementationRoot": "/repos/openspec-landing",
  "contextFiles": [
    "changes/integrate-docs/proposal.md",
    "changes/integrate-docs/design.md",
    "changes/integrate-docs/tasks.md",
    "changes/integrate-docs/specs/landing/docs-routing/spec.md"
  ],
  "allowedEditRoots": [
    "/repos/openspec-landing"
  ],
  "tasksFile": "changes/integrate-docs/tasks.md"
}
```

Defer:

- Applying multiple repos at once.
- Automatic branch creation.
- Worktree management.
- Repo-local OpenSpec mirroring.

Done when one repo slice can be implemented from the central workspace plan.

### 7. Verify

Then build verification.

User goal:

```text
Check whether the implemented repo slice satisfies the plan.
```

Expected prompt:

```text
/verify integrate-docs for landing
```

Behavior:

- Read the same normalized context as `/apply`.
- Inspect the implementation checkout.
- Check tasks and specs for that repo.
- Run repo validation.
- Report gaps clearly.

Default behavior should verify one repo slice. Whole-workspace verification can come later.

Done when a user can verify one implemented repo slice against the central workspace plan.

### 8. Archive

Archive comes last in the first complete loop.

User goal:

```text
The change is done. Move it out of active planning.
```

Expected prompt:

```text
/archive integrate-docs
```

Behavior:

- Require all targeted repo slices to be complete or explicitly accepted.
- Archive the workspace change.
- Do not require repo-local planning copies unless OpenSpec later decides that repo-local archival matters.

Done when a user can complete the full lifecycle:

```text
workspace create
  -> open
  -> explore
  -> propose
  -> apply repo A
  -> apply repo B
  -> verify
  -> archive
```

## Implementation Discipline

Build only the next user-visible step.

The sequence should stay grounded in these questions:

```text
1. Can I create the workspace?
2. Can I see my repos?
3. Can my agent explore them?
4. Can we capture a proposal?
5. Can status tell us if it is ready?
6. Can the agent implement one repo slice?
7. Can we verify it?
8. Can we archive it?
```

Avoid starting with internal abstractions unless they are required for the next user-visible capability.

Do not start with:

- Target metadata machinery.
- Materialization.
- Adapter abstractions.
- Branch orchestration.
- Worktree orchestration.
- Multi-repo apply.

Those may matter later, but they should not define the first reimplementation path.

## Product Shape

The workspace should feel like OpenSpec's normal workflow stretched across multiple repos, not a second product with its own lifecycle.

The durable product model is:

```text
workspace = central planning source of truth
registered repos = visible working set
proposal = scoped planning commitment
repo target = one affected repo in the plan
branch/worktree = implementation checkout
/apply = implement one selected repo slice
```

Keep the user journey simple:

```text
Open the workspace.
Ask the agent to explore.
Create the proposal when scope is clear.
Implement one repo slice at a time.
Verify.
Archive.
```
