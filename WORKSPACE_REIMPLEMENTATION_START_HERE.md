# Workspace Reimplementation Start Here

This is the grep-friendly entry point for agents working on the workspace reimplementation.

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

Read these files in order:

1. `WORKSPACE_REIMPLEMENTATION_DIRECTION.md`
2. `openspec/changes/workspace-reimplementation-roadmap/README.md`
3. `openspec/changes/workspace-reimplementation-roadmap/POC_REFERENCE_GUIDE.md`
4. The proposal for the next implementation slice

The POC reference commit is:

```text
workspace-poc @ 79a45ac043f414e63d13e08b9da83b135cb20a39
```

Use the POC as research material. Do not merge it into an implementation branch. Do not preserve its architecture unless a slice proposal or design explicitly decides to do so.

## Implementation Order

Implement these flat OpenSpec changes in order:

1. `workspace-foundation`
2. `workspace-create-and-register-repos`
3. `workspace-open-agent-context`
4. `workspace-change-planning`
5. `workspace-apply-repo-slice`
6. `workspace-verify-and-archive`

`workspace-reimplementation-roadmap` is the continuity and reference container for the plan.

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

Capture durable findings in the relevant OpenSpec artifact so future sessions do not depend on chat history.
