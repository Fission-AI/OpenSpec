# openspec-conventions Delta Spec — PR #843

## MODIFIED Requirements

### Requirement: Change Storage Convention

Change proposals SHALL store additions, modifications, removals, renames, and purpose changes to specifications, not complete future states.

#### Scenario: Creating change proposals with additions

- **WHEN** creating a change proposal that adds new requirements
- **THEN** include only the new requirements under `## ADDED Requirements`
- **AND** each requirement SHALL include its complete content
- **AND** use the standard structured format for requirements and scenarios

#### Scenario: Creating change proposals with modifications  

- **WHEN** creating a change proposal that modifies existing requirements
- **THEN** include the modified requirements under `## MODIFIED Requirements`
- **AND** use the same header text as in the current spec (normalized)
- **AND** include the complete modified requirement (not a diff)
- **AND** optionally annotate what changed with inline comments like `← (was X)`

#### Scenario: Creating change proposals with removals

- **WHEN** creating a change proposal that removes requirements
- **THEN** list them under `## REMOVED Requirements`
- **AND** use the normalized header text for identification
- **AND** include reason for removal
- **AND** document any migration path if applicable

#### Scenario: Creating change proposals with purpose changes

- **WHEN** creating a change proposal that modifies a spec's Purpose text
- **THEN** include the new purpose under a `## Purpose` section in the delta spec
- **AND** the validator SHALL accept purpose-only delta files (no requirement sections required)
- **AND** the archive process SHALL replace the main spec's `## Purpose` section with the delta Purpose text
- **AND** purpose changes MAY be combined with requirement changes in the same delta file

The `changes/[name]/specs/` directory SHALL contain:
- Delta files showing only what changes
- Sections for ADDED, MODIFIED, REMOVED, RENAMED requirements, and/or Purpose
- Normalized header matching for requirement identification
- Complete requirements using the structured format
- Clear indication of change type for each requirement

#### Scenario: Using standard output symbols

- **WHEN** displaying delta operations in CLI output
- **THEN** use these standard symbols:
  - `+` for ADDED (green)
  - `~` for MODIFIED (yellow)
  - `-` for REMOVED (red)
  - `→` for RENAMED (cyan)
  - `📝` for PURPOSE_MODIFIED (blue)
