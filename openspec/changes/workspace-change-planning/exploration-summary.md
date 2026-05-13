# Workspace Change Planning Exploration Summary

Date: 2026-05-11

Status: exploratory notes. This file records open thinking from the session. It does not represent a final product direction.

## Why This Discussion Happened

The active `workspace-change-planning` proposal still contains framing from the workspace POC era, especially the phrase "without immediately materializing repo-local artifacts." That framing is confusing in the current reimplementation because workspace setup/open already separates repo visibility from implementation.

The real problem space is broader:

- users need to plan changes that may span linked repos or folders
- agents need to explore across the workspace before committing to a plan shape
- OpenSpec should avoid making workspace mode feel like a second product with duplicated workflow skills
- large changes may need to be broken down into smaller parts without becoming many unrelated changes

## Workspace POC Findings

The workspace POC branch in PR #1006 changed `openspec new change` to behave differently inside a workspace.

Outside a workspace, the command behaved like the normal repo-local flow:

```bash
openspec new change add-auth
```

created:

```text
openspec/changes/add-auth/
  .openspec.yaml
```

Inside a workspace, the POC required explicit targets:

```bash
openspec new change add-3ds --targets api,web
```

created:

```text
workspace/
  changes/add-3ds/
    .openspec.yaml        # schema, created, targets
    proposal.md
    design.md
    tasks/
      coordination.md
    targets/
      api/
        tasks.md
        specs/
      web/
        tasks.md
        specs/
```

Important POC behavior:

- workspace changes lived at top-level `changes/<id>/`, not repo-local `openspec/changes/<id>/`
- `--targets` was required inside a workspace
- `--targets` was rejected outside a workspace
- target aliases had to be registered workspace repos
- no files were created inside registered repos during change creation
- `openspec apply --change <id> --repo <alias>` later materialized one target's planning artifacts into a repo-local change
- normal OpenSpec skills were not updated to understand this new structure

The POC behavior was documented on the POC branch in:

- `WORKSPACE_POC_PRD.md`
- `WORKSPACE_POC_DECISION_RECORD.md`
- `WORKSPACE_POC_FOLLOWUP_NOTES.md`
- `docs/workspace.md`
- `docs/workspace-demo.md`
- `notes/workspace-poc/phase-05-targeted-change-create/SUMMARY.md`
- `notes/workspace-poc/phase-10-materialization-contract-research/DECISION.md`

The most important follow-up note was that the POC proved central workspace planning can work, but it also pushed target selection and materialization too early.

## Skill Complexity Concern

A major concern is avoiding a combinatorial explosion in generated skills.

Bad direction:

```text
workflow x agent x workspace-mode
```

For example, if OpenSpec has several workflow skills, several coding-agent-specific instruction variants, and then adds workspace-specific variants on top, the number of skill files grows quickly.

The preferred architectural pressure is:

```text
workflow skill + agent affordance profile + OpenSpec-provided context
```

Meaning:

- keep one conceptual `openspec-propose`, `openspec-apply-change`, `openspec-verify-change`, etc.
- keep agent-specific affordances separate, such as how to ask user questions, use todos, use subagents, or attach directories
- have the OpenSpec CLI tell the skill whether it is in repo-local mode or workspace mode, where artifacts live, what areas are relevant, and what action is safe next

Current skills that would likely need updates if workspace planning proceeds:

- `openspec-propose`
- `openspec-explore`
- `openspec-apply-change`
- `openspec-verify-change`
- `openspec-archive-change`
- `openspec-bulk-archive-change` later, or keep it repo-local until workspace archive semantics are stable

The key instruction these skills may need:

```text
Run `openspec status --change <name> --json`.
Use the returned paths, areas, next steps, and action context.
Do not assume changes live under `openspec/changes/`.
```

## `openspec status --json` As Agent Context

One idea that seemed promising was to use `openspec status --change <id> --json` as the existing CLI surface that tells agents how to act.

Instead of introducing a separate context command immediately, status could report:

- whether the current change is repo-local or workspace-scoped
- where the change artifacts live
- what the next steps are
- which areas are affected or unresolved
- which task/spec/design files should be read or updated
- what edit roots are allowed for implementation
- whether apply needs an area selection

Use simpler language:

- `nextSteps`: what should happen next
- `actionContext`: paths, areas, and constraints needed to act

Avoid terms such as "workflow affordances" in user-facing docs or JSON fields.

## Open Question: Should Targets Exist?

The session questioned whether users need to explicitly set targets at all.

Reason to have targets:

- focused `workspace open --change <id>`
- per-area status roll-up
- apply or implementation of one area at a time
- unresolved path reporting
- avoiding accidental edits outside the intended area
- future verify/archive behavior

Reason to avoid explicit target-setting:

