# Standalone Store Lifecycle Proof Spec

## Outcome

A registered standalone OpenSpec repo provably supports the same basic
lifecycle as an OpenSpec root inside a project repo, including the sharing
path that is the reason standalone repos exist: a teammate or second machine
can clone the repo, register it, and continue the work.

To make that proof honest, this slice closes the gaps the lifecycle trips
over today: setup that leaves a commitless Git repo buried in app data,
register errors that loop into each other, and command guidance that drops
the selected store mid-flow.

The proof itself is one chained journey test that drives the built CLI
through both checkouts and asserts that the end state is nothing but normal
OpenSpec files.

## Locked Decisions (2026-06-11)

1. **The proof is the two-checkout story.** The journey covers a first
   checkout (setup, create, status, instructions, artifacts, validate,
   archive, commit) and a second checkout (clone, register, continue the
   lifecycle), simulated with isolated per-machine global state. A
   solo-machine proof is not sufficient; the sharing path is where the
   value and the risk are.
2. **Setup finishes what it starts: Git on by default, initial commit,
   explicit location.** `--init-git` becomes the default, setup commits
   exactly the files it created, and setup never silently chooses the XDG
   data directory: non-interactive runs require `--path`, and interactive
   runs prompt for a location even when an id is supplied. A store is a
   repo the user places, not app data. Because Git cannot track empty
   directories, setup adds tracked placeholder files to otherwise-empty
   store directories so a fresh clone reproduces the healthy root shape.
   Setup verifies a usable Git commit identity before creating anything
   and fails with the exact fix when it is missing, rather than inventing
   an OpenSpec-local identity.
3. **Create-time and read-only is the Git line.** Setup may initialize and
   commit at creation time. Doctor may report read-only Git facts. Nothing
   clones, pulls, pushes, branches, or syncs. Register never commits.
4. **The loop never drops the thread.** With a store selected, every hint
   and next-step a command prints includes `--store <id>`, the root banner
   also prints on failures once resolution succeeded, and `new change`
   names the next command. `status` stops printing workspace-era
   "Planning home" language.
5. **Register errors terminate instead of looping.** The already-registered
   and id-mismatch errors state the one-checkout-per-id rule and name
   `context-store unregister` as the escape hatch. The unhealthy-root
   refusal says what is missing, including the empty-clone case.
6. **Explicitly out:** `view` (Phase 4), agent guidance and help-surface
   discoverability (slice 1.4), `context-store` terminology renaming (L7),
   archive browsability via `list`/`show` (L11), doctor repairs, and
   multi-checkout support for one store id on one machine.

## User Experience

A human says where their planning repo should live, and one command makes it
a real repo:

```bash
openspec context-store setup team-context --path ~/src/team-context
```

The folder is a Git repository with an initial commit containing the store
shape. The next-steps output teaches the two things the user needs: how to
put work in the store, and the one thing OpenSpec will not do for them:

```text
Next: run normal OpenSpec commands against this store, for example:
  openspec new change <change-id> --store team-context
To share this store, commit and push it like any Git repo.
```

A teammate clones the repo and registers it:

```bash
git clone git@example.com:acme/team-context.git
openspec context-store register team-context
```

Because setup committed the store shape, the clone is immediately a healthy
OpenSpec root and register succeeds without ceremony. From then on, both
machines run the same normal commands with `--store team-context`, and every
hint those commands print keeps the store in the loop, so following the
output never strands the user in the wrong root.

`context-store doctor` tells the Git truth without touching anything:
whether the repo has commits yet, whether there are uncommitted changes, and
whether a remote is configured. It reports; the user (or their agent)
decides what to do.

## Scope

In scope:

- `context-store setup` Git defaults: initialize Git by default
  (`--no-init-git` remains the opt-out) and create an initial commit
  containing exactly the files setup created.
- Tracked placeholder files (for example `.gitkeep`) in store directories
  that would otherwise be empty, so the committed shape survives cloning.
- An up-front Git identity check when setup will commit, failing cleanly
  before any files are created.
- `context-store setup` requires an explicit location in non-interactive or
  JSON mode; interactive mode prompts for one, suggesting a user-visible
  path rather than the managed XDG data directory.
- Setup and register next-steps text that mentions committing and pushing
  the repo to share it.
- Read-only Git facts in `context-store doctor` human and JSON output:
  commits present, uncommitted changes, remote configured, with warnings
  for the commitless-repo clone trap and for store directories that exist
  but contain no tracked files.
- Terminal, non-circular register errors for the already-registered and
  id-mismatch cases, and an unhealthy-root refusal that names the missing
  pieces, including the empty-clone case.
- Register continues to never create commits.
- Hint and banner continuity for the slice 1.2 command set (`new change`,
  `status`, `instructions`, `list`, `show`, `validate`, `archive`): hints
  carry `--store <id>` when a store is selected, the root banner also
  prints on post-resolution failures, and `new change` names the next
  command.
