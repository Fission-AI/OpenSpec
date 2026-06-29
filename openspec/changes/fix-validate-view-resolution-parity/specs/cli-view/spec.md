## ADDED Requirements

### Requirement: Task progress SHALL be resolved through the schema artifact output glob

`openspec view` SHALL determine a change's task progress by resolving `tasks.md` through the schema's `tasks` artifact output glob — the same resolution `openspec status` uses to mark the `tasks` artifact done — rather than assuming a single fixed `changes/<name>/tasks.md` path. When the glob matches multiple files, the completed and total counts SHALL be aggregated across all matches. As a result, a change's Draft/Active/Completed classification in `view` SHALL agree with what `openspec status` reports for the same change.

#### Scenario: Nested tasks files under a glob schema

- **GIVEN** a project-local schema whose `tasks` artifact glob is `**/tasks.md`
- **AND** a change with `backend/tasks.md` and `frontend/tasks.md` and no top-level `tasks.md`
- **WHEN** running `openspec view`
- **THEN** the change SHALL show aggregated task progress from both files
- **AND** SHALL NOT be classified as a Draft change solely because no top-level `tasks.md` exists

#### Scenario: View task progress agrees with status

- **GIVEN** any change for which `openspec status --change <name>` reports a task count
- **WHEN** running `openspec view`
- **THEN** the task progress shown for that change SHALL equal the count reported by `openspec status`

#### Scenario: Single top-level tasks file is unchanged

- **GIVEN** a change with exactly one top-level `changes/<name>/tasks.md`
- **WHEN** running `openspec view`
- **THEN** task progress SHALL be counted from that file exactly as before
