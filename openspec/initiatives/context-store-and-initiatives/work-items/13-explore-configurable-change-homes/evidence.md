# Explore Initiative-Hosted Target-Bound Change Artifacts Evidence

## Initial Research Notes

- Current product direction says context stores sync shared truth, initiatives
  coordinate work, and repo-local changes own implementation planning.
- Roadmap Item 8 currently assumes repo-local changes linked to initiatives.
- Existing planning-home behavior distinguishes repo-local and workspace
  planning homes, but does not have a context-store-backed change home.
- New artifact workflow commands already consume resolved planning paths in
  some places, which may be a useful seam for future change-home resolution.
- Older command surfaces still assume `openspec/changes/` under a local
  OpenSpec project and need an explicit audit before any implementation slice.

## Initial Framing

Configurable change homes are a product-boundary question, not just a path
change. A context-store-hosted artifact would still need a clear target repo or
spec root before validation, apply, archive, or spec sync can run safely.

The future exploration should keep "change home" as internal resolver language
and use clearer product language around initiative-hosted planning artifacts,
target-bound changes, implementation targets, and editable roots.

## Agent-First Team UX Research Pass

Date: 2026-05-23.

Question explored:

```text
What does a great agent-first developer experience look like for teams using
context stores, initiatives, workspaces, and repo-local changes?
```

### External Pattern Notes

- Linear uses initiatives as higher-level coordination objects that group
  projects and expose health, ownership, and active project rollups.
- Jira planning commonly uses initiatives above epics or other child work
  items for multi-team planning.
- GitLab roadmaps show higher-level epics and milestones across groups or
  projects.
- GitHub Projects emphasize flexible planning that stays connected to issues
  and repo work.

These patterns point toward a common split:

```text
Higher-level object = coordination and rollup
Execution item      = work owned closer to a team, project, repo, or issue
```

OpenSpec should keep that separation while making the agent handoff sharper
than human project-management tools can.

### Clean Mental Model

The strongest mental model from the research pass:

```text
Initiative = shared coordination truth
Workspace  = local lens over initiative + repos
Repo change = executable implementation plan
```

Expanded product rule:

```text
Context stores remember.
Initiatives coordinate.
Workspaces open.
Repo-local changes implement.
```

The key invariant:

```text
Work identity is not storage location.
Storage location is not edit permission.
```

This keeps three decisions separate for agents:

- What work is the user talking about?
- Where should the planning artifact live?
- Which files or repos may be edited now?

### Suggested Artifact Types

Repo context:

```text
openspec/changes/<change-id>/
```

Use for repo-owned implementation plans. A repo-local change may reference an
initiative through portable metadata:

```yaml
initiative:
  store: platform
  id: billing-launch
```

Workspace context:

```text
<store>/initiatives/<initiative-id>/work-items/<work-id>/
```

Use for shared initiative planning before repo ownership or implementation
targets are clear. These should be called initiative work items, planning
briefs, or proposals, not executable OpenSpec changes, until Item 13 defines a
full lifecycle for context-store-backed changes.

Workspace-local changes:

```text
<workspace>/changes/<change-id>/
```

Keep as legacy or beta compatibility unless the user explicitly opts into the
workspace-planning flow.

### Agent-First UX Scenarios

Single repo team:

- User asks the agent to create a proposal from inside the repo.
- Agent resolves the initiative if named.
- Agent creates a repo-local change linked to the initiative.
- Apply, validate, sync, and archive stay repo-local.

Monorepo:

- One repo-local change can cover several packages or capabilities.
- The agent may need an area or package hint.
- The repo remains the implementation owner; areas clarify scope but do not
  become separate change homes.

Multi-repo platform:

- Workspace opens the shared initiative context plus local repo clones.
- The initiative coordinates the platform outcome.
- Each owning repo gets its own linked repo-local change when implementation
  ownership is known.
- Workspace state should report available local repos, missing local paths, and
  edit boundaries.

Central architecture team:

- Architects may update initiative requirements, designs, contracts, decisions,
  and questions without owning implementation.
- The agent should offer to draft shared initiative context or ask for the
  owning repo before creating a repo-local change.

Ownership unknown:

- The agent should not create an implementation change.
- It should add or update initiative-level questions, or return target options
  with a request for a repo or area decision.

Teammate onboarding:

```text
Clone or register the context store.
Run context-store doctor.
Open or resolve the initiative.
Link local repos through workspace mappings.
Ask the agent to continue from the initiative.
```

### Ideal Agent JSON Blocks

Agents need stable routing vocabulary across create, status, instructions,
resolve, and list:

```json
{
  "workTarget": {
    "kind": "repo-change | initiative-work-item | workspace-change",
    "id": "add-billing-api",
    "root": "/absolute/path",
    "storePath": "initiatives/billing-launch/work-items/add-billing-api"
  },
  "initiativeLink": {
    "store": "platform",
    "id": "billing-launch",
    "root": "/absolute/store/initiatives/billing-launch"
  },
  "invocationContext": {
    "kind": "repo | workspace",
    "root": "/absolute/current/context"
  },
  "actionContext": {
    "mode": "implementation-ready | planning-only | target-selection-required",
    "sourceOfTruth": "repo | context-store | workspace-local",
    "allowedEditRoots": [],
    "requiresTargetSelection": true,
    "constraints": [
      "Use resolved output paths from the CLI.",
      "Do not infer editable repos from the current working directory."
    ]
  },
  "nextCommands": {}
}
```

The important fields are:

- `workTarget`: the object the agent is acting on.
- `initiativeLink`: the canonical shared coordination context, when present.
- `invocationContext`: where the command was run.
- `actionContext`: what the agent may edit.
- `nextCommands`: follow-up commands the agent should run instead of inventing
  paths.

