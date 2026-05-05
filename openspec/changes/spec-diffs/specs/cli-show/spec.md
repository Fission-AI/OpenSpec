## MODIFIED Requirements

### Requirement: Output format options

The show command SHALL support various output formats consistent with existing commands.

#### Scenario: JSON output

- **WHEN** executing `openspec show <item> --json`
- **THEN** output the item in JSON format
- **AND** include parsed metadata and structure
- **AND** maintain format consistency with existing change/spec show commands

#### Scenario: Flag scoping and delegation

- **WHEN** showing a change or a spec via the top-level command
- **THEN** accept common flags such as `--json`
- **AND** pass through type-specific flags to the corresponding implementation
  - Change-only flags: `--deltas-only` (alias `--requirements-only` deprecated), `--diff`
  - Spec-only flags: `--requirements`, `--no-scenarios`, `-r/--requirement`
- **AND** ignore irrelevant flags for the detected type with a warning

#### Scenario: Change-specific options

- **WHEN** showing a change with `openspec show <change-name> --deltas-only`
- **THEN** display only the deltas in JSON format
- **AND** maintain compatibility with existing change show options

#### Scenario: Spec-specific options

- **WHEN** showing a spec with `openspec show <spec-id> --requirements`
- **THEN** display only requirements in JSON format
- **AND** support other spec options (--no-scenarios, -r)
- **AND** maintain compatibility with existing spec show options

#### Scenario: Text mode change display

- **WHEN** executing `openspec show <change-name>` in text mode (no `--json`)
- **THEN** display the proposal markdown text
- **AND** if delta spec files exist under `openspec/changes/<change-name>/specs/`, display each delta spec's full content grouped by capability name

#### Scenario: Diff output in text mode

- **WHEN** executing `openspec show <change-name> --diff` in text mode (no `--json`)
- **THEN** display the proposal markdown text
- **AND** for each delta spec file under `openspec/changes/<change-name>/specs/<cap>/spec.md`, iterate parsed deltas grouped by capability
- **AND** for ADDED requirements, display the full requirement text with a green "ADDED" label
- **AND** for REMOVED requirements, display the removal notice (Reason/Migration) with a red "REMOVED" label
- **AND** for RENAMED requirements, display the FROM:/TO: with a cyan "RENAMED" label
- **AND** for MODIFIED requirements, extract the matching requirement block from the base spec at `openspec/specs/<cap>/spec.md` by `### Requirement:` header name, compute a unified diff of the base block vs the delta block, and display it colorized (green for `+` lines, red for `-` lines, dim for context lines and diff headers)
- **AND** when a MODIFIED requirement's name matches a RENAMED entry's TO name in the same spec, the system SHALL look up the base block using the RENAMED entry's FROM name instead
- **AND** if a MODIFIED requirement has no matching base requirement (and no corresponding RENAMED entry), display the full text with a warning

#### Scenario: Diff output in JSON mode

- **WHEN** executing `openspec show <change-name> --json --diff`
- **THEN** the output SHALL use the same JSON structure as `--json` alone (`{ id, title, deltaCount, deltas }`)
- **AND** for each MODIFIED delta, the delta object SHALL include an additional `diff` string field containing the unified diff of the base requirement block vs the delta requirement block
- **AND** when a MODIFIED requirement corresponds to a RENAMED entry, the base block SHALL be looked up using the RENAMED FROM name
- **AND** ADDED, REMOVED, and RENAMED deltas SHALL NOT have a `diff` field
- **AND** if a MODIFIED requirement has no matching base requirement, the delta object SHALL include a `warning` string field instead of `diff`

#### Scenario: Diff with no delta specs

- **WHEN** executing `openspec show <change-name> --diff` and the change has no delta spec files
- **THEN** print a message indicating no delta specs exist for this change
- **AND** exit with code 0

#### Scenario: Diff flag on non-change item

- **WHEN** executing `openspec show <spec-name> --diff`
- **THEN** ignore the `--diff` flag with a warning (flag is not applicable to specs)

## ADDED Requirements

### Requirement: Requirement block extraction for diffing

The system SHALL extract raw markdown text for individual requirement blocks from spec files to support per-requirement diffing.

#### Scenario: Extract requirement block by name

- **WHEN** a requirement name is provided and a spec file contains a matching `### Requirement: <name>` header
- **THEN** the system SHALL return the raw markdown text from the `### Requirement:` header line through all content until the next `###` header at the same or higher level (or end of file)
- **AND** matching SHALL be case-insensitive and whitespace-insensitive

#### Scenario: Requirement name not found in base spec

- **WHEN** a MODIFIED delta requirement name does not match any `### Requirement:` header in the base spec
- **THEN** the system SHALL return null for the base block
- **AND** the caller SHALL display the full MODIFIED requirement text with a warning that no base was found

#### Scenario: Cross-platform path resolution for base specs

- **WHEN** resolving the base spec path for a given capability
- **THEN** the system SHALL use `path.join()` for filesystem operations to build `openspec/specs/<cap>/spec.md`
- **AND** display paths SHALL use forward slashes regardless of platform
