# Workspace UX Simplification

## Purpose

This document focuses on one UX goal:

> OpenSpec should have one default path, one escalation path, and fewer explicit concepts shown to the user unless the system actually needs a decision from them.

This is a follow-up to `workspace-user-journeys.md`. That document is useful for completeness, but it exposes too much of the conceptual model too early.

This document is about how the product should **feel**.

---

## The UX Problem

The current user-journey exploration is coherent, but it is too heavy at first contact.

The main issues are:

1. Too many concepts appear before the user has done anything:
   - scope
   - project
   - owning root
   - shared contract owner
   - coordination workspace
   - initiative sponsor
   - shared manifest vs local overlay

2. Cross-root work feels like a workflow restart:
   - user starts in one repo
   - OpenSpec says this is multi-repo
   - user creates a workspace
   - user reopens the agent there
   - user effectively starts again

3. Shared contract decisions are asked too explicitly and too early.

4. Team-scale coordination is conceptually right, but reads more like infra setup than a lightweight workflow.

The system is internally clean, but the product experience should be more progressive.

---

## Design Goal

The user should feel:

- "I just start where I am"
- "OpenSpec figures out whether this stays local or needs to expand"
- "If it expands, it carries me forward instead of making me restart"
- "I only see advanced concepts when OpenSpec needs a real decision from me"

---

## The Core UX Shape

### One default path

The default path should always be:

1. Enter a repo or monorepo root
2. Run `/opsx:explore` or `/opsx:propose`
3. OpenSpec plans locally unless it has a strong reason not to

This should work for:

- single repo
- normal monorepo work
- many users in many situations

The default assumption should be:

> This is a local change until proven otherwise.

### One escalation path

The only escalation path should be:

> This work spans multiple owned areas strongly enough that OpenSpec needs to upgrade it into a coordinated initiative.

That escalation may happen for:

- large monorepo cross-team work
- true multi-repo work
- creation of a shared cross-boundary contract

The important UX point is that these should all feel like the same escalation:

- "OpenSpec is upgrading this into a coordinated initiative"

Not:

- one flow for multi-repo
- another flow for large monorepos
- another flow for shared contracts

---

## Progressive Disclosure

Users should not have to understand the full data model up front.

### Concepts users should see by default

At the start, users should mostly see:

- change
- affected area
- maybe repo if relevant

That is enough for the first planning step.

### Concepts OpenSpec should keep implicit until needed

These should usually stay hidden until escalation:

- scope
- coordination workspace
- initiative
- shared contract owner
- sponsor/driver
- manifest vs local overlay

### Concepts OpenSpec should only show when a real decision is needed

Show these only at the point of action:

- "This spans multiple repos. Create a coordinated initiative?"
- "This looks like shared behavior. Where should the canonical contract live?"
- "This initiative is team-shared. Do you want to commit it in a shared coordination repo?"

The system should not front-load these concepts as theory.

---

## The Simplest User Story

This is the baseline story the UX should optimize for.

### Story

The user is in a repo and types:

```text
/opsx:propose add-3ds
```

OpenSpec should:

1. inspect local context
2. infer likely affected areas
3. ask for confirmation only if needed
4. continue immediately

The user should feel like they are doing one thing:

```text
I am proposing a change.
```

Not:

```text
I am selecting between multiple planning abstractions.
```

---

## The Escalation Story

If OpenSpec realizes the work is no longer local, it should escalate in one motion.

### Desired feel

```text
This change affects multiple owned areas.
I can upgrade it into a coordinated initiative and carry your current planning context forward.
```

That wording matters.

It should feel like:

- an upgrade
- a continuation
- a convenience

It should not feel like:

- an error
- a hard stop
- a separate setup workflow

### What should happen during escalation

If escalation is needed, OpenSpec should do as much as possible automatically:

1. carry forward the current change name / description
2. preserve the already inferred affected areas
3. create the coordination artifact
4. resolve any local roots it can
5. generate agent instructions
6. then tell the user the next step

### Example escalation UX

```text
This work spans multiple owned areas:
- contracts
- billing-service
- web-client
- ios-client

OpenSpec can upgrade this into a coordinated initiative.

Suggested next step:
- create a coordination workspace at ~/work/openspec-workspaces/add-3ds

I’ll carry forward:
- your current change description
- affected repos
- any planning notes already gathered
```

This is much better than making the user feel they must restart.

---

## The Minimum Decision Set

When OpenSpec has to ask questions, it should ask the smallest useful set.

### Decision 1: Is this local or coordinated?

Most important product question.

User-facing form:

```text
This appears to span multiple owned areas.

How should I proceed?
- Keep this as one local change
- Upgrade to a coordinated initiative
```

This should be used sparingly and only when ambiguity matters.

### Decision 2: What areas are affected?

User-facing form:

```text
Which areas are affected?
```

This is much more intuitive than asking users about "scopes" first.

Internally this is scope selection, but the user does not need that term unless advanced users want it.

### Decision 3: Is this shared behavior?

