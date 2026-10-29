# Onboarding phases 4-8: planning the change

## Phase 4: Create the Change

**EXPLAIN:**
```
## Creating a Change

A "change" in OpenSpec is a container for all the thinking and planning around a piece of work. It lives at the `changeRoot` reported by `openspec status --change "<name>" --json` and holds your artifacts—proposal, specs, design, tasks.

Let me create one for our task.
```

**DO:** Create the change with a derived kebab-case name:
```bash
openspec new change "<derived-name>"
```

**SHOW:**
```
Created: <changeRoot from status JSON>

The folder structure:
```
<changeRoot>/
├── proposal.md    ← Why we're doing this (empty, we'll fill it)
├── design.md      ← How we'll build it (empty)
├── specs/         ← Detailed requirements (empty)
└── tasks.md       ← Implementation checklist (empty)
```

Now let's fill in the first artifact—the proposal.
```

---

## Phase 5: Proposal

**EXPLAIN:**
```
## The Proposal

The proposal captures **why** we're making this change and **what** it involves at a high level. It's the "elevator pitch" for the work.

I'll draft one based on our task.
```

**DO:** Draft the proposal content (don't save yet):

`<capability-path>` is the spec directory relative to `specs/` (for example,
`user-auth` or `identity/user-auth`). Use the exact existing path for modified
capabilities. For new capabilities, follow the project's established spec
organization.

```
Here's a draft proposal:

---

# Proposal

## Why

[1-2 sentences explaining the problem/opportunity]

## What Changes

[Bullet points of what will be different]

## Capabilities

### New Capabilities
- `<capability-path>`: [brief description]

### Modified Capabilities
<!-- If modifying existing behavior -->
- `<existing-capability-path>`: [brief description]

## Impact

- `src/path/to/file.ts`: [what changes]
- [other files if applicable]

---

Does this capture the intent? I can adjust before we save it.
```

**PAUSE** - Wait for user approval/feedback.

After approval, save the proposal:
```bash
openspec instructions proposal --change "<name>" --json
```
Then write the content to the `resolvedOutputPath` from `openspec instructions proposal --change "<name>" --json`.

```
Proposal saved. This is your "why" document—you can always come back and refine it as understanding evolves.

Next up: specs.
```

---

## Phase 6: Specs

**EXPLAIN:**
```
## Specs

Specs define **what** we're building in precise, testable terms. They use a requirement/scenario format that makes expected behavior crystal clear.

For a small task like this, we might only need one spec file.
```

**DO:** Resolve where the spec file should be created:
```bash
openspec instructions specs --change "<name>" --json
# Use resolvedOutputPath from the JSON. If it is a glob, choose the concrete file path using the schema instruction and the change's context.
```

Draft the spec content:

```
Here's the spec:

---

# Spec Delta

## ADDED Requirements

### Requirement: [<ID>] <Name>

<Description of what the system should do>

#### Scenario: [<ID>] <Scenario name>

- **WHEN** <trigger condition>
- **THEN** <expected outcome>
- **AND** <additional outcome if needed>

---

This format—WHEN/THEN/AND—makes requirements testable. You can literally read them as test cases. The ID at the start of each heading (like [AUTH-3] and [AUTH-3.1]) keeps links to it working if the name is reworded later.
```

Save to the concrete file path chosen from `resolvedOutputPath`.

---

## Phase 7: Design

**EXPLAIN:**
```
## Design

The design captures **how** we'll build it—technical decisions, tradeoffs, approach.

For small changes, this might be brief. That's fine—not every change needs deep design discussion.
```

**DO:** Draft design.md:

```
Here's the design:

---

# Design

## Context

[Brief context about the current state]

## Goals / Non-Goals

**Goals:**
- [What we're trying to achieve]

**Non-Goals:**
- [What's explicitly out of scope]

## Decisions

### D1

[The choice and why, in one or two sentences]

---

For a small task, this captures the key decisions without over-engineering.
```

Save to the `resolvedOutputPath` from `openspec instructions design --change "<name>" --json`.

---

## Phase 8: Tasks

**EXPLAIN:**
```
## Tasks

Finally, we break the work into implementation tasks—checkboxes that drive the apply phase.

These should be small, clear, and in logical order. Each group carries the tests and documentation for its own work - the last group is only for integration checks.
```

**DO:** Generate tasks based on specs and design:

```
Here are the implementation tasks:

---

# Tasks

## 1. [Category or file]

- [ ] 1.1 [Specific task] — verify: [test, command, observable behavior, or delivered artifact]
- [ ] 1.2 [Specific task] — verify: [test, command, observable behavior, or delivered artifact]

## 2. Integration Verification

- [ ] 2.1 Verify [broader integration or system behavior] with [end-to-end test or observable result]

---

Each checkbox becomes a unit of work in the apply phase. Does this task breakdown look right?
```

**PAUSE** - Wait for user approval/feedback.

After approval, save to the `resolvedOutputPath` from `openspec instructions tasks --change "<name>" --json`.

Then ask:
> "Tasks are saved. Ready to implement?"

**PAUSE** - Wait for user to confirm before implementation.
