# specs-sync-skill Delta Spec — PR #843

## MODIFIED Requirements

### Requirement: Delta Reconciliation Logic
The agent SHALL reconcile main specs with delta specs using the delta operation headers and the Purpose section.

#### Scenario: ADDED requirements
- **WHEN** delta contains `## ADDED Requirements` with a requirement
- **AND** the requirement does not exist in main spec
- **THEN** add the requirement to main spec

#### Scenario: ADDED requirement already exists
- **WHEN** delta contains `## ADDED Requirements` with a requirement
- **AND** a requirement with the same name already exists in main spec
- **THEN** update the existing requirement to match the delta version

#### Scenario: MODIFIED requirements
- **WHEN** delta contains `## MODIFIED Requirements` with a requirement
- **AND** the requirement exists in main spec
- **THEN** replace the requirement in main spec with the delta version

#### Scenario: REMOVED requirements
- **WHEN** delta contains `## REMOVED Requirements` with a requirement name
- **AND** the requirement exists in main spec
- **THEN** remove the requirement from main spec

#### Scenario: RENAMED requirements
- **WHEN** delta contains `## RENAMED Requirements` with FROM:/TO: format
- **AND** the FROM requirement exists in main spec
- **THEN** rename the requirement to the TO name

#### Scenario: Purpose changes
- **WHEN** delta contains a `## Purpose` section
- **THEN** replace the main spec's `## Purpose` section with the delta Purpose text
- **AND** if the main spec has no Purpose section, insert one after the title heading
- **AND** purpose changes MAY coexist with requirement changes in the same delta file

#### Scenario: New capability spec
- **WHEN** delta spec exists for a capability not in main specs
- **THEN** create new main spec file at `openspec/specs/<capability>/spec.md`

### Requirement: Skill Output
The skill SHALL provide clear feedback on what was applied.

#### Scenario: Show applied changes
- **WHEN** reconciliation completes successfully
- **THEN** display summary of changes per capability:
  - Number of requirements added
  - Number of requirements modified
  - Number of requirements removed
  - Number of requirements renamed
  - Number of purpose sections updated

#### Scenario: No changes needed
- **WHEN** main specs already match delta specs
- **THEN** display "Specs already in sync - no changes needed"
