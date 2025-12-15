# Workflow Engine PoC (Implementation)

This document defines a minimal proof-of-concept (PoC) workflow engine for OpenSpec.
It is intentionally **standalone**: an agent or engineer should be able to implement and verify the PoC using only the information in this file.

**Status:** Draft  
**Last Updated:** 2025-12-13

## Overview

We want a tiny system that helps AI agents (and humans) follow a structured workflow reliably across sessions.
The PoC focuses on the core fundamentals:

- A **file-backed state machine** (persisted on disk)
- A small set of **phases** with clear transition rules
- A minimal **task loop** with acceptance criteria
- A **status** command that rebuilds context at any time

This PoC intentionally trades completeness for speed of iteration.

## Definitions (PoC)

- **Change**: a unit of work being tracked (e.g., a feature or fix).
- **Phase**: the current stage of a Change.
- **Task**: a discrete unit of implementation work with acceptance criteria and a status.
- **State store**: the on-disk files under `.openspec/` used to persist Changes and Tasks.

## Goals (PoC)

- Validate that agents can follow a structured, phase-based workflow without skipping steps.
- Validate that output quality does not degrade under explicit structure (phases + tasks + acceptance criteria).
- Prove that workflow state can be persisted and reliably re-loaded across sessions.
- Keep iteration loops fast: start with 1 command and add more only if needed.

## Non-Goals (PoC)

- Multi-repo support and any external/global config store (e.g., `~/.config/openspec`).
- Git hooks, auto-completion heuristics, or session tracking.
- Rich artifact templating, schemas beyond minimal validation, or approval gates beyond phase/task checks.
- Multiple workflow definitions, workflow pinning/snapshots, or registries.

## General Requirements

### Requirement: Minimal change FSM

The PoC SHALL model a **Change** as a finite state machine with exactly these phases:

- `plan` → `implement` → `done`

Phase transitions SHALL be explicit (represented in persisted state) and, when performed via `openspec phase advance`, SHALL be blocked when preconditions are not met.

#### Scenario: Create starts in `plan`

- **WHEN** `openspec change create <title>` is executed
- **THEN** the change SHALL be created with `currentPhaseId = "plan"`
- **AND** the created change SHALL become the active change

#### Scenario: Advance requires preconditions

- **WHEN** `openspec phase advance` is executed
- **THEN** the command SHALL validate the current phase preconditions
- **AND** if blocked, SHALL print actionable blocking reasons and exit non-zero

### Requirement: In-repo, file-based persistence

The PoC SHALL persist workflow state on disk in a human-readable, git-friendly format.

- State SHALL live under an in-repo `.openspec/` directory (PoC-only choice).
- State SHALL be sufficient to resume work after a new agent/session starts.

#### Expected state layout (PoC)

```
.openspec/
├── current                          # active change id (plain text)
└── changes/
    └── <change-id>/
        ├── meta.yaml                # change metadata + current phase
        └── tasks.yaml               # task list + statuses
```

`meta.yaml` SHOULD be minimal but sufficient to support `status`:

```yaml
schemaVersion: "poc-1"
id: add-rate-limiter
title: Add rate limiter
currentPhaseId: plan # plan | implement | done
createdAt: 2025-12-13T00:00:00Z
updatedAt: 2025-12-13T00:00:00Z
```

`tasks.yaml` SHOULD use the minimal task model defined below:

```yaml
schemaVersion: "poc-1"
tasks:
  - id: task-1
    title: Add rate limiter middleware
    acceptance_criteria:
      - Middleware file exists
      - Returns 429 on limit exceeded
    status: pending # pending | in_progress | complete | blocked
```

#### Scenario: Status restores context after restart

- **GIVEN** a change exists on disk
- **WHEN** `openspec status` is executed in a new session
- **THEN** it SHALL reconstruct the active change state from `.openspec/`
- **AND** it SHALL report the current phase, task progress, and the next recommended action

### Requirement: Minimal command surface for agents

The PoC SHALL prioritize iteration speed by starting with a **single-command** interface and only adding commands when needed to reduce friction or enforce correctness.

**Minimum interface (required for PoC)**
- `openspec status [--json]`

**Optional interface (add only if needed)**
- `openspec phase advance [--change <id>] [--to <phase>]` (enforce gating + explicit transitions)
- `openspec change create <title>` (scaffold state quickly)
- `openspec task complete <task-id> [--notes <text>]` (avoid manual edits to `tasks.yaml`)
- `openspec task next [--json]` (only if a dedicated task fetch is helpful; otherwise `status` can surface next task)

The PoC MAY provide ergonomic aliases (`openspec create`, `openspec advance`, `openspec complete`) but the canonical shape SHOULD remain aligned with RFC terminology (change/phase/task).

#### Scenario: One-command task loop

- **GIVEN** a change in `implement` with pending tasks
- **WHEN** an agent runs `openspec status`
- **THEN** the output SHALL include the next pending task (with acceptance criteria) and a single “Next action” line
- **AND** tasks MAY be marked complete either via `openspec task complete` (if implemented) or by editing the persisted task state directly

### Requirement: Explicit phase gating rules

The PoC SHALL enforce minimal gating rules:

- `plan` → `implement` requires a tasks artifact to exist and be valid enough for execution.
- `implement` → `done` requires all tasks to be complete.
- The system SHALL NOT auto-advance phases implicitly when the last task is completed; advancing remains an explicit action (`openspec phase advance`) so agent behavior is observable.

