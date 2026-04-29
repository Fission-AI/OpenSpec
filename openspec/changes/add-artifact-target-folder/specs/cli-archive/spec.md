## ADDED Requirements

### Requirement: External Artifact Preflight Check

Before moving the change directory to the archive location, the archive command SHALL inspect the schema's artifact list and emit a non-blocking warning for each artifact with a `folder` field whose resolved external location contains zero matching files for its `generates` pattern.

The warning SHALL be informational only — it SHALL NOT block the archive operation, prompt for confirmation, or modify the exit code. Its purpose is to alert the user when an external artifact appears to have been declared but never written.

The archive operation itself SHALL NOT touch files outside the change directory. Files written to `folder` paths live outside `openspec/changes/<change>/` and are unaffected by the wholesale directory move at the heart of the archive command.

#### Scenario: External artifact with matching files archives silently
- **WHEN** user runs `openspec archive my-change`
- **AND** the schema has an artifact with `folder: "ADR"` and `generates: "*.md"`
- **AND** at least one `.md` file exists in `<projectRoot>/ADR/`
- **THEN** the archive proceeds without warning about the external artifact
- **AND** files in `<projectRoot>/ADR/` remain in place (not moved into the archive)

#### Scenario: External artifact with no matching files emits warning
- **WHEN** user runs `openspec archive my-change`
- **AND** the schema has an artifact with `folder: "ADR"` and `generates: "*.md"`
- **AND** no `.md` files exist in `<projectRoot>/ADR/` (folder absent or empty)
- **THEN** the archive command displays a warning identifying the artifact and its resolved path
- **AND** the archive operation continues to completion
- **AND** the exit code is unchanged from the no-warning case

#### Scenario: External files survive archive
- **WHEN** user runs `openspec archive my-change`
- **AND** files exist in `<projectRoot>/ADR/` (an external folder declared by the schema)
- **THEN** the change directory is moved to the archive location
- **AND** files in `<projectRoot>/ADR/` are not moved, copied, or deleted by the archive command
- **AND** the external folder remains at its project-root-relative location

#### Scenario: Archive on Windows preserves external folder
- **WHEN** user runs `openspec archive my-change` on Windows
- **AND** files exist at `C:\\repo\\ADR\\` for an external artifact
- **THEN** the archive command does not touch any path outside the change directory
- **AND** files at `C:\\repo\\ADR\\` remain in place
