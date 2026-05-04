## MODIFIED Requirements

### Requirement: Status Command

The system SHALL display artifact completion status for a change, including scaffolded (empty) changes and skipped artifacts.

#### Scenario: Show status with all states

- **WHEN** user runs `openspec status --change <id>`
- **THEN** the system displays each artifact with status indicator:
  - `[x]` for completed artifacts
  - `[ ]` for ready artifacts
  - `[-]` for blocked artifacts (with missing dependencies listed)
  - `[~]` for skipped artifacts (synthetically completed due to config)

#### Scenario: Status shows completion summary

- **WHEN** user runs `openspec status --change <id>`
- **THEN** output includes completion percentage and count (e.g., "2/4 artifacts complete")
- **AND** skipped artifacts count toward the completed total

#### Scenario: Status JSON output with skipped status

- **WHEN** user runs `openspec status --change <id> --json`
- **AND** an artifact is synthetically completed (e.g. `specs` when `requireSpecDeltas` is not `"error"` and no spec files exist)
- **THEN** the artifact's status SHALL be `"skipped"` (not `"done"`)

#### Scenario: Status on scaffolded change

- **WHEN** user runs `openspec status --change <id>` on a change with no generated artifact files yet
- **THEN** system displays all artifacts with their status
- **AND** root artifacts (no dependencies) show as ready `[ ]`
- **AND** dependent artifacts show as blocked `[-]`

### Requirement: Output Formatting

The system SHALL provide consistent output formatting.

#### Scenario: Color output

- **WHEN** terminal supports colors
- **THEN** status indicators use colors: green (done), yellow (ready), red (blocked), dim (skipped)

#### Scenario: No color output

- **WHEN** `--no-color` flag is used or NO_COLOR environment variable is set
- **THEN** output uses text-only indicators without ANSI colors
