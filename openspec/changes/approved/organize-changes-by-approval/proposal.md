## Why

Shared change directories mix ideas awaiting review with plans approved for implementation. Developers need to see that distinction before treating a change as pending work.

## What Changes

- New changes move from `changes/<name>/` to `changes/proposed/<name>/`. **BREAKING** for scripts that construct paths; change names and CLI selectors stay the same.
- Explicit conversational approval of a finished plan, or invoking the apply workflow for it, moves the change to `changes/approved/<name>/` before implementation. Approval alone can leave implementation for later.
- Commands find changes in either directory. The directory is the source of approval state.
- Updating OpenSpec preserves existing flat changes and the agent moves them to `approved/` only upon explicit approval or apply. Existing archives remain in `changes/archive/`.
- The user's agent performs the move using its filesystem tools. No approval command, metadata, migration, or legacy-status UI.
- Changes follow proposed → approved → archive. Archive rejects proposed changes; existing flat changes retain their archive behavior.

## Capabilities

### New Capabilities

- `change-approval`: Approval transition, agent workflow triggers, location-aware command behavior, and legacy compatibility.

### Modified Capabilities

- `change-creation`: Create proposed changes and prevent duplicate active names across locations.
- `cli-list`: Discover all active locations.
- `openspec-conventions`: Document proposed, approved, legacy, and archived change locations.

## Impact

Change creation and discovery, planning-home resolution, commands that read or archive changes, generated workflow instructions, shell completion, and user documentation need consistent paths. No new dependency or metadata state machine is needed.
