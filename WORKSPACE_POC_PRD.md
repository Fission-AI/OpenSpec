# Workspace POC PRD

- Status: Signed Off
- Date: 2026-04-17
- Audience: OpenSpec maintainers and future implementers
- Derived from: [WORKSPACE_POC_DECISION_RECORD.md](/Users/tabishbidiwale/fission/repos/openspec/WORKSPACE_POC_DECISION_RECORD.md)

## Summary

The Workspace POC gives OpenSpec a lightweight way to coordinate work that spans multiple repositories without forcing planning into a single repo or introducing a separate planning primitive for users to learn.

A workspace is a persistent coordination home. Inside it, users create feature-scoped changes, plan the work once, and then materialize repo-specific execution artifacts into the affected repos when implementation is ready to begin.

The POC is intentionally opinionated:

- planning is centralized in the workspace
- canonical specs remain in the owning repo
- repo-local execution remains repo-local
- the primary user-facing primitive stays `change`
- the existing `spec-driven` methodology is reused rather than forked into a separate workspace schema

This document describes what we are building for the POC. It does not try to break the work into implementation phases yet.

## Problem

OpenSpec currently behaves like a single-root tool:

- commands assume one local root
- changes are authored locally under one repo
- specs and delta specs are resolved locally
- `apply` and `archive` are repo-local lifecycle steps

That works for normal single-repo use, but it breaks down when one feature spans multiple services, clients, or owner repos.

Users need one place to:

- write a single proposal and design
- see the full cross-repo change
- assign and track repo-specific work
- reason about shared behavior across repos

At the same time, repos still need to remain the source of truth for:

- canonical specs
- implementation work
- review and shipping
- archive semantics

The product problem is to provide centralized planning without collapsing repo ownership.

## Who This Is For

The POC is aimed at users coordinating cross-boundary work, including:

- an engineer changing behavior across multiple repos
- a lead or staff engineer coordinating a feature across teams
- a team that needs one planning surface but still executes in separate repos

## When Users Reach For Workspace

Users should reach for a workspace when repo-local OpenSpec stops being an honest representation of the work.

Typical trigger situations:

- one feature spans two or more repos
- the canonical spec owner is different from one or more implementation repos
- different repos or teams need to move on different cadences
- one person needs to coordinate work that will later be handed off to several repo owners
- the user needs one place to pause and resume a cross-repo effort without reconstructing the full plan from scattered notes

## Jobs To Be Done

### Functional Jobs

Users hire the workspace POC to:

- start one cross-repo change from a neutral planning home
- identify which repos are affected
- author shared planning artifacts once
- break the work into repo-specific slices for execution
- materialize repo-local change artifacts when implementation should begin
- track overall progress without losing repo ownership boundaries
- resume a cross-repo change later and quickly understand what is planned, materialized, in progress, blocked, complete, or archived

### Social Jobs

Users also hire the workspace POC to:

- make the full cross-repo change legible to repo owners, reviewers, and leads
- hand off the right slice of work to each repo owner without duplicating planning docs
- show what is planned centrally versus what is already executing locally
- reduce coordination overhead that would otherwise live in Slack threads, meetings, and ad hoc documents

### Emotional Jobs

The workspace POC should help users feel confident that:

- there is one clear planning home for the overall change
- canonical repo ownership is preserved
- materialization will not create confusing dual authority
- they can tell what is authoritative at each step
- they can recover safely from interruption, partial rollout, or divergence between workspace drafts and repo-local execution

### Adoption And Operations Jobs

For teams using this repeatedly, the workspace POC should also support:

- a repeatable way to start cross-repo work
- a clear way to decide when to use workspace mode versus stay repo-local
- onboarding another engineer into an in-flight cross-repo change
- re-entering an existing workspace after time away
- adjusting targets and continuing even when some repos are not ready at the same time

## Product Goals

The Workspace POC should:

1. Provide a credible cross-repo coordination experience for real work.
2. Make the workspace a persistent coordination home rather than a disposable feature folder.
3. Keep planning centralized while preserving canonical spec ownership in repos.
4. Reuse the existing `change` primitive and `spec-driven` methodology.
5. Minimize disruption to existing repo-local OpenSpec workflows.
6. Support a simple, explicit CLI flow for creating workspaces, registering repos, opening a change, and materializing repo-local work.
7. Avoid leaking machine-specific repo paths into committed workspace state.

## Non-Goals

The POC does not attempt to solve the full long-term workspace model.

Out of scope:

- a fully multi-root-aware CLI across every command
- a new top-level `initiative` primitive
- a separate workspace-only methodology schema
- stable remote repo identifiers or shared project IDs
- automatic escalation from local work into a workspace
- a full sync engine between workspace drafts and repo-local changes
- final governance for shared-contract ownership
- arbitrary user-chosen workspace locations as the default v0 behavior