- Removing the workspace-era `Planning home` line from `status` output.
- One chained two-checkout journey test in the existing CLI e2e harness
  (spawning the built binary with isolated global state) covering setup,
  register, list, doctor, root selection, change creation, status,
  instructions, list/show, validate, and archive.

Out of scope:

- `view` anywhere in this slice; opening the right files together is
  Phase 4.
- Generated agent guidance, skills, and top-level help discoverability
  (slice 1.4).
- `context-store` terminology renaming (L7).
- Browsing archived changes through `list`/`show` (L11).
- Doctor repairs or any `--fix` behavior.
- Registering two checkouts of the same store id on one machine.
- Clone, pull, push, sync, branch, worktree, dashboard, apply, verify, or
  archive orchestration. Setup-time `git init` plus one initial commit are
  the entire Git write surface of this slice, and doctor's Git reporting
  is read-only.
- Public docs rewrites.

## Acceptance Criteria

### Setup Produces A Real Repo

#### Scenario: Git By Default With An Initial Commit

- **GIVEN** a missing or empty setup target path
- **WHEN** the user runs `context-store setup` without Git flags
- **THEN** the store root is a Git repository
- **AND** exactly one commit exists, containing exactly the files setup
  created
- **AND** the commit message names the context store
- **AND** store directories that would otherwise be empty (for example
  `openspec/specs/` and `openspec/changes/archive/`) contain a tracked
  placeholder file, because Git cannot track empty directories
- **AND** the placeholder files appear in `created_files` and the initial
  commit
- **AND** a clone of the store is immediately a healthy OpenSpec root

#### Scenario: Committing Only What Setup Created

- **GIVEN** setup runs against an existing Git repository it accepts (for
  example a healthy OpenSpec root missing only identity metadata)
- **AND** the repository has uncommitted user changes, including changes
  the user had already staged
- **WHEN** setup creates files
- **THEN** the new commit contains only the files setup created
- **AND** the user's uncommitted changes remain uncommitted and unmodified
- **AND** changes the user had staged remain staged, not swept into setup's
  commit

#### Scenario: Converted Roots Get Placeholders Too

- **GIVEN** setup first accepts an existing healthy OpenSpec root that is
  not yet registered
- **AND** its `openspec/specs/` or `openspec/changes/archive/` directories
  are empty
- **WHEN** setup completes
- **THEN** those empty directories contain a tracked placeholder file
- **AND** the placeholders appear in `created_files` and in setup's commit
  when Git is in play
- **AND** when setup initialized the repository itself, the initial commit
  contains the full store shape (config, specs, changes, identity
  metadata), so a clone of the converted store is immediately healthy
- **AND** files outside the store shape (for example old beta files) are
  not swept into setup's commit
- **AND** reruns for an already-registered store still change nothing
- **AND** register (including confirmed conversion) still creates no
  placeholder files and no commits

#### Scenario: Opting Out Of Git

- **GIVEN** the user passes `--no-init-git`
- **WHEN** setup runs against a missing or empty target
- **THEN** no Git repository is initialized and no commit is created
- **AND** the rest of the store shape is created normally

#### Scenario: Reruns Still Change Nothing

- **GIVEN** a healthy, already-registered store
- **WHEN** setup runs again for the same id and path
- **THEN** no files change and no new commit is created

#### Scenario: Requiring An Explicit Location

- **GIVEN** non-interactive or JSON mode
- **WHEN** setup runs without `--path`
- **THEN** setup fails with an error explaining that a store lives at a
  path the user chooses, showing example `--path` usage
- **AND** no files or registry entries are created

#### Scenario: Interactive Setup Asks Where The Repo Lives

- **GIVEN** interactive mode
- **WHEN** setup runs without `--path`, even when the store id is supplied
- **THEN** setup prompts for a location
- **AND** the editable suggestion is a user-visible path (for example
  `~/openspec/<id>`), not the managed XDG data directory
- **AND** setup never silently places the store in the XDG data directory

#### Scenario: Missing Git Identity Fails Before Creating Anything

- **GIVEN** no usable Git commit identity resolves for the setup target
- **AND** setup would initialize Git or create a commit
- **WHEN** the user runs `context-store setup`
- **THEN** setup fails with an error naming the exact `git config`
  commands that fix it
- **AND** identity supplied via Git environment variables or other
  Git-native resolution counts as usable, exactly as `git commit` would
  accept it
- **AND** no files, directories, Git repository, or registry entries are
  created
- **AND** setup does not commit using an invented OpenSpec-local identity
- **AND** setup with `--no-init-git` does not require a Git identity

#### Scenario: Next Steps Mention Sharing

- **WHEN** setup or register succeeds in human mode
- **THEN** the next-steps output shows `--store <id>` usage
- **AND** includes one line saying the repo is shared by committing and
  pushing it

### Doctor Tells The Git Truth

#### Scenario: Reporting Git Facts Read-Only

- **GIVEN** a registered store whose root is a Git repository
- **WHEN** doctor inspects it
- **THEN** JSON output's `git` section reports whether commits exist,
  whether uncommitted changes exist, and whether a remote is configured
