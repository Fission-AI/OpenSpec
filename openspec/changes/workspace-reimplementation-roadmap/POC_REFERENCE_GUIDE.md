# Workspace POC Reference Guide

This guide is for a fresh agent starting a new session with no prior context about the workspace POC.

Root entry point: `WORKSPACE_REIMPLEMENTATION_START_HERE.md`.

The goal is not to continue the POC. The goal is to use it as research material before reimplementing workspace support cleanly from the current base.

## Reference Point

Use this exact commit as the stable reference:

```text
workspace-poc @ 79a45ac043f414e63d13e08b9da83b135cb20a39
```

Do not rely only on the moving branch name. Do not merge this commit into the implementation branch. Do not cherry-pick from it unless a later proposal explicitly decides that a small piece should be preserved.

## What The POC Was Trying To Prove

Start from the user journey:

```text
create workspace
  -> add repos
  -> open workspace with an agent
  -> explore across repos
  -> create a proposal
  -> apply one repo slice
  -> verify
  -> archive
```

The POC is useful if it helps answer:

- What did the user experience feel like when workspace mode worked?
- Which CLI surfaces made the workflow easier to understand?
- Which tests captured real product expectations?
- Which implementation choices were shortcuts that should not survive?
- Which terminology became misleading once the desired product shape was clearer?

## First Files To Read

Read these from the POC commit before implementation:

```text
WORKSPACE_REIMPLEMENTATION_DIRECTION.md
WORKSPACE_POC_FOLLOWUP_NOTES.md
docs/workspace.md
docs/workspace-demo.md
docs/cli.md
src/commands/workspace.ts
src/core/workspace/open.ts
test/commands/workspace/open.test.ts
test/core/workspace/open.test.ts
test/cli-e2e/workspace/workspace-open-cli.test.ts
```

Optional deeper context:

```text
workspace-poc-explorer.html
workspace-poc-phase-playground.html
copilot-session-d4e9c61e-readable.md
copilot-session-d4e9c61e-timeline.md
```

The optional files are historical research aids. Use them to understand how the POC evolved, not as implementation requirements.

## How To Inspect The POC Safely

Preferred approach: use a separate worktree or read files directly from the pinned commit.

Example direct reads:

```bash
git show 79a45ac043f414e63d13e08b9da83b135cb20a39:WORKSPACE_REIMPLEMENTATION_DIRECTION.md
git show 79a45ac043f414e63d13e08b9da83b135cb20a39:src/commands/workspace.ts
git diff origin/main...79a45ac043f414e63d13e08b9da83b135cb20a39 --stat
```

Example separate worktree:

```bash
git worktree add ../openspec-workspace-poc 79a45ac043f414e63d13e08b9da83b135cb20a39
```

Keep the implementation branch based on the current target branch. The POC worktree is for reading and running tests only.

## What To Bring Back

Before implementing a slice, come back with a short POC findings note:

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

Put durable findings in the relevant OpenSpec proposal or design artifact. Do not leave important decisions only in chat.

## Slice-Specific Reading

### `workspace-foundation`

Focus on:

- workspace folder shape
- metadata directory naming
- local versus committed state
- stable workspace name semantics

Read:

```text
WORKSPACE_REIMPLEMENTATION_DIRECTION.md
WORKSPACE_POC_FOLLOWUP_NOTES.md
docs/workspace.md
src/commands/workspace.ts
```

Bring back:

- the storage model worth keeping
- the metadata naming decision
- any compatibility risks with repo-local `openspec/`

### `workspace-create-and-register-repos`

Focus on:

- how a user creates a workspace
- how repos or folders are linked
- what `doctor` or equivalent status output should explain
- how POC `create`/`add-repo` behavior maps to the target `setup`/`link`/`relink`/`doctor` flow before change creation
- how planning-only repos and monorepo modules differ from implementation-ready repo-local OpenSpec projects

Read:

```text
docs/workspace.md
docs/workspace-demo.md
src/commands/workspace.ts
test/commands/workspace/setup.test.ts
```

Bring back:

- expected commands
- expected files
- validation behavior for bad paths, duplicate workspace names, missing paths, planning-only links, and duplicate link names

### `workspace-open-agent-context`

Focus on:

- what context the agent receives
- how linked repos or folders become visible
- how one-session agent selection should work
- what should be stable guidance versus dynamic launch context

Read:

```text
WORKSPACE_POC_FOLLOWUP_NOTES.md
src/commands/workspace.ts
src/core/workspace/open.ts
test/commands/workspace/open.test.ts
test/core/workspace/open.test.ts
test/cli-e2e/workspace/workspace-open-cli.test.ts
```

Bring back:

- launch-context requirements
- agent-specific behavior to preserve
- prompt or guidance text that should become stable instructions

### `workspace-change-planning`

Focus on:

- when repo scope becomes a planning commitment
- whether targets should be inferred from artifacts
- how proposal, design, tasks, and specs should be arranged

Read:

```text
WORKSPACE_REIMPLEMENTATION_DIRECTION.md
docs/workspace.md
docs/workspace-demo.md
```

Bring back:

- the artifact shape to use
- how targets should be confirmed
- which POC target metadata ideas should be avoided or deferred

### `workspace-apply-repo-slice`

Focus on:

- the terminology decision that apply means implementation
- what context the agent needs to implement one repo slice
- why materialization should not be the user-facing contract

Read:

```text
WORKSPACE_REIMPLEMENTATION_DIRECTION.md
WORKSPACE_POC_FOLLOWUP_NOTES.md
```

Bring back:

- the normalized apply context shape
- the user-facing apply contract
- any POC materialization behavior that should be explicitly rejected

### `workspace-verify-and-archive`

Focus on:

- partial repo completion versus full workspace completion
- how verification should report gaps
- how archive should avoid forcing repo-local planning copies

Read:

```text
WORKSPACE_REIMPLEMENTATION_DIRECTION.md
docs/workspace-demo.md
```

Bring back:

- the minimum useful verify behavior
- the archive preconditions
- the distinction between repo-slice completion and workspace hard-done state

## Ground Rules

- Treat the POC as evidence, not inheritance.
- Preserve user-visible lessons before preserving code.
- Prefer current repo patterns over POC-only abstractions.
- Implement one user-visible step at a time.
- Update this roadmap when a POC lesson changes a later slice.
