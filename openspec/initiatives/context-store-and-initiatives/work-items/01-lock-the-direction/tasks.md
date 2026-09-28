# Work Item 01 Tasks

## Tracking Setup

- [x] Create initiative-level `tasks.md`, `decisions.md`, and `questions.md`.
- [x] Create `work-items/01-lock-the-direction/`.
- [x] Record why roadmap implementation is tracked inside the initiative instead
  of creating a new OpenSpec change.

## Direction Lock Already Captured

- [x] Add locked disposition to `roadmap.md`.
- [x] Add locked product boundary to `direction.md`.
- [x] Mark `openspec/changes/workspace-reimplementation-roadmap/START_HERE.md` as historical reference.
- [x] Mark `openspec/changes/workspace-reimplementation-roadmap/HISTORICAL_DIRECTION.md` as historical reference.
- [x] Mark `workspace-reimplementation-roadmap` as historical reference.
- [x] Mark `workspace-apply-repo-slice` as deferred.
- [x] Mark `workspace-verify-and-archive` as deferred.

## Non-Spec Direction Pass

- [x] Keep OpenSpec specs unchanged until behavior changes.
- [x] Review initiative artifacts for a clear source-of-intent story.
- [x] Review historical workspace roadmap artifacts for any remaining language
  that tells agents to continue the old shipping queue.
- [x] Review active workspace proposal artifacts for any remaining language that
  presents workspace apply, verify, or archive as next.
- [x] Decide whether user-facing docs need changes now; default to no unless
  they misrepresent current behavior.
- [x] Record a decision that specs remain current behavioral contracts, while
  initiative docs carry future product intent.

## Active Change Disposition

- [x] Decide whether `workspace-agent-guidance` should be reframed, closed, or
  kept as a local-view guidance item.
- [x] Decide whether no-task deferred workspace changes should stay active,
  move to archive, or be represented only by initiative work items.

## Verification

- [x] Run `git diff --check`.
- [x] Confirm no OpenSpec specs were modified in this pass.
- [x] Record evidence in `evidence.md`.
