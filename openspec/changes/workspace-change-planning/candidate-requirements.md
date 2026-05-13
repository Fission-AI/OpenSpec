# Candidate Requirements

Date: 2026-05-11

Status: exploratory requirements notes. These capture requirements that emerged from discussion, but they are not yet finalized OpenSpec spec deltas.

## Requirement: Clear Workspace Planning Framing

Workspace change planning should be framed around helping users and agents plan work across linked repos or folders.

The user should understand:

- where to stand
- what the workspace can see
- where the plan will be captured
- when implementation begins

The feature should be described by the planning experience it enables, not primarily by the POC behavior it avoids.

## Requirement: Workspace As Planning Home

A workspace change should capture the shared plan for a cross-area effort.

The workspace should provide a planning home for:

- goals
- decisions
- coordination tasks
- affected areas
- cross-area risks and dependencies

Repo-local execution should begin only when the user or agent moves into an implementation workflow for a selected area.

## Requirement: Preserve The Familiar OpenSpec Workflow

Workspace mode should preserve the familiar OpenSpec workflow vocabulary.

Users should still be able to think in terms of:

- explore
- propose
- apply
- verify
- archive

Workspace context should change paths, scope, and allowed actions, not require a separate user-facing workflow family.

## Requirement: Avoid Workspace-Specific Skill Duplication

OpenSpec should not require separate workspace-specific versions of every workflow skill.

OpenSpec should maintain one conceptual workflow skill per workflow, such as:

- `openspec-propose`
- `openspec-explore`
- `openspec-apply-change`
- `openspec-verify-change`
- `openspec-archive-change`

Each workflow skill should discover whether it is operating in repo-local or workspace mode instead of being duplicated by mode.

Workspace-specific behavior should come from CLI-reported context, not from a parallel set of workspace-only skills.

## Requirement: Separate Agent Affordances From Workflow Semantics

OpenSpec workflow instructions should describe the OpenSpec product workflow.

Agent-specific instructions should describe how the current coding agent performs common actions, such as:

- asking the user questions
- tracking todos
- delegating to subagents
- attaching directories
- handling agent-specific session constraints

Workflow skills should reference or use an agent affordance layer instead of repeating agent-specific instructions in every workflow.

## Requirement: Status JSON Provides Agent Context

`openspec status --change <id> --json` should provide enough context for an agent to understand the current change and act safely.

Status JSON should tell the agent:

- whether the change is repo-local or workspace-scoped
- where the change artifacts live
- which artifact paths are relevant
- what should happen next
- which areas are affected or unresolved
- which edit roots are allowed for implementation
- whether the next action needs an area selection

Agents should not need to assume that changes always live under `openspec/changes/<id>/`.

## Requirement: Use Plain Action Language

OpenSpec should use simple terms for agent-facing action context.

Preferred terms:

- `nextSteps`: what should happen next
- `actionContext`: paths, areas, and constraints needed to act

Avoid exposing implementation-oriented terms such as "workflow affordances" in user-facing docs or JSON fields.

## Requirement: Apply Means Implement

`/apply` should start or continue implementation work for an already planned change.

In repo-local mode, `/apply` should:

- read the repo-local change artifacts
- identify pending implementation tasks
- implement the pending tasks in that repo
- update task progress as implementation work is completed

In workspace mode, `/apply` should:

- select or confirm one affected area when needed
- read the workspace planning context for that area
- identify the implementation root for that area
- implement only inside the allowed repo or folder
- update the relevant task progress as work is completed

If a workspace change has multiple affected areas and the user did not specify one, `/apply` should ask which area to implement.

## Requirement: Slice Means Delivery Increment

`slice` should refer to a delivery increment inside a larger change.

A slice should help users split a large effort into smaller planned parts that can be:

- designed
- implemented
- reviewed
- verified
- shipped

Repo or folder ownership should use a different term so delivery breakdown and ownership boundaries remain distinct.

## Requirement: Area Means Ownership Or Execution Boundary

`area` should describe where ownership or implementation happens.

Examples of areas:

- repo
- package
- folder
- service
- app
- docs site

A small workspace change may have several areas and one implicit slice.

A large workspace change may have several slices, and each slice may affect one or more areas.

OpenSpec should be able to report affected areas without forcing users to think of those areas as delivery slices.

## Requirement: Keep Unsettled Direction In Exploratory Notes

Open questions and unsettled direction should live in exploratory notes until they are ready to become proposal, design, or spec content.

`proposal.md` should be updated when the scope and intended behavior are clear enough to propose.

`design.md` should be created or updated when technical decisions are selected, not while the team is still comparing models.

## Requirement: Preserve Exploration Context

The workspace change planning exploration should preserve:

- key findings
- candidate requirements
- open questions
- candidate terminology
- POC lessons
- rejected or risky directions

Future work on `workspace-change-planning` should be able to use these notes without mistaking them for final requirements.
