# Proposed Initiative Next / Agent Handoff UX Evidence

## Source

This discussion item came from the GSD workspace comparison.

GSD's useful lesson was not its storage model. It was the simple user loop:
create context, move to the next concrete step, and keep the agent from guessing
where it is in the workflow.

OpenSpec should keep the current boundary:

```text
Context stores sync truth.
Initiatives coordinate work.
Workspaces open local views.
Changes implement repo-owned slices.
```

The possible gap is that `initiative show`, repo-local change linking, and
workspace opening may still require an agent to stitch together the next action
by hand.

## Current Recommendation

Keep this as a discussion draft until workspace initiative opening is clearer.
If accepted, the first version should be a small handoff/readiness command, not
status, progress, dashboarding, or workspace orchestration.
