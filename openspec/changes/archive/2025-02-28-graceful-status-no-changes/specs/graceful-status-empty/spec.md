## ADDED Requirements

### Requirement: Status command exits gracefully when no changes exist
The `statusCommand` function SHALL check for available changes via `getAvailableChanges` before calling `validateChangeExists`. When no `--change` option is provided and no change directories exist, it SHALL print a friendly informational message and exit with code 0, instead of reaching `validateChangeExists` and propagating a fatal error.

#### Scenario: No changes exist, text mode
- **WHEN** user runs `openspec status` without `--change` and no change directories exist under `openspec/changes/`
- **THEN** the CLI prints `No active changes. Create one with: openspec new change <name>` to stdout and exits with code 0

#### Scenario: No changes exist, JSON mode
- **WHEN** user runs `openspec status --json` without `--change` and no change directories exist
- **THEN** the CLI outputs `{"changes":[],"message":"No active changes."}` as valid JSON to stdout and exits with code 0

### Requirement: Existing status validation behavior is preserved
Other error paths in `validateChangeExists` that apply to the status command SHALL continue to throw errors as before. Commands other than `status` that use `validateChangeExists` SHALL NOT be affected.

#### Scenario: Changes exist but --change not specified
- **WHEN** user runs `openspec status` without `--change` and one or more change directories exist
- **THEN** the CLI throws an error listing available changes with the message `Missing required option --change. Available changes: ...`

#### Scenario: Specified change does not exist
- **WHEN** user runs `openspec status --change non-existent`
- **THEN** the CLI throws an error with message `Change 'non-existent' not found`

#### Scenario: Other commands unaffected
- **WHEN** user runs `openspec show` or `openspec instructions` without `--change` and no changes exist
- **THEN** the CLI throws the original `No changes found` error (no behavior change)
