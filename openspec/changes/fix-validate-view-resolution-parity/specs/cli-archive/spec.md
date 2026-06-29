## ADDED Requirements

### Requirement: Archive incomplete-task gate SHALL use the tracked-tasks glob

`openspec archive`'s incomplete-task gate — the check that prevents archiving a change whose tasks are not all complete — SHALL read task progress through the schema's tracked-tasks artifact output glob (`apply.tracks`), the same resolution `openspec status` and `openspec view` use, rather than a fixed `changes/<name>/tasks.md` path. This closes the data-safety gap where a change whose tasks live in nested/glob `tasks.md` files is read as having zero tasks, no incomplete work, and is allowed to archive while unfinished.

#### Scenario: Glob-tasks change with unfinished work cannot archive

- **GIVEN** a schema whose tracked-tasks glob is `**/tasks.md`
- **AND** a change with `backend/tasks.md` containing unchecked tasks and no top-level `tasks.md`
- **WHEN** running `openspec archive` on that change
- **THEN** the incomplete-task gate SHALL detect the unfinished tasks and block (or require explicit override of) the archive
- **AND** SHALL NOT treat the change as having zero tasks

#### Scenario: Archive task accounting agrees with status

- **GIVEN** any change for which `openspec status --change <name>` reports incomplete tasks
- **WHEN** running `openspec archive` on that change
- **THEN** the incomplete-task gate SHALL see the same incomplete tasks that status reports

#### Scenario: Single top-level tasks file archiving is unchanged

- **GIVEN** a change with a single top-level `changes/<name>/tasks.md`, or a project with no resolvable schema
- **WHEN** running `openspec archive`
- **THEN** the incomplete-task gate SHALL behave exactly as today