### Lifecycle Rules

- Repo-local changes are implementation-ready when the repo is the allowed edit
  root.
- Initiative work items are planning-only until they select or link repo-local
  implementation changes.
- Workspace-local changes are compatibility artifacts, not the preferred new
  shared planning model.
- Apply, archive, repo spec sync, and repo delta validation should remain
  repo-local until context-store-backed change lifecycle is explicitly designed.
- If `allowedEditRoots` is empty or target selection is required, agents should
  stop before editing implementation files.

### Edge Cases To Design For

- Same initiative id exists in multiple stores.
- Some registered stores are unreadable or out of sync.
- A workspace can see a repo path but the user has not selected it as an edit
  target.
- The terminal is inside a workspace, but the intended work belongs in a linked
  repo.
- The terminal is inside a linked repo, but the user wants shared initiative
  planning first.
- A repo-local change references an initiative store that is not registered on
  the current machine.
- A context-store work item uses a schema that another teammate does not have.
- A change id exists both as a repo-local change and an initiative work item.
- A central team edits initiative context while implementation teams edit
  linked repo-local changes.

### Suggested Direction From The Pass

Keep Item 8 narrow:

- Add initiative metadata to repo-local changes.
- Add `new change <id> --initiative <store>/<initiative> --json`.
- Use `initiative show` plus workspace/repo context as the agent handoff
  backbone.
- Do not implement context-store-backed OpenSpec changes in Item 8.

Use Item 13 to decide the larger model:

- Whether initiative work items should become a first-class artifact.
- Whether "change home" remains internal language.
- How context-store-hosted work binds to repo targets, specs, validation,
  apply, archive, and sync.
- How skills and generated guidance teach agents to trust CLI JSON instead of
  hardcoded paths or current working directory assumptions.

## Target-Bound Reframe Subagent Pass

Date: 2026-05-23.

Question explored:

```text
Given the product tension around central versus repo-local change storage, how
should Item 13 be reframed before implementation work begins?
```

Three subagent passes reviewed Item 13 from product semantics, agent-first UX,
and lifecycle/implementation angles.

### Product Semantics Findings

- The visible work item should not be framed as generic configurable storage.
  That makes the hard question sound like path plumbing.
- The sharper product question is whether initiative-hosted artifacts can
  become executable OpenSpec changes after they are bound to a target repo or
  spec root.
- Repo-local changes remain the default executable implementation artifact.
- Initiative-hosted artifacts start as planning-only work items, briefs, or
  proposals.
- "Change home" can stay as internal resolver language, but should not be the
  main user-facing concept.

Recommended naming:

```text
Explore Initiative-Hosted Target-Bound Change Artifacts
```

### Agent-First UX Findings

Agents need stable CLI output that separates the artifact from the thing the
agent may edit:

```text
Plan lives in: repo-local OpenSpec | initiative context
Editable target: selected repo path | none yet
Linked initiative: platform/billing-launch
```

Commands should report structured action context rather than making generated
skills infer paths:

```json
{
  "workTarget": {
    "kind": "repo-change | initiative-work-item | initiative-hosted-change",
    "id": "add-billing-api",
    "root": "/absolute/path"
  },
  "initiativeLink": {
    "store": "platform",
    "id": "billing-launch"
  },
  "implementationTarget": {
    "kind": "repo",
    "id": "billing-api",
    "specRoot": "openspec"
  },
  "actionContext": {
    "mode": "implementation-ready | planning-only | target-selection-required | unsupported",
    "sourceOfTruth": "repo | context-store | workspace-local",
    "allowedEditRoots": [],
    "constraints": [
      "Use CLI-reported paths.",
      "Do not infer editable repos from the current working directory."
    ]
  },
  "nextCommands": {}
}
```

If `allowedEditRoots` is empty, the agent should stop before editing
implementation files. If target selection is required, the command should return
next-step options rather than silently creating an ambiguous implementation
change.

### Lifecycle And Implementation Findings

Local code still has strong repo-local assumptions:

- `src/core/planning-home.ts` models planning homes as `repo | workspace`.
- `src/commands/workflow/new-change.ts` resolves storage from the current
  planning home and does not yet expose `--initiative` or `--json`.
- `src/commands/validate.ts` validates changes and specs from
  `process.cwd()/openspec/...`.
- `src/core/archive.ts` archives by reading `openspec/changes`, applying deltas
  to `openspec/specs`, and moving the change into `openspec/changes/archive`.
- `src/core/artifact-graph/types.ts` metadata does not yet model initiative
  links, target repo identity, artifact home, or edit boundaries.
- Generated skills and workflow templates still contain repo-local path
  assumptions such as `openspec/changes/<name>/`.

These are not bugs in the current repo-local model. They are evidence that an
initiative-hosted executable change is a lifecycle design, not a small path
switch.

### Updated Recommendation

Keep Item 8 narrow:

- Create or link repo-local changes with initiative metadata.
- Add JSON output for the agent handoff.
- Do not implement context-store-hosted executable changes in Item 8.

Use Item 13 to answer the bigger question:

- What initiative-hosted artifacts exist before an implementation target is
  known?
- What target metadata lets a shared artifact graduate into an executable
  change?
- How do local workspace and registry mappings resolve target repo identity to
  machine-local paths?
- Which lifecycle commands should refuse, hand off to a repo-local change, or
  operate directly against a resolved target?
- How should command and skill output teach agents to trust CLI-reported paths,
  edit roots, and next commands?

Go/no-go criterion:

```text
Do not implement initiative-hosted executable changes until create/link,
show/status/list/instructions, validate, apply, archive, spec sync, workspace
resolution, generated skills, and JSON output all share one target-resolution
model.
```
