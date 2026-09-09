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

Related upstream work: [#1683](https://github.com/Fission-AI/OpenSpec/issues/1683) proposes lifecycle metadata; its [implementation #1684](https://github.com/Fission-AI/OpenSpec/pull/1684) was closed unmerged. [#1818](https://github.com/Fission-AI/OpenSpec/issues/1818) proposes draft changes. This proposal uses the requested directory distinction and leaves shipped state and sync lifecycle changes outside its scope.

## Contribution alignment

The repository's [contribution guidance](../../../../README.md#contributing) asks for an OpenSpec proposal and alignment on intent before implementing new features. The user has authorized a minimal local implementation; upstream acceptance remains a separate decision. It must work across supported agents, schemas, platforms, and stores. Any eventual implementation PR should disclose the coding agent/model, include verified tests, and use conventional commit subjects.

[#1684 was closed by its author](https://github.com/Fission-AI/OpenSpec/pull/1684#issuecomment-5568728429), who concluded that OpenSpec's coupling of specs and decision records did not fit their team's PR workflows. It was not a maintainer rejection of this proposed approval layout. In the [preceding design review](https://github.com/Fission-AI/OpenSpec/pull/1684#issuecomment-5427198908), the maintainer requested a smaller scope, opposed two lifecycle models, identified correctness/data-loss issues, and noted missing docs and agent workflow updates.

That review explicitly directs layout work to [open PR #1367](https://github.com/Fission-AI/OpenSpec/pull/1367), which introduces nested domains and relocates archives. Before upstream submission, seek agreement on fixed approval directories and their relationship to #1367 and draft issue #1818. The proposed approach keeps existing archive semantics, avoids lifecycle configuration and bulk migration, and includes all generated workflow surfaces. These scope choices address review concerns; they do not imply maintainer acceptance.
