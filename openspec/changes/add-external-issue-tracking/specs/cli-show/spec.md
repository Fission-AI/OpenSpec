## MODIFIED Requirements

### Requirement: Output format options

The show command SHALL support various output formats consistent with existing commands, including tracked issue metadata when available.

#### Scenario: JSON output

- **WHEN** executing `openspec show <item> --json`
- **THEN** output the item in JSON format
- **AND** include parsed metadata and structure
- **AND** include `trackedIssues` array if present in frontmatter
- **AND** maintain format consistency with existing change/spec show commands

#### Scenario: Flag scoping and delegation

- **WHEN** showing a change or a spec via the top-level command
- **THEN** accept common flags such as `--json`
- **AND** pass through type-specific flags to the corresponding implementation
  - Change-only flags: `--deltas-only` (alias `--requirements-only` deprecated)
  - Spec-only flags: `--requirements`, `--no-scenarios`, `-r/--requirement`
- **AND** ignore irrelevant flags for the detected type with a warning
