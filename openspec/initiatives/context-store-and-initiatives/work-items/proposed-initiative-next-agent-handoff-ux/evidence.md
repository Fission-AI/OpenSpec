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

## Manual Beta Pass Addition

The 2026-05-28 manual beta pass found that command-level handoff is not the
only missing layer. A fresh agent also needs a small, tool-readable guide for
how to use OpenSpec at all:

- inspect context stores, initiatives, workspaces, and repo-local changes before
  guessing;
- understand that context stores can be artifact homes outside implementation
  repos, not only cross-team coordination spaces;
- understand that repo-local changes own implementation planning when the user
  wants artifacts in the repo;
- treat workspaces as local views, not durable planning homes;
- route to narrower OpenSpec workflow skills when available.

As a temporary beta aid, a manual Codex skill was created at
`.codex/skills/use-openspec/` with references for shared context and artifact
placement. This is not yet productized in the configurator.
