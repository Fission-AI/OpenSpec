# spec-driven

> The default workflow's artifacts: their order, their formats, and the change folder they produce.

`spec-driven` is OpenSpec's built-in default schema; [schema.yaml](../schema-yaml.md) defines the fields it sets.

## Artifacts

The workflow drafts four artifacts:

| Artifact | File | Purpose |
|---|---|---|
| [`proposal`](#proposalmd) | `proposal.md` | Why the change is needed |
| [`specs`](#delta-specs-specmd) | `specs/<capability-path>/spec.md`, one per capability | What behavior changes |
| [`design`](#designmd) | `design.md` | How to build it |
| [`tasks`](#tasksmd) | `tasks.md` | The implementation checklist |

## Drafting order

```text
             ┌─ specs ──┐
proposal ────┤          ├── tasks ── apply
             └─ design ─┘
```

Proposal comes first. Specs and design follow in either order, and tasks needs both. Implementation ([apply](#apply)) starts once `tasks.md` is in place.

Two artifacts can be skipped:

- **`design`**: when none of [its conditions](#designmd) apply, the agent leaves it out and drafts `tasks` anyway.
- **`specs`**: set [`skip_specs: true`](../../configuration/change-metadata.md#skip_specs) in the change's `.openspec.yaml`.

## Example change folder

A change named `add-user-auth`, with every artifact drafted:

```text
openspec/changes/add-user-auth/
├── .openspec.yaml      change metadata, written when the change is created
├── proposal.md
├── specs/
│   └── user-auth/
│       └── spec.md     one delta spec per capability
├── design.md
└── tasks.md
```

## proposal.md

Establishes why the change is needed.

### Structure

The template the agent receives as the output format ([templates/proposal.md](https://github.com/Fission-AI/OpenSpec/blob/main/schemas/spec-driven/templates/proposal.md)):

```md
## Why

<!-- Explain the motivation for this change. What problem does this solve? Why now? -->

## What Changes

<!-- Describe what will change. Be specific about new capabilities, modifications, or removals. -->

## Capabilities

### New Capabilities
<!-- Capabilities being introduced. Use kebab-case for path segments you introduce
     (e.g., user-auth or identity/user-auth) that follow the project's existing
     spec organization. Each creates specs/<capability-path>/spec.md. -->
- `<capability-path>`: <brief description of what this capability covers>

### Modified Capabilities
<!-- Existing capabilities whose REQUIREMENTS are changing (not just implementation).
     Only list here if spec-level behavior changes. Each needs a delta spec file.
     Use the exact existing path under openspec/specs/. Leave empty if no requirement
     changes. A change with no capabilities at all (pure refactor, tooling, docs)
     must set `skip_specs: true` in its .openspec.yaml - openspec validate rejects
     a zero-delta change without that marker. Do not invent a requirement just to
     satisfy validation. -->
- `<existing-capability-path>`: <what requirement is changing>

## Impact

<!-- Affected code, APIs, dependencies, systems -->
```

### Instructions

The instruction sent to the agent when it drafts this artifact (from [schema.yaml](https://github.com/Fission-AI/OpenSpec/blob/main/schemas/spec-driven/schema.yaml)):

```md
Create the proposal document that establishes WHY this change is needed.

Sections:
- **Why**: 1-2 sentences on the problem or opportunity. What problem does this solve? Why now?
- **What Changes**: Bullet list of changes. Be specific about new capabilities, modifications, or removals. Mark breaking changes with **BREAKING**.
- **Capabilities**: Identify which specs will be created or modified:
  - **New Capabilities**: List capabilities being introduced. Each becomes a new `specs/<capability-path>/spec.md`. Use kebab-case for path segments you introduce (e.g., `user-auth` or `identity/user-auth`) and follow the project's existing spec organization.
  - **Modified Capabilities**: List existing capabilities whose REQUIREMENTS are changing. Only include if spec-level behavior changes (not just implementation details). Each needs a delta spec file. Use the exact existing path under `openspec/specs/`. Leave empty if no requirement changes.
- **Impact**: Affected code, APIs, dependencies, or systems.

IMPORTANT: The Capabilities section is critical. It creates the contract between
proposal and specs phases. Research existing specs before filling this in.
Each capability listed here will need a corresponding spec file.

Every change must either declare at least one capability (new or
modified) or explicitly opt out of specs: `openspec validate` rejects a
change with zero deltas unless the change's `.openspec.yaml` sets
`skip_specs: true`. Use `skip_specs: true` only when no spec-level
behavior changes (pure refactor, tooling, docs) - specs describe
behavior, so if behavior does not change, no spec should change either.
Do not invent a requirement just to satisfy validation.

Keep it concise (1-2 pages). Focus on the "why" not the "how" -
implementation details belong in design.md.

This is the foundation - specs, design, and tasks all build on this.
```

## Delta specs (spec.md)

Defines what behavior changes: one delta spec per capability the proposal lists.

### Structure

The template the agent receives as the output format ([templates/spec.md](https://github.com/Fission-AI/OpenSpec/blob/main/schemas/spec-driven/templates/spec.md)):

```md
## Purpose
<!-- New capabilities only: one or two sentences (50+ characters) on what this capability is for. Delete this section for an existing capability. -->

## ADDED Requirements

### Requirement: <!-- requirement name -->
<!-- requirement text -->

#### Scenario: <!-- scenario name -->
- **WHEN** <!-- condition -->
- **THEN** <!-- expected outcome -->
```

### Instructions

The instruction sent to the agent when it drafts this artifact (from [schema.yaml](https://github.com/Fission-AI/OpenSpec/blob/main/schemas/spec-driven/schema.yaml)):

````md
Create specification files that define WHAT the system should do.

A spec is a behavior contract, not an implementation plan.

Good spec content:
- Observable behavior users or downstream systems rely on
- Inputs, outputs, and error conditions
- External constraints (security, privacy, reliability, compatibility)
- Scenarios that can be tested or explicitly validated

Avoid in specs:
- Internal class/function names
- Library or framework choices
- Step-by-step implementation details
- Detailed execution plans (those belong in design.md or tasks.md)

Quick test: if the implementation can change without changing externally
visible behavior, it likely does not belong in the spec.

Create one spec file per capability listed in the proposal's Capabilities section.
`<capability-path>` is the spec directory relative to `specs/` (for example,
`user-auth` or `identity/user-auth`). Preserve the full path:
- New capabilities: use the exact path from the proposal at `specs/<capability-path>/spec.md`. Any path segment newly introduced in the proposal must be kebab-case. Follow the project's existing organization; do not add a new domain level when the project uses a flat layout.
- Modified capabilities: use the exact existing path from `openspec/specs/<capability-path>/` when creating the delta at `specs/<capability-path>/spec.md`. Do not move or rename the capability.

There must be at least one spec file unless the change's `.openspec.yaml`
sets `skip_specs: true` (no spec-level behavior change) - `openspec validate`
rejects a zero-delta change without that marker. If the proposal lists no
capabilities and `skip_specs` is not set, revisit the proposal first.

Delta operations (use ## headers):
- **ADDED Requirements**: New capabilities
- **MODIFIED Requirements**: Changed behavior - MUST include full updated content
- **REMOVED Requirements**: Deprecated features - MUST include **Reason** and **Migration**
- **RENAMED Requirements**: Name changes only - use FROM:/TO: format

Format requirements:
- Each requirement: `### Requirement: <name>` followed by description
- Use SHALL/MUST for normative requirements (avoid should/may)
- Each scenario: `#### Scenario: <name>` with WHEN/THEN format
- **CRITICAL**: Scenarios MUST use exactly 4 hashtags (`####`). Using 3 hashtags or bullets will fail silently.
- Every requirement MUST have at least one scenario.

New capabilities only: start the delta spec with a `## Purpose` section -
one or two sentences (50+ characters, or `openspec validate --strict`
reports it as too brief) describing what the capability is for. Archive
copies it into the main spec it creates; without it the new main spec is
left with a `TBD ... Update Purpose after archive` placeholder to fill in
by hand. Do NOT add `## Purpose` to a delta for an existing capability -
that spec already has one and the delta's is ignored. To change an
existing capability's Purpose - including a leftover `TBD` placeholder -
edit `openspec/specs/<capability-path>/spec.md` directly.

MODIFIED requirements workflow:
1. Locate the existing requirement in openspec/specs/<capability-path>/spec.md
2. Copy the ENTIRE requirement block (from `### Requirement:` through all scenarios)
3. Paste under `## MODIFIED Requirements` and edit to reflect new behavior
4. Ensure header text matches exactly (whitespace-insensitive)

Common pitfall: Using MODIFIED with partial content loses detail at archive time.
If adding new concerns without changing existing behavior, use ADDED instead.

Example (a new capability, so it opens with `## Purpose`):
```
## Purpose

Lets users take their data out of the product in a portable format.

## ADDED Requirements

### Requirement: User can export data
The system SHALL allow users to export their data in CSV format.

#### Scenario: Successful export
- **WHEN** user clicks "Export" button
- **THEN** system downloads a CSV file with all user data

## REMOVED Requirements

### Requirement: Legacy export
**Reason**: Replaced by new export system
**Migration**: Use new export endpoint at /api/v2/export
```

Specs should be testable - each scenario is a potential test case.
````

## design.md

Explains how to implement the change; drafted only when the change needs one.

### Structure

The template the agent receives as the output format ([templates/design.md](https://github.com/Fission-AI/OpenSpec/blob/main/schemas/spec-driven/templates/design.md)):

```md
## Context

<!-- Current state and constraints that shape the approach. See proposal.md for motivation - don't restate it -->

## Goals / Non-Goals

**Goals:**
<!-- What this design aims to achieve -->

**Non-Goals:**
<!-- What is explicitly out of scope -->

## Decisions

<!-- Key design decisions with rationale and alternatives considered -->

## Risks / Trade-offs

<!-- Known risks and trade-offs -->
```

### Instructions

The instruction sent to the agent when it drafts this artifact (from [schema.yaml](https://github.com/Fission-AI/OpenSpec/blob/main/schemas/spec-driven/schema.yaml)):

```md
Create the design document that explains HOW to implement the change.

When to include design.md (create only if any apply):
- Cross-cutting change (multiple services/modules) or new architectural pattern
- New external dependency or significant data model changes
- Security, performance, or migration complexity
- Ambiguity that benefits from technical decisions before coding

Sections:
- **Context**: Only the current state and constraints needed to explain the approach. Reference the proposal for motivation instead of restating it (e.g., "See proposal.md - Why").
- **Goals / Non-Goals**: What this design achieves and explicitly excludes. Don't restate the proposal's scope - add only design-level boundaries.
- **Decisions**: Key technical choices with rationale (why X over Y?). Include alternatives considered for each decision.
- **Risks / Trade-offs**: Known limitations, things that could go wrong. Format: [Risk] → Mitigation
- **Migration Plan**: Steps to deploy, rollback strategy (if applicable)
- **Open Questions**: Unknowns that can safely be answered later without
  changing the specs, the approach, or the task breakdown. Omit if none.

Open questions are for genuinely deferrable unknowns, not decisions you
skipped. If a question would change the specs, the chosen approach, or
the task breakdown, resolve it now - ask the user instead of guessing.

Focus on architecture and approach, not line-by-line implementation.
The proposal covers why and what; design covers how. Reference the
proposal for motivation and, once written, the specs for requirements -
if a section would only restate them, point to them instead.

Good design docs explain the "why" behind technical decisions.
```

## tasks.md

Breaks the implementation into checkable tasks; [apply](#apply) tracks progress here.

### Structure

The template the agent receives as the output format ([templates/tasks.md](https://github.com/Fission-AI/OpenSpec/blob/main/schemas/spec-driven/templates/tasks.md)):

```md
## 1. <!-- Task Group Name -->

- [ ] 1.1 <!-- Task description -->
- [ ] 1.2 <!-- Task description -->

## 2. <!-- Task Group Name -->

- [ ] 2.1 <!-- Task description -->
- [ ] 2.2 <!-- Task description -->
```

### Instructions

The instruction sent to the agent when it drafts this artifact (from [schema.yaml](https://github.com/Fission-AI/OpenSpec/blob/main/schemas/spec-driven/schema.yaml)):

````md
Create the task list that breaks down the implementation work.

Before writing tasks, check design.md for Open Questions. If any of them
would change what gets built, resolve them with the user first - do not
bake an unstated assumption into the task list.

**IMPORTANT: Follow the template below exactly.** The apply phase parses
checkbox format to track progress. Tasks not using `- [ ]` won't be tracked.

Guidelines:
- Group related tasks under ## numbered headings
- Each task MUST be a checkbox: `- [ ] X.Y Task description`
- Tasks should be small enough to complete in one session
- Order tasks by dependency (what must be done first?)

Example:
```
## 1. Setup

- [ ] 1.1 Create new module structure
- [ ] 1.2 Add dependencies to package.json

## 2. Core Implementation

- [ ] 2.1 Implement data export function
- [ ] 2.2 Add CSV formatting utilities
```

Reference specs for what needs to be built, design for how to build it.
Each task should be verifiable - you know when it's done.
````

## Apply

The handoff from planning to implementation. Apply isn't an artifact; it's the phase that works through `tasks.md`.

- **Starts**: once `tasks.md` exists and lists at least one task.
- **Tracks**: the checkboxes in `tasks.md`; checking them off is the progress record.
- **Ends**: every checkbox checked; OpenSpec then suggests archiving the change.

### Settings

The apply settings (from [schema.yaml](https://github.com/Fission-AI/OpenSpec/blob/main/schemas/spec-driven/schema.yaml)):

```yaml
apply:
  requires: [tasks]
  tracks: tasks.md
  # instruction: shown below
```

### Instructions

The instruction sent to the agent when implementation starts (from [schema.yaml](https://github.com/Fission-AI/OpenSpec/blob/main/schemas/spec-driven/schema.yaml)):

```md
Read context files, work through pending tasks, mark complete as you go.
Pause if you hit blockers or need clarification.
```

## schema.yaml

The complete [schema.yaml](https://github.com/Fission-AI/OpenSpec/blob/main/schemas/spec-driven/schema.yaml), with instruction bodies elided; each is shown in full in its section above.

```yaml
name: spec-driven
version: 1
description: Default OpenSpec workflow - proposal → specs → design → tasks
artifacts:
  - id: proposal
    generates: proposal.md
    description: Initial proposal document outlining the change
    template: proposal.md
    # instruction: shown in full under proposal.md above
    requires: []

  - id: specs
    generates: "specs/**/*.md"
    description: Detailed specifications for the change
    template: spec.md
    # instruction: shown in full under Delta specs above
    requires:
      - proposal

  - id: design
    generates: design.md
    description: Technical design document with implementation details
    template: design.md
    # instruction: shown in full under design.md above
    requires:
      - proposal

  - id: tasks
    generates: tasks.md
    description: Implementation checklist with trackable tasks
    template: tasks.md
    # instruction: shown in full under tasks.md above
    requires:
      - specs
      - design

apply:
  requires: [tasks]
  tracks: tasks.md
  # instruction: shown in full under Apply above
```
