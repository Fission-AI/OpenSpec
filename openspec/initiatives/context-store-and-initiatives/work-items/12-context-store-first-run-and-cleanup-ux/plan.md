# Context Store First-Run And Cleanup UX

## Status

Implemented.

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
- Keep Git setup limited to optional local initialization, without staging,
  committing, pushing, creating remotes, or choosing team workflow.

## Non-Goals

- Do not add remote creation, clone, pull, push, watch, or sync automation.
- Do not make setup choose team governance, branching, or review policy.
- Do not delete shared files without an explicit user choice.
- Do not make context stores implementation repos.

## UX Direction

Locked decisions from the product pass:

- `openspec context-store setup` with no arguments should start a guided setup
  when run in an interactive terminal. Agents, scripts, CI, and `--json` callers
  should pass the equivalent explicit inputs instead of relying on prompts.
- The guided setup should ask only for values that map to existing setup flags:
  context store id, context store path, and whether to initialize Git.
- User-facing prompt copy should stay direct:
  `Context store name`, `Where should this context store live?`,
  `Initialize Git in this context store?`, then a final
  `Create this context store?` confirmation after showing the resolved summary.
- The default location should be the managed OpenSpec context-store directory,
  not the current working directory. Users can still choose any explicit safe
  local path; OpenSpec stores that machine-local path in the local registry, not
  in shared context-store metadata.
- Setup should be protective around risky paths: create missing paths, accept
  empty directories, treat matching context-store metadata as idempotent, stop
  on metadata/id conflicts, stop on files, and stop or explicitly warn before
  using a non-empty unmarked directory or a path inside another Git repository.
- Cleanup should expose two explicit intents: `context-store unregister <id>`
  forgets the machine-local registry entry and leaves files alone, while
  `context-store remove <id>` unregisters the store and deletes the local folder
  only after showing the exact path and receiving confirmation.
- Happy-path human output should stay small: show the context store id, its
  location, and the next user-facing step. Do not show Git state, metadata
  paths, registry paths, or created-file lists unless there is a warning,
  failure, `--json`, or `context-store doctor` output.
- JSON output should report exact resulting state, not workflow guidance. Include
  ids, roots, metadata paths, registry state, Git facts, created/deleted files,
  and warnings/errors where present, but do not include `next_commands`. Empty
  `status: []` can be preserved where existing JSON compatibility needs it, but
  new behavior should not rely on blank status arrays for meaning.
- Git initialization is an optional local convenience only. When requested,
  OpenSpec may run `git init`, but it must not stage, commit, push, create
  remotes, create branches, or define team Git policy.

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

The command names are explicit because the user intents are different:

- forget this local registry entry only
- delete this local context-store folder too

If Git initialization fails, setup should explain that the user can install Git
or rerun setup without Git. Successful Git initialization stays out of the
happy-path human output.

## Agent / JSON Contract

JSON setup output should report:

- store id
- root path
- metadata path
- whether Git was initialized
- whether files were created or already existed
- local registry path or registry entry identity

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
