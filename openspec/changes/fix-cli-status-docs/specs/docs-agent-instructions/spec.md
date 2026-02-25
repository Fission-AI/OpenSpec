## ADDED Requirements

### Requirement: CLI status documentation accuracy

The `docs/cli.md` status command examples SHALL match the actual output produced by the CLI.

#### Scenario: Text output example matches actual format

- **WHEN** comparing the text output example in `docs/cli.md` to the output of `openspec status --change <name>`
- **THEN** the documented indicators SHALL be `[x]` for done, `[ ]` for ready, and `[-]` for blocked
- **AND** the documented headers SHALL include `Change:`, `Schema:`, and `Progress: N/M artifacts complete`
- **AND** blocked artifacts SHALL show `(blocked by: dep1, dep2)` notation

#### Scenario: JSON output example matches actual field names

- **WHEN** comparing the JSON output example in `docs/cli.md` to the output of `openspec status --change <name> --json`
- **THEN** the documented top-level fields SHALL be `changeName`, `schemaName`, `isComplete`, `applyRequires`, and `artifacts`
- **AND** each artifact object SHALL have fields `id`, `outputPath`, `status`, and optionally `missingDeps`
- **AND** the `status` field values SHALL be `done`, `ready`, or `blocked`

#### Scenario: Validation by running actual CLI

- **WHEN** the documentation update is complete
- **THEN** the implementer MUST run `openspec status` (both text and `--json` modes) against a real change and verify every field name, value format, and indicator symbol matches the documented examples