- target selection can be premature before exploration
- it adds bookkeeping for agents
- the plan itself should reveal the affected areas

Potential direction under discussion:

```text
derive affected areas from planning artifacts instead of requiring a separate target-setting step
```

Possible derivation sources:

- structured area folders
- structured slice/area folders
- explicit sections in tasks or design
- optional metadata as a cache or confirmation marker, validated against artifacts

Important caution: Markdown task headings alone are probably too ambiguous to be the only source of truth.

## Terminology Under Discussion

The session identified a naming conflict around "slice."

There are two different concepts:

```text
delivery breakdown = a smaller planned part of a large change
ownership/execution boundary = a repo, folder, package, or system area affected by the change
```

Calling both of these "slices" would make the model confusing.

Working vocabulary under discussion:

```text
change = the overall user-visible planning boundary
slice = a delivery increment inside a large change
area = an ownership or execution boundary, such as a repo or folder
unit = one area inside one slice, when implementation needs that precision
artifact = a proposal, design, task list, spec delta, or note attached to a scope
```

Examples:

```text
Small repo-local work:
  change only
  implicit area = current repo
  implicit slice = main

Small workspace work:
  change = add-3ds
  areas = contracts, billing, web
  slice = main

Large workspace work:
  change = workspace-reimplementation
  slices = setup, open, change-planning, apply, verify-archive
  areas = cli, agent-skills, docs
  units = setup/cli, open/agent-skills, etc.
```

This vocabulary is not decided. It is a candidate model for avoiding confusion.

## Artifact Scoping Problem

A fixed tree where every change, slice, and area gets every artifact would be too heavy.

Artifacts should attach to the scope where they are useful.

Proposal:

- usually belongs at the change level
- summarizes why the work exists and what outcome is intended
- most areas or slices do not need their own proposal
- a slice-level proposal might exist only if that slice needs independent approval or has a materially distinct "why"

Design:

- should live at the broadest scope where the decision applies
- change-level design for cross-area architecture, sequencing, contracts, and tradeoffs
- slice-level design for one independently complex delivery increment
- area-level design for local implementation choices
- unit-level design only when one area within one slice is complex enough

Tasks:

- can exist at multiple scopes
- change-level tasks for coordination, decisions, rollout, and review gates
- slice-level tasks for a delivery increment
- area or unit tasks for implementation work an agent can actually complete

Specs:

- should live closest to ownership
- area or unit specs for normal behavior owned by a repo or folder
- change-level draft specs only when ownership is unresolved

This matters because OpenSpec allows users to select which artifacts a change contains. Workspace/slice/area support should not assume every artifact type exists at every scope.

## Possible File Shapes

No file shape was decided.

A future-friendly, fully structured shape might look like:

```text
changes/<change-id>/
  proposal.md
  design.md
  tasks.md
  slices/
    <slice-id>/
      tasks.md
      design.md
      areas/
        <area-id>/
          tasks.md
          specs/
```

This may be too much structure for a first implementation.

A simpler intermediate shape for large changes could be:

```text
changes/<change-id>/
  proposal.md
  design.md
  tasks.md
  slices/
    workspace-open.md
    workspace-change-planning.md
```

If a slice grows, it could become a folder later.

For smaller cross-area changes, an area-oriented shape might be enough:

```text
changes/<change-id>/
  proposal.md
  design.md
  tasks.md
  areas/
    api/
      tasks.md
      specs/
    web/
      tasks.md
      specs/
```

Again, this is exploratory. The point is that artifact scope should be explicit enough for tools and agents, without forcing unnecessary files.

## Important UX Principles

The discussion kept returning to these UX principles:

- workspace mode should preserve the familiar OpenSpec mental model where possible
- users should not need to understand target metadata before they can start planning
- repo visibility is not change commitment
- change creation should not be a transport mechanism just to attach repos
- workspace-specific behavior should not require duplicate skill families
- `/apply` should mean implement, not materialize planning files
- status should help agents know what to do next without hardcoding paths
- large changes should support breakdown into slices, but simple changes should stay simple

## Open Questions

- Should `openspec new change <id>` inside a workspace create only `.openspec.yaml`, or also seed minimal planning artifacts?
- Should `--targets` exist as an optional fast path, compatibility flag, or not at all?
- What structure should represent affected areas without overfitting to repo aliases?
- Should affected areas be derived from folders, metadata, artifact contents, or a combination?
- What is the smallest useful representation of a delivery slice?
- How should artifact schemas express which scopes an artifact type can attach to?
- How should `status --json` expose scoped artifact paths without becoming too large or unstable?
- Which workspace archive semantics are needed before archive skills become workspace-aware?
- How should `apply` select one area and expose allowed edit roots if `/apply` means implementation?