## Product Shape

### Workspace

A workspace is a persistent coordination root used for cross-repo planning.

For the POC:

- it lives in a managed location by default
- workspace metadata lives under `.openspec/`
- the workspace does not add an extra inner `openspec/` directory
- the workspace can contain many feature-scoped changes over time

### Workspace Change

A workspace change is the central planning object for one cross-repo feature or initiative-sized piece of work.

For the POC:

- users still think in terms of `change`
- a workspace change records its target repos explicitly
- proposal, design, coordination tasks, and per-target draft work live in the workspace until materialization

### Target Repos

Target repos are registered in the workspace by alias.

For the POC:

- stable repo aliases are stored in committed workspace metadata
- machine-specific absolute paths are stored only in a gitignored local overlay
- repo attachment should be change-scoped by default, not workspace-wide

### Repo-Local Changes

Repo-local changes are the execution artifacts created from a workspace change.

For the POC:

- a materialized repo-local change reuses the same change ID as the workspace change by default
- repo-local execution remains local to that repo
- repo-local archive remains local to that repo

## Core Principles

### Centralize The View, Not The Truth

The workspace is the shared planning surface. It is not the permanent home of canonical specs or repo execution state.

### Methodology And Topology Stay Separate

The POC reuses `spec-driven`. Workspace behavior is a topology concern, not a new methodology family.

### Planning First, Materialization Second

Users should be able to author the cross-repo plan in one place before copying the relevant slice into a repo for execution.

### Clear Authority Handoff

Before materialization, the workspace target slice is the planning truth for that repo.

After a successful `apply --change <id> --repo <alias>`, the repo-local change becomes the execution truth for that repo.

### Manual Completion At The Top Level

A workspace change becomes:

- soft-done when all known coordination work and tracked target work are complete
- hard-done only when the user manually archives the workspace change

## User Experience

The intended POC flow is:

1. A user creates a workspace using the normal OpenSpec setup path.
2. The user registers repo aliases against local repo paths.
3. The user creates a workspace change with explicit targets.
4. Planning happens centrally in the workspace:
   - proposal
   - design
   - coordination tasks
   - per-target draft tasks
   - per-target draft delta specs
5. When execution should begin in a repo, the user runs `openspec apply --change <id> --repo <alias>`.
6. OpenSpec materializes the selected repo’s local change using the same change ID.
7. Repo-local implementation and archive proceed in that repo.
8. The workspace continues to show overall coordination and completion state.

This is meant to feel like one change with multiple execution surfaces, not like separate unrelated changes stitched together manually.

## POC Command Surface

The minimum command shape for the POC is:

- `openspec workspace create <name>`
- `openspec workspace add-repo <alias> <path>`
- `openspec workspace doctor`
- `openspec new change <id> --targets <a,b,c>`
- `openspec workspace open --change <id> [--agent <tool>]`
- `openspec apply --change <id> --repo <alias>`

These commands are enough to support:

- persistent workspace creation
- repo registration and validation
- explicit targeted change creation
- change-scoped agent opening
- deterministic materialization into a target repo

## Agent Story

The POC should optimize for the cleanest demo path rather than promise identical behavior across all tools.

Current expectation:

- Claude Code is the headline multi-root demo path
- Codex is secondary if it remains straightforward
- Copilot is partial or manual support, not the primary story

Because agent multi-root write behavior is uneven, `openspec apply --change --repo` is the safest POC default for moving from planning into repo execution.

## Success Criteria

The POC is successful if users can:

- recognize when workspace mode is the right tool for the job
- create one canonical plan for a cross-repo change without forcing it into a dishonest home repo
- identify affected repos, owners, and next actions from one planning surface
- hand off repo-specific work cleanly without duplicating the same plan across multiple repos or side documents
- understand which work is planned, materialized, in progress, blocked, complete, and archived
- resume an interrupted cross-repo change without reconstructing context from Slack, PRs, or notes
- preserve canonical spec ownership in repos while still coordinating the overall effort centrally
- trust what is authoritative at each stage of the workflow
- avoid committing local absolute repo paths into shared state

## Open Questions

These are intentionally left open for roadmap and implementation planning:

- Should materialization be create-only at first, or support explicit refresh?
- If re-materialization exists, what can be overwritten and what must be preserved?
- How should workspace status roll up repo-local progress?
- Should repo-local changes keep a reverse link back to the workspace change?
- What is the minimum supported `workspace open --change` behavior in v0?
- How should shared contract drafts be promoted into canonical owner repos?

## Appendix: Working Mental Model

The POC is built around one simple idea:

> Plan centrally, execute locally, preserve repo ownership.

That is the product promise the roadmap should now flesh out.
