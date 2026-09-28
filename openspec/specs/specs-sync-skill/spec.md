# specs-sync-skill Specification

## Purpose
Defines the agent skill for syncing delta specs from changes to main specs.

## Requirements

### Requirement: Specs Sync Skill
The system SHALL provide an `/opsx:sync` skill that syncs delta specs from a change to the main specs.

#### Scenario: Sync delta specs to main specs
- **WHEN** agent executes `/opsx:sync` with a change name
- **THEN** the agent reads delta specs from `openspec/changes/<name>/specs/`
- **AND** reads corresponding main specs from `openspec/specs/`
- **AND** reconciles main specs to match what the deltas describe

#### Scenario: Idempotent operation
- **WHEN** agent executes `/opsx:sync` multiple times on the same change
- **THEN** the result is the same as running it once
- **AND** no duplicate requirements are created

#### Scenario: Change selection prompt
- **WHEN** agent executes `/opsx:sync` without specifying a change
- **THEN** the agent infers the change from conversation context, or auto-selects it when only one active change exists
- **AND** when ambiguous, prompts user to select from available changes, showing changes that have delta specs
- **AND** announces which change was selected and how to override

### Requirement: Delta Reconciliation Logic
The agent SHALL reconcile main specs with delta specs using the delta operation headers.

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

#### Scenario: REMOVED requirements retire the capability
- **WHEN** removing the requirements named in the delta leaves no requirement blocks
- **AND** every other nonblank line in the whole file is accounted for as the title, Purpose, Requirements header, or a canonical requirement's statement, scenarios, or fenced examples
- **AND** the rest of the spec is well-formed and it was not already empty before this sync
- **AND** the change declares `retire_capabilities: true` in its metadata
- **AND** the `spec.md` resolves inside the real specs root
- **THEN** delete that capability's `spec.md`, and its directory once nothing else remains in it
- **AND** report the retirement and name the deleted `## Purpose`
- **AND** leave the file in place and say the marker is missing when it is not declared

#### Scenario: Something is left in the spec
- **WHEN** any of those conditions fails - unaccounted content remains anywhere in the file, the spec is malformed, or nothing was removed this run
- **THEN** do not modify the main spec and stop the sync for that capability
- **AND** report the blocking condition and how the user can resolve it
- **AND** never write or leave an empty `## Requirements` section

#### Scenario: RENAMED requirements
- **WHEN** delta contains `## RENAMED Requirements` with FROM:/TO: format
- **AND** the FROM requirement exists in main spec
- **THEN** rename the requirement to the TO name

#### Scenario: New capability spec
- **WHEN** delta spec exists for a capability not in main specs
- **AND** it has ADDED requirements and no MODIFIED or RENAMED requirements
- **THEN** create new main spec file at `openspec/specs/<capability-path>/spec.md`, preserving the delta's path relative to `specs/`
- **AND** copy the delta's `## Purpose` body into it when the delta has one, matching what `openspec archive` does
- **AND** write a brief TBD placeholder Purpose only when the delta has none

#### Scenario: MODIFIED or RENAMED against a capability with no main spec
- **WHEN** delta contains `## MODIFIED Requirements` or `## RENAMED Requirements`
- **AND** the capability has no main spec yet
- **THEN** stop the sync for that capability and report that only ADDED requirements are allowed for a new spec, matching what `openspec archive` does
- **AND** never invent the missing requirement
- **AND** skip any `## REMOVED Requirements` with a warning, since there is nothing to remove

#### Scenario: Nothing to put in a new spec
- **WHEN** a delta targets a capability with no main spec
- **AND** the delta has no `## ADDED Requirements` to seed it with
- **THEN** create no main spec and leave the specs directory untouched
- **AND** for a REMOVED-only delta with `retire_capabilities: true` in the change's `.openspec.yaml`, report the capability as already retired and continue without recreating it
- **AND** without that marker, report a REMOVED-only sync as blocked, matching `openspec archive`, which aborts with `Spec must have at least one requirement`
- **AND** report an empty delta as blocked because it has no operations to sync
- **AND** never write an empty `## Requirements` section

#### Scenario: Merged main spec keeps canonical structure
- **WHEN** the agent writes a main spec during sync
- **THEN** every requirement lives under a single `## Requirements` section
- **AND** the main spec contains no delta operation headers (`## ADDED/MODIFIED/REMOVED/RENAMED Requirements`)

### Requirement: Skill Output
The skill SHALL provide clear feedback on what was applied.

#### Scenario: Show applied changes
- **WHEN** reconciliation completes successfully
- **THEN** display summary of changes per capability:
  - Number of requirements added
  - Number of requirements modified
  - Number of requirements removed
  - Number of requirements renamed

#### Scenario: No changes needed
- **WHEN** main specs already match delta specs
- **THEN** display "Specs already in sync - no changes needed"
