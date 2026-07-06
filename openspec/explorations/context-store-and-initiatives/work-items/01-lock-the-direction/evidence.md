# Work Item 01 Evidence

## 2026-05-20 Initial Direction Lock

Completed before this work item folder was created:

- Added locked disposition to `roadmap.md`.
- Added locked product boundary to `direction.md`.
- Marked `openspec/changes/workspace-reimplementation-roadmap/START_HERE.md` as historical reference.
- Marked `openspec/changes/workspace-reimplementation-roadmap/HISTORICAL_DIRECTION.md` as historical reference.
- Marked `openspec/changes/workspace-reimplementation-roadmap/` as historical
  reference.
- Marked `workspace-apply-repo-slice` and `workspace-verify-and-archive` as
  deferred until initiative-linked repo-local changes exist.

Research findings:

- Current workspace setup, link, relink, list, open, update, and doctor behavior
  is useful beta local-view infrastructure and should be preserved.
- Live specs describe current workspace-planning behavior. They should not be
  rewritten during the initial direction lock; initiative artifacts should carry
  future product intent until behavior changes.
- Existing runtime behavior should remain intact until initiatives and linked
  repo-local changes can replace workspace-level planning.

Verification:

- `git diff --check` passed after the initial direction-lock edits.
- `openspec validate workspace-reimplementation-roadmap --no-interactive`,
  `openspec validate workspace-apply-repo-slice --no-interactive`, and
  `openspec validate workspace-verify-and-archive --no-interactive` failed
  because those existing active changes have no spec deltas. That predates the
  disposition wording and is tracked as an active-change cleanup question.

## 2026-05-21 Initiative Entry Point

Added `README.md` as the initiative entry point and linked it from
`.initiative.yaml`.

The README explains:

- this initiative is the source of product intent
- the reading order for direction, roadmap, tasks, decisions, questions, and
  work items
- specs remain the current behavioral contract behind the code
- specs should not be rewritten for future intent until behavior changes

Updated `work-items/01-lock-the-direction/tasks.md` to mark the initiative
source-of-intent review complete.

## 2026-05-21 Historical Workspace Roadmap Review

Reviewed the historical workspace reimplementation entry points:

- `openspec/changes/workspace-reimplementation-roadmap/START_HERE.md`
- `openspec/changes/workspace-reimplementation-roadmap/HISTORICAL_DIRECTION.md`
- `openspec/changes/workspace-reimplementation-roadmap/README.md`
- `openspec/changes/workspace-reimplementation-roadmap/proposal.md`
- `openspec/changes/workspace-reimplementation-roadmap/POC_REFERENCE_GUIDE.md`

Added a guard near the top of
`openspec/changes/workspace-reimplementation-roadmap/HISTORICAL_DIRECTION.md` stating
that the remaining sections are historical POC follow-up direction and should
not be treated as active implementation guidance.

The roadmap README and handoff prompt already direct agents to the initiative
direction first and warn not to continue the old flat sibling queue unless a
later initiative-linked repo-change design reactivates it.

## 2026-05-21 Active Workspace Proposal Review

Reviewed active workspace proposal artifacts:

- `workspace-reimplementation-roadmap`
- `workspace-agent-guidance`
- `workspace-apply-repo-slice`
- `workspace-verify-and-archive`

Added small notes to `workspace-apply-repo-slice` and
`workspace-verify-and-archive` clarifying that the remaining proposal sections
are preserved for later reference, not discarded, and should become relevant
again after initiatives and initiative-linked repo-local changes exist.

Left `workspace-agent-guidance` untouched because it already has unrelated
worktree edits and should be handled as a separate active-change disposition
decision.

## 2026-05-21 User-Facing Docs Decision

Decision: Do not update `docs/cli.md` as part of the initial direction lock
unless it misrepresents current user-facing behavior.

Reasoning:

- The direction lock is for contributors and agents deciding what to build next.
- User-facing docs should describe current CLI behavior, not future initiative
  intent.
- Initiatives do not have a CLI surface yet, so announcing the pivot in user
  docs would draw attention to an internal product direction before users can act
  on it.

Revisit user-facing docs when initiative or context-store commands exist, or if
current docs promise unavailable workspace apply, verify, or archive behavior.

Verification:

- `git diff --check` passed.
- No files under `openspec/specs/` or `schemas/workspace-planning/` were
  modified in this pass.

## 2026-05-21 Active Change Disposition

Decision: Keep the active workspace changes as deferred reference placeholders.

Rationale:

- Workspace agent guidance, apply, verify, and archive are still expected to
  matter after initiative infrastructure exists.
- The immediate focus should be context stores, initiatives, and
  initiative-linked repo-local changes.
- Keeping the proposals preserves research and continuity without making them
  the next implementation queue.

Follow-up:

- Revisit the deferred workspace changes after initiative-linked repo-local
  changes define the durable handoff model.

## Final Item 1 State

Item 1 is complete.

What is locked:

- Initiative artifacts are the source of product intent for context stores,
  collections, initiatives, workspaces, and repo-local changes.
- Specs and schemas remain the current behavioral contract and were not edited
  for future intent.
- Historical workspace roadmap artifacts remain available as reference, not as
  the active shipping queue.
- Deferred workspace changes remain active reference placeholders because their
  domains are expected to matter after initiative infrastructure exists.
- User-facing docs were intentionally left unchanged unless they misrepresent
  current behavior.

Remaining risks:

- `openspec list` still shows deferred workspace changes as active no-task
  changes. This is intentional for now but may remain visually noisy.
- `workspace-agent-guidance` has unrelated worktree edits and should be handled
  carefully before any future commit or archive decision.
- Future agents still need to read the initiative README first; the historical
  workspace docs are safer now, but still contain useful old lifecycle details
  deeper in the file.
