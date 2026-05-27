## Why

Status: deferred by the context-store-and-initiatives direction. Generated
workspace guidance remains important, but the durable handoff should be designed
around initiatives linked to repo-local OpenSpec changes, not around a
workspace-owned cross-repo planning home.

The remaining sections preserve the original workspace-agent-guidance direction
for later reference. This work is still expected to matter after initiatives and
initiative-linked repo-local changes exist; it is not the immediate next focus.

OpenSpec workspaces let users create a planning home and link repos or folders
for cross-area exploration. After setup, the next user expectation is simple:

> I opened the workspace with my agent. The agent should understand where it is,
> what it can safely inspect, and how to help me turn a product goal into a
> workspace proposal.

Today that handoff is too thin. Workspace-local skills are installed, and the
CLI can create workspace-scoped changes, but agents still mostly behave like
they are in a normal repo-local OpenSpec project. They do not have a clear
workspace-native starting model before change creation.

That creates avoidable confusion:

- linked repos or folders may look like implementation targets instead of
  read-only planning context
- agents may not know which registered link names are valid affected areas
- users may feel pressured to know every affected area before planning starts
- the product goal can be lost between workspace exploration and change
  creation
- workspace planning can feel like a separate mode instead of normal OpenSpec
  stretched across linked areas

The principle this change should reinforce is:

> Workspace visibility is not change commitment.

Linked repos and folders are available for exploration. Creating a workspace
change captures a planning commitment. Implementation edits still require an
explicit implementation workflow with an allowed edit root.

## Goal

Make workspace-local planning skills give agents a small, reliable operating
model for starting workspace proposals.

An agent opened in a workspace should be able to:

1. recognize that it is operating from a workspace planning home
2. inspect registered workspace links as planning context
3. keep linked repos and folders read-only during planning
4. derive a concise workspace change name and product goal from the user request
5. pass known affected areas only when they match registered workspace link names
6. continue even when affected areas are unresolved, keeping those questions
   visible in the normal planning artifacts

This should feel to the user like the ordinary OpenSpec proposal flow, just with
workspace-aware context and safety.

## Starting Scope

Start with the smallest useful surface:

- workspace-local generated skill guidance
- change-starting workflows used from a workspace planning home
- the relationship between user product goals, registered link names, and
  workspace change metadata
- guardrails that keep planning separate from implementation edits

The first implementation should prefer clear agent guidance over new workflow
machinery. If the existing CLI already exposes enough workspace context, the
skills should use it. If it does not, we should identify the missing context
explicitly before adding heavier behavior.

## Non-Goals

This change does not need to solve the full workspace lifecycle.

Out of scope for this slice:

- workspace apply semantics
- workspace verify or archive semantics
- branch or worktree orchestration
- creating repo-local changes for each affected area
- shared/team coordination repo behavior
- canonical shared-contract ownership flows
- forcing users to finalize all affected areas before creating a proposal

## Questions To Work Through

- What exact workspace context should an agent read before creating a change?
- Is the existing workspace/status/doctor output enough, or do we need a clearer
  pre-change context command?
- How should generated skills decide when an affected area is confident enough
  to pass as `--areas`?
- Should `--goal` be workspace-only metadata, or should repo-local behavior be
  documented too?
- Where should unresolved affected-area questions appear so users and agents
  continue from the same source of truth?
