# Workspace Reimplementation Start Here

This is the grep-friendly historical entry point for agents working on the
workspace reimplementation.

## Current Status

Status: obsolete / pending deletion review.

The original workspace lifecycle roadmap is no longer active. Fresh agents
should not use this document, the POC materials, or the flat workspace sibling
changes as an implementation queue.

Current product authority lives in:

1. `openspec/work/simplify-context-and-workspace-model/goal.md`
2. `openspec/work/simplify-context-and-workspace-model/roadmap.md`

This folder is kept temporarily only until any unique historical evidence is
promoted, linked, or deliberately discarded. The old context-store initiative is
transition evidence / beta history, not current authority.

The old beta boundary was:

```text
Context stores sync truth.
Collections shape truth.
Initiatives coordinate work.
Workspaces open local views.
Changes implement repo-owned slices.
```

Useful search terms:

```text
workspace reimplementation
workspace poc
workspace-poc
workspace reference guide
workspace roadmap
fresh agent
start here
```

## Start Here

If you are reviewing this artifact before deletion, read these files in order:

1. `openspec/work/simplify-context-and-workspace-model/goal.md`
2. `openspec/work/simplify-context-and-workspace-model/roadmap.md`
3. `openspec/changes/workspace-reimplementation-roadmap/HISTORICAL_DIRECTION.md`
4. `openspec/changes/workspace-reimplementation-roadmap/README.md`
5. `openspec/changes/workspace-reimplementation-roadmap/POC_REFERENCE_GUIDE.md`

The POC reference commit is:

```text
workspace-poc @ 79a45ac043f414e63d13e08b9da83b135cb20a39
```

Use the POC as research material. Do not merge it into an implementation branch.
Do not preserve its architecture unless a later initiative or repo-local change
design explicitly decides to do so.

## Historical Implementation Order

The original flat OpenSpec order was:

1. `workspace-foundation`
2. `workspace-create-and-register-repos`
3. `workspace-open-agent-context`
4. `workspace-change-planning`
5. `workspace-agent-guidance`
6. `workspace-apply-repo-slice`
7. `workspace-verify-and-archive`

Current disposition:

- Do not implement this roadmap.
- Keep only long enough to review whether the POC or historical notes contain
  unique evidence worth preserving elsewhere.
- Treat workspace planning as legacy or transitional beta behavior, not the
  durable cross-repo source of truth.
- Do not implement `workspace-apply-repo-slice` or
  `workspace-verify-and-archive` as first-class workspace lifecycle commands.

## Before Editing

For the slice you are about to implement, inspect the pinned POC commit using `POC_REFERENCE_GUIDE.md`, then write down:

```text
POC findings for <slice>:

User behavior to preserve:
- ...

Tests or examples worth translating:
- ...

Implementation shortcuts to avoid:
- ...

Open design questions:
- ...
```

Capture durable findings in the relevant initiative, context-store, or
repo-local OpenSpec artifact so future sessions do not depend on chat history.
