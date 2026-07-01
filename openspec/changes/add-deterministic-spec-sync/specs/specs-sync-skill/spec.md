## MODIFIED Requirements

### Requirement: Specs Sync Skill
The system SHALL provide an `/opsx:sync` skill that syncs delta specs from a change to the main specs by invoking the deterministic `openspec sync` CLI command, rather than editing main specs through agent inference.

#### Scenario: Sync delta specs to main specs
- **WHEN** agent executes `/opsx:sync` with a change name
- **THEN** the skill invokes `openspec sync <name>` to apply the change's deltas to `openspec/specs/`
- **AND** it reports the per-capability counts the CLI returns

#### Scenario: Change selection prompt
- **WHEN** agent executes `/opsx:sync` without specifying a change
- **THEN** the agent prompts user to select from available changes
- **AND** shows changes that have delta specs

#### Scenario: Idempotent operation
- **WHEN** agent executes `/opsx:sync` multiple times on the same change
- **THEN** the result is the same as running it once
- **AND** no duplicate requirements are created

### Requirement: Delta Reconciliation Logic
The reconciliation of delta operations into main specs SHALL be performed by the deterministic `openspec sync` engine in code; the skill SHALL NOT add, modify, remove, or rename requirements in `openspec/specs/` by agent inference.

#### Scenario: Reconciliation delegated to the CLI
- **WHEN** delta operations (ADDED/MODIFIED/REMOVED/RENAMED) must be applied to main specs
- **THEN** the skill relies on `openspec sync` to apply them deterministically
- **AND** the skill does not directly edit files under `openspec/specs/`

#### Scenario: No scenario-level guessing
- **WHEN** a MODIFIED requirement is applied
- **THEN** the deterministic engine replaces the whole requirement block as written in the delta (per the conventions: a complete requirement, not a diff)
- **AND** the skill does not perform partial, scenario-level merges that could silently drop sibling scenarios

#### Scenario: Surface engine diagnostics
- **WHEN** `openspec sync` reports that deltas are not cleanly appliable (for example, a MODIFIED/REMOVED/RENAMED-from header is absent from the base)
- **THEN** the skill reports that diagnostic to the user
- **AND** it does not attempt a manual workaround
