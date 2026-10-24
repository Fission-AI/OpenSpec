# cli-show Specification

## Purpose
Define top-level `openspec show` behavior for interactive and direct display of change and spec content.

## Requirements

### Requirement: Top-level show command

The CLI SHALL provide a top-level `show` command for displaying changes and specs with intelligent selection.

#### Scenario: Interactive show selection

- **WHEN** executing `openspec show` without arguments
- **THEN** prompt user to select type (change or spec)
- **AND** display list of available items for selected type
- **AND** show the selected item's content

#### Scenario: Non-interactive environments do not prompt

- **GIVEN** stdin is not a TTY or `--no-interactive` is provided or environment variable `OPEN_SPEC_INTERACTIVE=0`
- **WHEN** executing `openspec show` without arguments
- **THEN** do not prompt
- **AND** print a helpful hint with examples for `openspec show <item>` or `openspec change/spec show`
- **AND** exit with code 1

#### Scenario: Direct item display

- **WHEN** executing `openspec show <item-name>`
- **THEN** automatically detect if item is a change or spec
- **AND** display the item's content
- **AND** use appropriate formatting based on item type

#### Scenario: Type detection and ambiguity handling

- **WHEN** executing `openspec show <item-name>`
- **THEN** if `<item-name>` uniquely matches a change or a spec, show that item
- **AND** if it matches both, print an ambiguity error and suggest `--type change|spec` or using `openspec change show`/`openspec spec show`
- **AND** if it matches neither, print not-found with nearest-match suggestions

#### Scenario: Explicit type override

- **WHEN** executing `openspec show --type change <item>`
- **THEN** treat `<item>` as a change ID and show it (skipping auto-detection)

- **WHEN** executing `openspec show --type spec <item>`
- **THEN** treat `<item>` as a spec ID and show it (skipping auto-detection)

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
- **AND** when multiple RENAMED entries form a chain, the system SHALL resolve the MODIFIED name back to the original main requirement
- **AND** when a MODIFIED requirement's header matches a main requirement only after folding case and interior whitespace, display the diff together with a warning that archive matches names exactly
- **AND** if a MODIFIED requirement has no matching main requirement (and no corresponding RENAMED entry), display the full text with a warning
- **AND** if the capability has no main spec at all, display the full text with a warning naming the missing spec, rather than rendering the requirement as an addition
- **AND** if the MODIFIED block is textually identical to the matching main block, display `(no textual changes)`

#### Scenario: Diff output in JSON mode

- **WHEN** executing `openspec show <change-name> --json --diff`
- **THEN** the output SHALL use the same JSON structure as `--json` alone (`{ id, title, deltaCount, deltas }`)
- **AND** for each MODIFIED delta, the delta object SHALL include an additional `diff` string field containing the unified diff of the main requirement block vs the delta requirement block
- **AND** when a MODIFIED requirement corresponds to a RENAMED entry, the main block SHALL be looked up using the RENAMED FROM name
- **AND** ADDED, REMOVED, and RENAMED deltas SHALL NOT have a `diff` field
- **AND** if a MODIFIED requirement has no matching main requirement, or its capability has no main spec, the delta object SHALL include a `warning` string field instead of `diff`
- **AND** if a MODIFIED requirement matched only after folding case and interior whitespace, the delta object SHALL include both `diff` and `warning`
- **AND** a textually identical MODIFIED block SHALL include `diff` as an empty string

#### Scenario: Diff input cannot be read

- **WHEN** delta discovery fails, a delta spec cannot be read, or a main spec exists but cannot be read
- **THEN** the command SHALL exit with an error
- **AND** the command SHALL NOT present the result as an empty delta set, a missing main spec, or a partial diff

#### Scenario: Diff with no delta specs

- **WHEN** executing `openspec show <change-name> --diff` and the change has no delta spec files
- **THEN** print a message reporting that the change has no delta specs to diff
- **AND** exit with code 0

#### Scenario: Diff flag on non-change item

- **WHEN** executing `openspec show <spec-name> --diff`
- **THEN** ignore the `--diff` flag with a warning (flag is not applicable to specs)

### Requirement: Interactivity controls

- The CLI SHALL respect `--no-interactive` to disable prompts.
- The CLI SHALL respect `OPEN_SPEC_INTERACTIVE=0` to disable prompts globally.
- Interactive prompts SHALL only be shown when stdin is a TTY and interactivity is not disabled.

#### Scenario: Change-specific options

- **WHEN** showing a change with `openspec show <change-name> --deltas-only`
- **THEN** display only the deltas in JSON format
- **AND** maintain compatibility with existing change show options

#### Scenario: Spec-specific options  

- **WHEN** showing a spec with `openspec show <spec-id> --requirements`
- **THEN** display only requirements in JSON format
- **AND** support other spec options (--no-scenarios, -r)
- **AND** maintain compatibility with existing spec show options

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