### Requirement: Minimal task model

The PoC SHALL use a minimal task representation suitable for task execution:

- Each task SHALL have: `id`, `title`, `acceptance_criteria`, `status`.
- `status` SHALL be one of: `pending | in_progress | complete | blocked`.

The PoC SHOULD avoid introducing additional required fields (e.g., `codeReferences`, `dependencies`) until after the PoC validates the approach.

#### Scenario: Plan validation blocks empty task sets

- **WHEN** attempting to advance from `plan` to `implement`
- **AND** there are zero tasks or any task is missing `acceptance_criteria`
- **THEN** `openspec phase advance` SHALL fail with a clear reason (e.g., “No executable tasks found”)

### Requirement: Deterministic, agent-friendly outputs

The PoC SHALL prioritize deterministic outputs that are easy for agents/tools to consume.

- `openspec status --json` SHALL output a machine-readable summary of current state and blockers.
- If `openspec task next` is implemented, `openspec task next --json` SHOULD output machine-readable task details.
- Human-readable output SHOULD include a single “Next action” line.

### Requirement: Offline operation

The PoC SHALL not require network access and SHALL not depend on external services.

### Requirement: Future-proofing without overbuilding

The PoC SHOULD keep naming and conceptual alignment with the RFC terminology (change/phase/task),
to minimize later migration cost to the full workflow engine architecture.

## Task Breakdown (Graduated Milestones)

These milestones are optimized for iteration speed. Start at Milestone 1, then only proceed to Milestone 2/3 if you observe concrete friction or correctness issues.

### Milestone 1 (Minimum): 1-command PoC (`openspec status`)

**Deliverable**
- Implement `openspec status` that:
  - Loads `.openspec/` state (or reports a clear empty state)
  - Reports: active change id, current phase, task progress, next pending task, and phase blockers
  - Prints a single “Next action” line
  - Optionally supports `--json` for deterministic consumption
- No other commands are required at this stage; state can be seeded/edited manually.

**Verify**
- `openspec status` (no state) prints a clear empty state and a recommended next action.
- Seed a minimal `.openspec/` change on disk and confirm `openspec status`:
  - Reconstructs phase/task state after restarting the process
  - Updates correctly when tasks are marked complete or phase changes are edited in files

**When to proceed**
- Proceed to Milestone 2 only if agents routinely “skip gates” or lose phase discipline (you need enforcement), or if you want to measure command-driven behavior explicitly.

### Milestone 2 (Optional): Add enforcement (`openspec phase advance`)

**Deliverable**
- Add `openspec phase advance` that:
  - Validates phase preconditions and prints clear blocking reasons
  - Updates `meta.yaml` to move `plan → implement → done`
  - Does not auto-advance phases when the last task completes (explicit `advance` required)

**Verify**
- Attempt `plan → implement` with missing/invalid tasks and confirm it is blocked with specific reasons.
- Mark all tasks complete (by editing files) and confirm `implement → done` is blocked until all are complete, then succeeds.

**When to proceed**
- Proceed to Milestone 3 only if manual seeding/editing of `.openspec/` state is slowing iteration or causing frequent mistakes.

### Milestone 3 (Optional): Add scaffolding (`openspec change create`) — “3 command” PoC

**Deliverable**
- Add `openspec change create <title>` that:
  - Creates a change id (slug) and seeds `.openspec/changes/<id>/meta.yaml` + `tasks.yaml`
  - Sets the active change (`.openspec/current`)
  - Starts in `plan`

**Verify**
- Run: `openspec change create "Test change"` then `openspec status` and confirm phase/task state is visible.
- Confirm `openspec phase advance` continues to work for the created change.

### Milestone 4 (Optional): Reduce manual edits (`openspec task complete`) (+ optional `task next`)

**Deliverable**
- Add `openspec task complete <task-id>` to update task state safely (avoid YAML footguns).
- Only add `openspec task next` if it materially improves agent behavior vs surfacing the next task in `status`.

**Verify**
- In `implement`, run: `openspec status` → implement → `openspec task complete <id>` and confirm progress updates.

### Milestone 5 (Hardening): Deterministic JSON + smoke tests

**Deliverable**
- Stabilize `openspec status --json` output shape and add a small, fast end-to-end test suite for:
  - empty state
  - plan gating blocked/unblocked (if `phase advance` exists)
  - implement → done gating (if `phase advance` exists)
- If `task next` exists, add a shape test for `openspec task next --json`.

**Verify**
- Run tests locally and confirm the PoC scenarios pass consistently.

### Optional Milestone: Manifest-first resumption

Only add this if you need to validate IDE-agent integration early.

**Deliverable**
- Generate/update `.openspec-context.json` (or equivalent) on `status` so an IDE agent can resume with minimal CLI usage.

**Verify**
- Delete chat context / restart agent session; confirm reading the manifest + running `openspec status` is sufficient to resume.

## Optional References (not required to implement this PoC)

- `rfcs/WORKFLOW_ENGINE.md` (full workflow engine vision: artifacts, tasks, gates, sync)
- `rfcs/0002-implementation-breakdown.md` (domain/component breakdown)
- `rfcs/0003-implementation-roadmap.md` (phased rollout plan)
