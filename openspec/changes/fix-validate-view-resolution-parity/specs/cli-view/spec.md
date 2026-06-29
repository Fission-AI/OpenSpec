## ADDED Requirements

### Requirement: Task progress SHALL be resolved through the schema tracked-tasks glob

`openspec view` SHALL determine a change's task progress by resolving `tasks.md` through the schema's tracked-tasks artifact output glob — the `apply.tracks` glob, the same resolution `openspec status` uses to mark task progress — rather than assuming a single fixed `changes/<name>/tasks.md` path. Resolution SHALL be scoped to the change directory, SHALL aggregate completed and total checkbox counts across every matching file, and SHALL NOT double-count. When no schema or no tracked-tasks artifact resolves, `view` SHALL fall back to counting a single top-level `tasks.md` exactly as today. As a result, a change's Draft/Active/Completed classification in `view` SHALL agree with what `openspec status` reports for the same change.

#### Scenario: Nested tasks files under a glob schema

- **GIVEN** a project-local schema whose tracked-tasks (`apply.tracks`) glob is `**/tasks.md`
- **AND** a change with `backend/tasks.md` and `frontend/tasks.md` and no top-level `tasks.md`
- **WHEN** running `openspec view`
- **THEN** the change SHALL show aggregated task progress summed across both files
- **AND** SHALL NOT be classified as a Draft change solely because no top-level `tasks.md` exists

#### Scenario: View task progress agrees with status

- **GIVEN** any change for which `openspec status --change <name>` reports a task count
- **WHEN** running `openspec view`
- **THEN** the task progress shown for that change SHALL equal the count reported by `openspec status`

#### Scenario: Tracked-tasks artifact identified by apply.tracks, not a fixed id

- **GIVEN** a custom schema whose tracked-tasks artifact is not named `tasks` but is referenced by `apply.tracks`
- **WHEN** running `openspec view`
- **THEN** task progress SHALL be resolved from that artifact's glob

#### Scenario: Resolution stays scoped to the change directory

- **WHEN** resolving a change's `tasks.md` files
- **THEN** matching SHALL be rooted at `changes/<name>/` only
- **AND** SHALL NOT count `tasks.md` files belonging to another change or under `changes/archive/`

#### Scenario: Single top-level tasks file is unchanged

- **GIVEN** a change with exactly one top-level `changes/<name>/tasks.md`, or a project with no resolvable schema
- **WHEN** running `openspec view`
- **THEN** task progress SHALL be counted from that single file exactly as before

#### Scenario: A change with no tasks anywhere stays Draft

- **GIVEN** a change with no `tasks.md` matching the tracked-tasks glob
- **WHEN** running `openspec view`
- **THEN** the change SHALL report zero tasks and be classified as Draft, as today