Only ask if OpenSpec has strong evidence of a cross-boundary contract.

User-facing form:

```text
This looks like behavior that multiple areas need to follow.

Should I treat this as:
- local changes only
- a shared contract
- draft coordination notes for now
```

### Decision 4: Where should shared ownership live?

Only ask if the user confirms shared contract behavior and no obvious existing owner exists.

User-facing form:

```text
Where should the canonical shared contract live?
```

This should appear late, not early.

---

## Recommended Terminology

The internal model may use many precise terms. The UI should use simpler terms.

### Prefer in user-facing UX

- "area" instead of "scope" by default
- "coordinated initiative" instead of "workspace model"
- "shared contract" instead of "cross-boundary canonical spec"
- "owner" instead of "owning root"
- "team-shared initiative" instead of "shared coordination manifest"

### Reserve for advanced UX or docs

- scope
- project root
- local overlay
- sponsor/driver
- coordination workspace

These terms are useful, but not ideal as the first thing users must absorb.

---

## Recommended Default Behavior

To keep the UX intuitive, OpenSpec should aggressively choose defaults.

### Default 1: Stay local

Unless there is strong evidence otherwise, planning stays in the current root.

### Default 2: Infer affected areas

OpenSpec should infer affected areas from:

- request wording
- current repo
- known spec layout
- recent initiative context

Ask the user only when there is meaningful ambiguity.

### Default 3: Reuse existing shared owners

If an existing shared contract owner already exists, OpenSpec should suggest it instead of asking an abstract ownership question.

### Default 4: Treat unresolved roots as partial, not fatal

For coordinated initiatives, unresolved repos should not block planning unless the user explicitly needs implementation there now.

### Default 5: Team-shared only when collaboration is real

Do not force team/shared setup for solo or exploratory work.

OpenSpec can start with a local coordination workspace and later offer:

```text
This now looks collaborative. Do you want to move it into a shared coordination repo?
```

---

## How To Make Team UX Feel Light

The team story should not feel like an admin ceremony.

### Desired team experience

1. One person starts planning normally
2. OpenSpec upgrades to a coordinated initiative if needed
3. When the work becomes collaborative, OpenSpec offers to make it team-shared
4. Teammates clone the initiative repo and run one linking command
5. Everyone starts from the same shared initiative context

### Team onboarding should feel like this

```text
Clone the initiative repo.
Run `openspec workspace doctor`.
Open your agent here.
```

Not like this:

```text
Learn a new planning model, understand manifests, configure overlays, and attach roots manually.
```

The implementation may require those concepts, but the UX should compress them into a few actions.

---

## UX Heuristics For Prompting

OpenSpec should avoid asking users to classify work in abstract ways if it can infer a reasonable default.

### Good prompt

```text
This affects:
- web checkout
- billing API
- shared checkout behavior

I think this should become a coordinated initiative.
Proceed?
```

Why this is good:

- concrete
- recommendation included
- low cognitive load

### Weaker prompt

```text
Would you like to create a coordination workspace with linked changes and shared ownership metadata?
```

Why this is weaker:

- too much internal machinery exposed
- user has to parse product architecture before saying yes

### Good ownership prompt

```text
I found an existing shared contracts area: `contracts/checkout`.
Use that as the canonical owner?
```

### Weaker ownership prompt

```text
Choose a canonical shared contract owner for this cross-boundary behavior.
```

The latter is precise, but too abstract unless the user is already deep in the workflow.

---

## The Experience We Should Aim For

By default, OpenSpec should feel like:

- "Start here"
- "Describe the work"
- "I’ll handle the shape unless I need your judgment"

When the system escalates, it should feel like:

- "This got bigger than one local change"
- "I’ve prepared the coordinated setup for you"
- "Here is the next obvious step"

When collaboration expands, it should feel like:

- "This is now team-shared"
- "Commit the stable plan"
- "Everyone links their own local clones"

The user should not feel like they are constantly switching conceptual frameworks.

---

## Recommended Follow-Up Changes To The Journeys

To make `workspace-user-journeys.md` simpler and more intuitive, the next revision should:

1. Move the simplest single-repo and monorepo journey to the top.
2. Move most terminology and internal model sections later or into an appendix.
3. Reframe "coordination workspace" as an escalation artifact, not a starting abstraction.
4. Replace many uses of "scope" with "area" in user-facing examples.
5. Convert abstract ownership questions into recommendation-first prompts.
6. Compress the team-scale setup into one simple story:
   - shared initiative repo
   - local link command
   - open agent here
7. Make the escalation flow explicitly preserve user context so it reads as continuation, not restart.

---

## Summary

The current workspace thinking is directionally right, but the UX should become much more opinionated and much less explanatory up front.

The simplest product shape is:

- one default path: local planning from where the user already is
- one escalation path: upgrade into a coordinated initiative when needed
- progressive disclosure: only show advanced concepts when OpenSpec needs a real decision

If OpenSpec does this well, the same system can feel intuitive for:

- solo users
- small teams
- large monorepos
- multi-repo teams
- cross-team initiatives
