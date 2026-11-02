## ADDED Requirements

### Requirement: Task progress SHALL be resolved through the tracked-tasks artifact glob

`openspec view` SHALL determine a change's task progress by resolving its tracked-tasks artifact and counting checkboxes across that artifact's output glob (`generates`) — the same file-resolution `openspec status` uses to detect the tasks artifact — rather than assuming a fixed `changes/<name>/tasks.md` path. The tracked-tasks artifact SHALL be identified as the artifact whose `generates` equals the schema's `apply.tracks` value, falling back to the artifact with id `tasks` when no `apply` block is present. (`apply.tracks` is a filename that selects the artifact; the glob is that artifact's `generates`.) Resolution SHALL be scoped to the change directory, SHALL aggregate completed and total checkbox counts across every matching file, and SHALL NOT double-count. When the schema cannot be resolved, no tracked-tasks artifact is found, or the glob matches no file, `view` SHALL fall back to counting a single top-level `tasks.md` exactly as today, and SHALL NOT raise an error.

Note on scope: `openspec status` detects whether the tasks artifact *file exists*; it does not count checkboxes (a change whose nested `tasks.md` files exist is reported by `status` as having the tasks artifact complete even when boxes are unchecked). The parity established here is therefore **resolution-mechanism parity** — `view` resolves the same set of `tasks.md` files `status` resolves — and `view` additionally counts checkboxes within them. The fix removes `view`'s blindness to nested files; it does not make `view` agree with a task count `status` does not produce.

#### Scenario: Nested tasks files under a glob schema

- **GIVEN** a schema whose tasks artifact `generates` is `**/tasks.md`
- **AND** a change with `backend/tasks.md` and `frontend/tasks.md` and no top-level `tasks.md`
- **WHEN** running `openspec view`
- **THEN** the change SHALL show aggregated task progress summed across both files
- **AND** SHALL NOT be classified as a Draft change solely because no top-level `tasks.md` exists

#### Scenario: Tracked-tasks files resolve the same as status

- **GIVEN** a schema whose tasks artifact `generates` is `**/tasks.md`
- **WHEN** running `openspec view` and `openspec status --change <name>`
- **THEN** both SHALL resolve the same set of `tasks.md` files for the change — `status` to detect the tasks artifact, `view` to count checkboxes within them

#### Scenario: Files exist but tasks unchecked are not Completed

- **GIVEN** a glob-tasks change whose matched `tasks.md` files contain unchecked boxes
- **WHEN** running `openspec view`
- **THEN** the change SHALL be classified Active (not Completed), even though `status` reports the tasks artifact as present

#### Scenario: Tracked-tasks artifact identified by apply.tracks, not a fixed id

- **GIVEN** a custom schema whose tracked-tasks artifact is not named `tasks` but is selected by `apply.tracks`
- **WHEN** running `openspec view`
- **THEN** task progress SHALL be resolved from that artifact's `generates` glob

#### Scenario: Resolution stays scoped to the change directory

- **WHEN** resolving a change's `tasks.md` files
- **THEN** matching SHALL be rooted at `changes/<name>/` only
- **AND** SHALL NOT count `tasks.md` files belonging to another change or under `changes/archive/`

#### Scenario: Unresolvable schema falls back without error

- **GIVEN** a change whose configured schema cannot be resolved (for example, the config names a missing schema)
- **WHEN** running `openspec view`
- **THEN** task progress SHALL fall back to counting a single top-level `tasks.md`
- **AND** `view` SHALL NOT crash

#### Scenario: Single top-level tasks file is unchanged

- **GIVEN** a change with exactly one top-level `changes/<name>/tasks.md`, or a project with no resolvable schema
- **WHEN** running `openspec view`
- **THEN** task progress SHALL be counted from that single file exactly as before

#### Scenario: A change with no tasks anywhere stays Draft

- **GIVEN** a change with no `tasks.md` matching the tracked-tasks glob
- **WHEN** running `openspec view`
- **THEN** the change SHALL report zero tasks and be classified as Draft, as today
