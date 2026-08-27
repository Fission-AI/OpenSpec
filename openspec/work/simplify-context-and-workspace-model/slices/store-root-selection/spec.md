# Store Root Selection For Normal Commands Spec

## Outcome

Normal OpenSpec commands can act on a registered standalone OpenSpec root
selected by name:

```bash
openspec new change add-billing --store team-context
```

Selecting a store resolves to an ordinary OpenSpec root. Everything downstream
behaves exactly as if the command had been run from inside that root: the same
`openspec/specs/`, `openspec/changes/`, and `openspec/changes/archive/` files,
the same schema, the same lifecycle.

This slice also retires initiative-link creation from normal change flows
(Phase 2.1 pulled forward), so `--store` has exactly one meaning: which
OpenSpec root should this command use.

## Locked Decisions (2026-06-10)

1. **`--store` means root selection, and only that.** The old initiative
   meaning of `--store` / `--store-path` on `new change` and `set change` is
   removed in this slice. New changes do not create initiative links.
   Initiative linking was `set change`'s only behavior, so `openspec set
   change` is removed rather than kept as a deprecated stub or empty shell.
2. **`--store <id>` (registry lookup) is the only selector.** `--store-path`
   is deferred. Registering a clone is the answer for path access; the path
   form can be added later if someone actually hits the wall.
3. **Leftover workspace state never wins root resolution on this path.** The
   workspace branch of the resolver is demoted during this slice's resolver
   rework instead of waiting for Phase 2.3/5.1.
4. **No silent implicit-root scaffold when stores are registered.** When the
   current directory has no OpenSpec root and registered stores exist, the
   command errors with a hint naming the registered stores instead of
   scaffolding a new local root. When no stores are registered, current
   behavior is unchanged.

## User Experience

A human stays in the project repo they are working on and tells their agent
where the work lives. The agent discovers registered stores and selects one by
name:

```bash
openspec context-store list --json
openspec new change add-billing --store team-context
openspec status --change add-billing --store team-context
openspec instructions proposal --change add-billing --store team-context
openspec archive add-billing --store team-context
```

When a store is selected, every supported command emits a human-visible
verification signal so the human can verify the work landed in the right repo
without watching the CLI run. In human mode, this signal is written to stderr so
commands whose stdout is raw Markdown or agent-consumed instructions keep their
normal stdout payload:

```text
Using OpenSpec root: team-context (/Users/alice/src/team-context)
```

Without `--store`, commands keep using the nearest OpenSpec root when one
exists, including when the user is working inside the standalone repo itself.
The flag is never required; it is how you reach a root you are not standing in.
This slice intentionally changes only two legacy no-flag cases: leftover
workspace view state no longer wins root resolution, and a no-root directory
with registered stores errors with a store-selection hint instead of silently
scaffolding a new local root.

## Scope

In scope:

- `--store <id>` on `new change`, `status`, `instructions`, `list`, `show`,
  `validate`, and `archive`, with identical semantics on each.
- One shared OpenSpec-root resolver behind those commands, replacing the
  per-command `cwd + openspec/changes` path joins.
- Resolved-root reporting in human stderr and JSON output for those commands.
- `--json` on `archive` (it has none today), so the shared root block is
  uniform across the command set.
- Minimal `list --specs --json` support so specs listing also participates in
  the shared root reporting contract.
- A deliberate `--store-path` rejection that points to
  `context-store register`; a generic unknown-option error is not enough.
- Absolute paths in command output whenever a store is selected.
- Clear errors: unknown store id lists registered ids; unhealthy store root
  points to `context-store doctor`.
- Consistent resolver errors across supported commands: same resolver error
  code, same user-facing message, and non-zero exit, even if existing
  command-specific JSON envelopes remain different.
- The no-root-plus-registered-stores error and hint.
- Demoting leftover workspace view state in root resolution for these
  commands.
- Removing initiative-link creation (and the old initiative meanings of
  `--store` / `--store-path`) from `new change`.
- Removing `openspec set change` from the CLI, help, completions metadata,
  workflow exports if unused, and command tests/docs references. No deprecation
  stub is kept because initiative linking was its only behavior.
- Clarifying workspace-era `new change` options: `--goal` remains ordinary
  optional change metadata and never affects root selection, while `--areas` is
  rejected because affected workspace links only made sense for workspace-scoped
  planning.
- Next-steps output from `context-store setup` and `register` that shows
  `--store` usage (depends on slice 1.1, `store-root-parity`, being merged).
- Help text for the supported commands describing `--store` consistently.
- Tests that cover the scenarios in this spec.

Out of scope:

- `--store-path` or any path-addressed selection (deferred).
- A default or sticky store per project repo, env vars, or any durable
  app-repo-to-store binding.
- Code-repo relationship declarations or local mapping.
- Opening views or workspace opening behavior (Phase 4).
- Clone, pull, push, sync, branch, worktree, dashboard, apply, verify, or
  archive orchestration.
- Broad deletion of initiative/workspace systems, commands, code, or existing
  user data; this slice only removes the normal-flow surfaces called out above
  and leaves existing legacy data alone.
- Updating generated agent skills and guidance to mention `--store` (tracked
  separately; do not forget it).
- Deprecated noun-form commands (`openspec change show`, `openspec spec
  show`, and similar): they keep their current cwd-based behavior and do not
  gain `--store`.
- Public docs rewrites or `context-store` terminology renaming (L7).

## Acceptance Criteria

### Selecting A Registered Store By Id

`--store <id>` resolves the id through the local registry to the store's
OpenSpec root and runs the command against that root.

#### Scenario: Creating A Change In A Selected Store

- **GIVEN** a registered context store `team-context` with a healthy OpenSpec
  root
- **AND** the current directory is a project repo without its own `openspec/`
  root
- **WHEN** the user runs `openspec new change add-billing --store team-context`
- **THEN** OpenSpec creates `openspec/changes/add-billing/` inside the
  `team-context` store root
- **AND** OpenSpec writes no OpenSpec artifacts under the current directory
- **AND** the output names the resolved root id and absolute path

#### Scenario: Reading And Archiving In A Selected Store

- **GIVEN** the `team-context` store contains the change `add-billing`
- **AND** the current directory is a project repo
- **WHEN** the user runs `list`, `show`, `status`, `validate`, and `archive`
  with `--store team-context`
- **THEN** each command reads the store's `openspec/changes/` and
  `openspec/specs/`
- **AND** `archive` moves the change into the store's
  `openspec/changes/archive/`
- **AND** no OpenSpec artifacts under the current directory are read or
  written

#### Scenario: Explicit Selection Wins Over The Nearest Root

- **GIVEN** the current directory is inside a repo that has its own
  `openspec/` root
- **WHEN** the user runs a supported command with `--store team-context`
- **THEN** OpenSpec uses the `team-context` store root
- **AND** OpenSpec does not read or write the nearby local root

#### Scenario: Rejecting An Unknown Store Id

- **GIVEN** `team-context` is the only registered store
- **WHEN** the user runs a supported command with `--store team-contxt`
- **THEN** OpenSpec fails with an error naming the unknown id
- **AND** the error lists the registered store ids
- **AND** OpenSpec creates no files

#### Scenario: Rejecting An Unhealthy Store Root

- **GIVEN** a registered store whose OpenSpec root is missing or incomplete
- **WHEN** the user runs a supported command with `--store` for that id
- **THEN** OpenSpec fails with an error describing the root problem
- **AND** the error points to `context-store doctor`
- **AND** OpenSpec does not scaffold or repair the store root

#### Scenario: Rejecting A Mismatched Store Identity

- **GIVEN** a registered store whose `.openspec-store/store.yaml` id does not
  match its registry id
- **WHEN** the user runs a supported command with `--store` for that id
- **THEN** OpenSpec fails with an error describing the identity mismatch
- **AND** the error points to `context-store doctor`

#### Scenario: Path Selection Is Not Available

- **WHEN** the user passes `--store-path` to a supported command
- **THEN** OpenSpec rejects the option
- **AND** guidance points to `context-store register` plus `--store <id>`
- **AND** no supported command silently ignores it, including commands that
  otherwise allow unknown options for legacy parsing

### Default Resolution Without --store

Without `--store`, commands resolve the nearest OpenSpec root exactly as a
user standing in that directory would expect.

#### Scenario: Working Inside A Project Repo

- **GIVEN** the current directory is inside a repo with an `openspec/` root
- **WHEN** the user runs a supported command without `--store`
- **THEN** OpenSpec uses the nearest `openspec/` root, unchanged from today

#### Scenario: Working Inside The Standalone Repo Itself

- **GIVEN** the current directory is inside a registered store's root
- **WHEN** the user runs a supported command without `--store`
- **THEN** OpenSpec uses that root as a normal OpenSpec root
- **AND** no flag is required

#### Scenario: No Root Anywhere And No Registered Stores

- **GIVEN** no ancestor directory contains an `openspec/` root
- **AND** no context stores are registered on this machine
- **WHEN** the user runs a supported command
- **THEN** each command behaves exactly as it does today, even where that
  behavior differs between commands (for example, `new change` treats the
  current directory as an implicit root, while `list` and `archive` fail and
  point to `openspec init`)
- **AND** this slice does not normalize those per-command behaviors

#### Scenario: No Root Here But Stores Are Registered

- **GIVEN** no ancestor directory contains an `openspec/` root
- **AND** at least one context store is registered on this machine
- **WHEN** the user runs a supported command without `--store`
- **THEN** OpenSpec fails without scaffolding a new local root
- **AND** the error names the registered store ids
- **AND** the error suggests `--store <id>` or `openspec init`

### Old Workspace State Never Wins

Leftover workspace view state does not decide where these commands act.

#### Scenario: Ignoring Workspace State Next To A Repo Root

- **GIVEN** an ancestor directory contains leftover
  `.openspec-workspace-view.yaml` state
- **AND** the current directory is inside a repo with an `openspec/` root
- **WHEN** the user runs a supported command without `--store`
- **THEN** OpenSpec uses the nearest `openspec/` root
- **AND** OpenSpec does not route to a workspace-owned changes directory
- **AND** OpenSpec does not switch to the workspace-planning schema

#### Scenario: Ignoring Workspace State When A Store Is Selected

- **GIVEN** an ancestor directory contains leftover workspace view state
- **WHEN** the user runs a supported command with `--store team-context`
- **THEN** OpenSpec uses the `team-context` store root

#### Scenario: Workspace State Alone Is Not A Root

- **GIVEN** an ancestor directory contains leftover workspace view state
- **AND** no ancestor directory contains an `openspec/` root
- **WHEN** the user runs a supported command without `--store`
- **THEN** OpenSpec treats the directory as having no OpenSpec root
- **AND** "No Root Anywhere And No Registered Stores" or "No Root Here But
  Stores Are Registered" applies, depending on whether stores are registered

#### Scenario: Workspace-Scoped Areas Are Rejected

- **WHEN** the user runs `openspec new change add-billing --areas api`
- **THEN** OpenSpec rejects `--areas`
- **AND** OpenSpec does not switch to the workspace-planning schema
- **AND** OpenSpec does not create affected workspace-link metadata

#### Scenario: Goal Metadata Does Not Select Workspace Planning

- **WHEN** the user runs `openspec new change add-billing --goal "Improve billing"`
- **THEN** OpenSpec uses the same root resolution it would use without `--goal`
- **AND** `--goal` may write the existing change goal metadata
- **AND** OpenSpec does not create workspace-owned planning state

### Initiative Links Are Retired From Normal Change Flows

Phase 2.1, pulled forward: normal change creation stops attaching work to
initiatives.

#### Scenario: New Changes Create No Initiative Metadata

- **WHEN** `new change` completes, with or without `--store`
- **THEN** OpenSpec creates no initiative link or initiative metadata

#### Scenario: Old Initiative Options Are Gone

- **WHEN** the user passes `--initiative` to `new change`
- **THEN** OpenSpec rejects the option
- **AND** `--store` is documented as root selection only

#### Scenario: Set Change Is Removed

- **WHEN** the user runs `openspec set change` or `openspec set change --help`
- **THEN** the command is no longer available
- **AND** OpenSpec does not print deprecated command guidance for initiative
  linking
- **AND** OpenSpec creates or modifies no files
- **AND** initiative linking was its only behavior, so no replacement is
  provided in this slice

#### Scenario: Existing Initiative Metadata Is Left Alone

- **GIVEN** existing changes carry initiative metadata from the beta
- **WHEN** supported commands read or list those changes
- **THEN** OpenSpec does not modify or delete that metadata in this slice

### Every Supported Command Reports Its Root

The human's verification signal is the output, not the command line.

#### Scenario: Human Output Names The Root

- **WHEN** a supported command runs with `--store` in human mode
- **THEN** stderr includes the resolved store id and the absolute root path
- **AND** stdout remains the command's normal payload, so raw Markdown from
  `show` and agent-consumed text from `instructions` are not prefixed or
  injected with the root banner
- **AND** without `--store`, human output is unchanged from today

#### Scenario: JSON Output Names The Root

- **WHEN** a supported command succeeds with `--json`
- **THEN** the JSON output includes one shared root block with the same field
  names and shape on every supported command, for example:

```json
{
  "root": {
    "path": "/abs/path",
    "source": "store",
    "store_id": "team-context"
  }
}
```

- **AND** `source` is one of `store`, `nearest`, or `implicit`
- **AND** `store_id` is present only when a store was selected
- **AND** `implicit` is used only for preserved no-store behavior where a
  command is allowed to treat the current directory as an implicit OpenSpec root
- **AND** `list --specs --json` emits JSON rather than human text so it can
  include the shared root block
- **AND** existing JSON fields keep their current shapes; the root block is
  additive

#### Scenario: JSON Archive Is Non-Interactive

- **WHEN** the user runs `archive --json`
- **THEN** OpenSpec never opens an interactive picker or confirmation prompt
- **AND** if a change id or confirmation is required, OpenSpec fails
  non-interactively with a machine-readable diagnostic and a non-zero exit
- **AND** JSON-mode archive failures such as validation failure,
  incomplete-task refusal, and spec-update abort do not print human prose or
  blank lines to stdout

#### Scenario: Cross-Root Paths Are Absolute

- **GIVEN** a supported command runs with `--store`
- **WHEN** the output references files in the store
- **THEN** those paths are absolute, never relative to the current directory

### The Command Set Behaves Consistently

#### Scenario: Uniform Flag Semantics

- **WHEN** any supported command (`new change`, `status`, `instructions`,
  `list`, `show`, `validate`, `archive`) receives `--store`
- **THEN** selection, errors, and root reporting behave identically across
  commands
- **AND** resolver failures use the same error code, message text, and exit
  behavior across commands, even if command-specific JSON envelopes are
  preserved
- **AND** no supported command silently ignores the flag
- **AND** bulk and interactive modes (`validate --all`, item pickers, and
  similar) discover and operate on items within the resolved root

### Setup Points To The Next Step

#### Scenario: Setup And Register Show Store Usage

- **WHEN** `context-store setup` or `context-store register` succeeds
- **THEN** the next-steps output shows running a normal command with
  `--store <id>`
