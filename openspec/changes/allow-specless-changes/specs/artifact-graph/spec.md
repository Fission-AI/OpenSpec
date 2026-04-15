## MODIFIED Requirements

### Requirement: State Detection
The system SHALL detect artifact completion state by scanning the filesystem, and SHALL synthetically mark artifacts as complete when project config indicates they are not required.

#### Scenario: Simple file exists
- **WHEN** an artifact generates "proposal.md" and the file exists
- **THEN** the artifact is marked as completed

#### Scenario: Glob pattern matches files
- **WHEN** an artifact generates "specs/**/*.md" and matching files exist
- **THEN** the artifact is marked as completed

#### Scenario: No matching files
- **WHEN** an artifact generates "specs/**/*.md" and no matching files exist
- **AND** the project config does not set `requireSpecDeltas` (defaults to `"error"`)
- **THEN** the artifact is marked as not completed

#### Scenario: Missing change directory
- **WHEN** the change directory does not exist
- **THEN** all artifacts are marked as not completed (empty state)

#### Scenario: Specs artifact synthetically completed when requireSpecDeltas is not "error"
- **WHEN** the `specs` artifact generates "specs/**/*.md" and no matching files exist
- **AND** the project config has `requireSpecDeltas` set to `"warn"` or `false`
- **THEN** the `specs` artifact SHALL be synthetically marked as completed
- **AND** downstream artifacts that depend on `specs` (e.g. `tasks`) SHALL become ready

#### Scenario: Specs artifact not synthetically completed when requireSpecDeltas is "error"
- **WHEN** the `specs` artifact generates "specs/**/*.md" and no matching files exist
- **AND** the project config has `requireSpecDeltas` set to `"error"` or is omitted
- **THEN** the `specs` artifact SHALL NOT be synthetically marked as completed
- **AND** downstream artifacts that depend on `specs` SHALL remain blocked

#### Scenario: Specs artifact with files present ignores config
- **WHEN** the `specs` artifact generates "specs/**/*.md" and matching files exist
- **THEN** the artifact is marked as completed regardless of `requireSpecDeltas` setting