- **AND** human output surfaces the same facts
- **AND** doctor does not create commits, modify files, or touch the
  network

#### Scenario: Flagging The Commitless-Repo Trap

- **GIVEN** a store root that is a Git repository with no commits
- **WHEN** doctor inspects it
- **THEN** doctor reports a warning explaining that clones of this repo
  will be empty until an initial commit exists

#### Scenario: Flagging Clone-Fragile Empty Directories

- **GIVEN** a store root that is a Git repository
- **AND** `openspec/specs/` or `openspec/changes/archive/` exists but
  contains no tracked files
- **WHEN** doctor inspects it
- **THEN** doctor reports a warning explaining that clones will lose those
  directories until they contain a tracked file
- **AND** doctor does not create placeholder files or commits

### Register Fails Honestly And Terminally

#### Scenario: Second Checkout Of A Registered Store

- **GIVEN** store id `team-context` is registered at one path
- **WHEN** the user registers another checkout carrying the same metadata
  id
- **THEN** the error states that one checkout per store id is supported
- **AND** names the currently registered path
- **AND** names `context-store unregister` as the way to switch checkouts
- **AND** does not suggest choosing a different store id

#### Scenario: Mismatched Id Does Not Point Back Into Another Error

- **GIVEN** a folder whose `.openspec-store/store.yaml` id differs from the
  requested `--id`
- **WHEN** register fails on the mismatch
- **THEN** the error explains that the id comes from the store's committed
  metadata
- **AND** the suggested fix accounts for whether that metadata id is
  already registered, so following any register error's fix text never
  lands on another register error for the same situation

#### Scenario: Explaining An Unhealthy Or Empty Clone

- **GIVEN** a directory that is a Git repository without a healthy OpenSpec
  root (for example a clone of a commitless store)
- **WHEN** the user runs register against it
- **THEN** the refusal names the missing OpenSpec root pieces
- **AND** when the repository has no commits, the error says the clone may
  be empty and the origin needs an initial commit

#### Scenario: Register Never Commits

- **GIVEN** register creates `.openspec-store/store.yaml` after confirmed
  conversion of a healthy root
- **WHEN** the operation completes
- **THEN** register has created no Git commits

### Selected-Store Guidance Keeps The Store

#### Scenario: Hints Carry The Store

- **GIVEN** a supported command runs with `--store team-context`
- **WHEN** its output includes a hint naming a follow-up `openspec` command
- **THEN** that hint includes `--store team-context`

#### Scenario: Root Banner On Post-Resolution Failures

- **GIVEN** store resolution succeeds for a supported command
- **WHEN** the command then fails (for example `instructions apply` with no
  active changes)
- **THEN** stderr still includes the `Using OpenSpec root` banner

#### Scenario: New Change Names The Next Command

- **WHEN** `new change` succeeds
- **THEN** the output names at least one concrete next command for the
  created change
- **AND** that command includes the selected store when one was selected

#### Scenario: Status Drops Workspace-Era Language

- **WHEN** `status` reports on a change
- **THEN** the output does not include a `Planning home` line or other
  workspace-planning vocabulary

### One Journey Proves The Lifecycle

The journey runs in the existing CLI e2e harness against the built binary,
with isolated global state per simulated machine.

#### Scenario: First Checkout Lifecycle

- **GIVEN** simulated machine A with isolated global state and a project
  repo without its own OpenSpec root
- **WHEN** the journey runs setup, `context-store list`, doctor, then
  `new change`, `status`, `instructions`, artifact writes, `validate`,
  `list`, `show`, and `archive` with `--store` from the project repo
- **THEN** every step succeeds against the built CLI
- **AND** the change ends in the store's `openspec/changes/archive/` with
  the store's `openspec/specs/` updated
- **AND** no files under the project repo are created or modified

#### Scenario: Second Checkout Registers And Reads What The First Produced

- **GIVEN** machine A commits its work and simulated machine B (separate
  global state) clones the store
- **WHEN** machine B registers the clone, runs doctor, and reads the store
  with `list --specs` and `show` for a spec promoted by machine A's
  archived change
- **THEN** register succeeds without extra ceremony
- **AND** doctor reports a healthy root
- **AND** the promoted specs are visible without browsing the archive
  (archive browsability stays out of scope, L11)

#### Scenario: Second Checkout Completes Its Own Change

- **GIVEN** the registered clone on machine B
- **WHEN** machine B runs `new change`, `status`, `instructions`, artifact
  writes, `validate`, and `archive` with `--store` for a second change
- **THEN** the second change completes the same lifecycle in the clone
- **AND** the final files are normal artifacts in the clone's `openspec/`
  root

#### Scenario: End State Is Just Normal Files

- **WHEN** the journey completes
- **THEN** each checkout contains only normal `openspec/` artifacts, the
  thin `.openspec-store/store.yaml` identity file, and Git state
- **AND** no initiative links, initiative collections, or workspace
  planning state exist in the store, the project repo, or the simulated
  global state
- **AND** the simulated global state contains only local registry and
  config metadata
