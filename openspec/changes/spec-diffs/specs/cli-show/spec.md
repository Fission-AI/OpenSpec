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

#### Scenario: Text mode change display is unchanged without --diff

- **WHEN** executing `openspec show <change-name>` in text mode without `--diff`
- **THEN** print the proposal markdown and nothing else, exactly as before `--diff` existed

#### Scenario: Diff output in text mode

- **WHEN** executing `openspec show <change-name> --diff` in text mode (no `--json`)
- **THEN** display the proposal markdown text
- **AND** for each delta spec file under `openspec/changes/<change-name>/specs/<cap>/spec.md`, display the parsed deltas grouped by capability
- **AND** for ADDED requirements, display the full requirement text with a green "ADDED" label
- **AND** for REMOVED requirements, display the authored removal block, including its Reason and Migration text, with a red "REMOVED" label
- **AND** for RENAMED requirements, display the FROM:/TO: with a cyan "RENAMED" label
- **AND** for MODIFIED requirements, extract the matching requirement block from the main spec at `openspec/specs/<cap>/spec.md` by `### Requirement:` header name, compute a unified diff of the main block vs the delta block, and display it colorized (green for `+` lines, red for `-` lines, plain for context lines)
- **AND** when a MODIFIED requirement's name matches a RENAMED entry's TO name in the same spec, the system SHALL look up the main block using the RENAMED entry's FROM name instead
- **AND** when a MODIFIED requirement's header matches a main requirement only after folding case and interior whitespace, display the diff together with a warning that archive matches names exactly
- **AND** if a MODIFIED requirement has no matching main requirement (and no corresponding RENAMED entry), display the full text with a warning
- **AND** if the capability has no main spec at all, display the full text with a warning naming the missing spec, rather than rendering the requirement as an addition

#### Scenario: Diff output in JSON mode

- **WHEN** executing `openspec show <change-name> --json --diff`
- **THEN** the output SHALL use the same JSON structure as `--json` alone (`{ id, title, deltaCount, deltas }`)
- **AND** for each MODIFIED delta, the delta object SHALL include an additional `diff` string field containing the unified diff of the main requirement block vs the delta requirement block
- **AND** when a MODIFIED requirement corresponds to a RENAMED entry, the main block SHALL be looked up using the RENAMED FROM name
- **AND** ADDED, REMOVED, and RENAMED deltas SHALL NOT have a `diff` field
- **AND** if a MODIFIED requirement has no matching main requirement, or its capability has no main spec, the delta object SHALL include a `warning` string field instead of `diff`
- **AND** if a MODIFIED requirement matched only after folding case and interior whitespace, the delta object SHALL include both `diff` and `warning`

#### Scenario: Diff with no delta specs

- **WHEN** executing `openspec show <change-name> --diff` and the change has no delta spec files
- **THEN** print a message reporting that the change has no delta specs to diff
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

#### Scenario: Requirement name matching

- **WHEN** a requirement name matches a `### Requirement:` header exactly (after trimming)
- **THEN** the system SHALL return that block and report the match as exact
- **AND** when only a case- or interior-whitespace-folded match exists, the system SHALL return that block, report the match as inexact, and report the name as the main spec spells it
- **AND** an exact match SHALL take precedence over a folded one

#### Scenario: Requirement name not found in the main spec

- **WHEN** a MODIFIED delta requirement name does not match any `### Requirement:` header in the main spec, exactly or folded
- **THEN** the system SHALL return null for the main block
- **AND** the caller SHALL display the full MODIFIED requirement text with a warning that no main requirement was found

#### Scenario: Main spec paths resolve against the selected root

- **WHEN** resolving the main spec path for a given capability
- **THEN** the system SHALL build `openspec/specs/<cap>/spec.md` under the same OpenSpec root the change was read from, so `--store <id>` diffs against that store's main specs rather than the working directory
- **AND** the system SHALL use `path.join()` for filesystem operations
- **AND** display paths SHALL use forward slashes regardless of platform
