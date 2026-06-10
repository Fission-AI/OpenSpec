## Why

Status: obsolete / pending deletion review.

This change is no longer active and should not be used as an implementation
queue. Current product authority lives in
`openspec/work/simplify-context-and-workspace-model/goal.md` and
`openspec/work/simplify-context-and-workspace-model/roadmap.md`.

Keep this artifact temporarily only to review whether it contains unique apply
or handoff evidence worth promoting, linking, or deliberately discarding before
deletion. Do not implement this as a first-class workspace lifecycle command.

The remaining sections preserve the original workspace apply direction for
historical review.

After a workspace proposal exists, users need a practical way to implement one repo slice at a time.

In the proper workspace model, apply means implementation:

```text
Take the selected workspace change.
Take the selected repo slice.
Open or use the right checkout.
Implement that slice while preserving the workspace plan.
```

It should not mean copying or materializing planning files into every repo as a user-facing workflow.

## What Changes

Add the repo-slice apply workflow for workspace changes:

- select a workspace change
- select one target repo alias
- resolve the local checkout for that alias
- provide the agent with the workspace plan and repo-specific implementation context
- track progress without making the workspace lose ownership of the plan

The workflow should support implementation across separate branches or sessions while keeping the workspace proposal as the continuity layer.

Planning dependency:

- Depends on `workspace-change-planning`.

## Capabilities

### New Capabilities

- `workspace-repo-slice-apply`: Applies one repo slice of a workspace change as an implementation workflow.

### Modified Capabilities

- `cli-artifact-workflow`: Defines workspace apply as implementation rather than materialization.
- `context-injection`: Supplies repo-specific implementation context from a workspace change.

## Impact

- Workspace apply command behavior.
- Agent handoff text for repo-slice implementation.
- Local checkout resolution and branch/worktree assumptions.
- Tests that apply operates on one target repo slice and does not require copying workspace planning artifacts as the primary user contract.
