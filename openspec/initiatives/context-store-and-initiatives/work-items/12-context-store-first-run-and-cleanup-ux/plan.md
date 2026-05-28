# Context Store First-Run And Cleanup UX

## Status

Proposed from the manual beta reality pass.

This work item covers the context-store setup and cleanup gaps that were not
fully captured by later docs, schema, or handoff work.

## Source Of Truth

Manual beta notes:

- `../11-manual-beta-reality-pass/notes.md`, especially the findings around
  no-argument setup, cleanup, target path safety, and shared-store Git guidance.

Preserve the current boundary:

```text
Context stores sync truth.
Collections shape truth.
Initiatives coordinate work.
Workspaces open local views.
Changes implement repo-owned slices.
```

## Why This Exists

The beta pass found that `openspec context-store setup` feels like a first-run
entrypoint, but no-argument setup currently does not guide the user through the
choices they need to make. The pass also found that recovering from a mistaken
store setup requires manual registry edits and file deletion.

These are local lifecycle problems, not shared coordination model problems.
They should be solved before asking new users or teammates to trust context
stores as normal local workflow.

## Goals

- Make no-argument `context-store setup` a friendly interactive setup path in a
  terminal.
- Keep non-interactive and JSON behavior deterministic and agent-safe.
- Make the target store path explicit before creation.
- Provide a supported local cleanup command for removing or unregistering a
  context store from this machine.
- Explain the Git/stage/commit state after initializing a shared store, without
  pushing, committing, or creating remotes automatically.

## Non-Goals

- Do not add remote creation, clone, pull, push, watch, or sync automation.
- Do not make setup choose team governance, branching, or review policy.
- Do not delete shared files without an explicit user choice.
- Do not make context stores implementation repos.

## UX Direction

Interactive setup should cover the minimum choices:

```text
Store id
Target path, defaulting to the managed OpenSpec context-store location
Whether to initialize Git
```

Before writing files, output should show the resolved target path. If an
explicit path is inside another Git repo or an existing non-empty directory,
the command should either ask for confirmation with clear wording or fail with
a fix message in non-interactive mode.

Cleanup should distinguish local registration from file deletion:

```bash
openspec context-store unregister team-context
openspec context-store remove team-context
```

The exact command names are open, but the user intent must be explicit:

- forget this local registry entry only
- delete this local context-store folder too

If a Git-backed context store was initialized, setup output should say that the
store now has uncommitted files and that the user or agent should review,
stage, commit, and push according to their team's normal Git workflow.

## Agent / JSON Contract

JSON setup output should report:

- store id
- root path
- metadata path
- whether Git was initialized
- whether files were created or already existed
- local registry path or registry entry identity
- next commands for listing, doctor, and initiative creation
- advisory Git status summary when available

JSON cleanup output should report:

- store id
- removed local registry entry, if any
- deleted root path, if requested
- files left on disk, if deletion was not requested
- warnings for missing, ambiguous, or already-removed state

## Done When

- A fresh user can run `openspec context-store setup` in a terminal and be led
  through the normal local setup path without knowing flags.
- Non-interactive and JSON setup still fail predictably when required choices
  are missing.
- A mistaken local store registration can be removed through the CLI without
  hand-editing the registry.
- Setup and cleanup output make local file, registry, and Git state explicit.
