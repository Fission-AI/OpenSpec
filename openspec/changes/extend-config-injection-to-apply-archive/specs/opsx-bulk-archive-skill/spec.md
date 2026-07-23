## ADDED Requirements

### Requirement: Load current archive inputs for a batch

The `/opsx:bulk-archive` skill SHALL request current archive operation inputs once for the selected planning root without changing its existing batch orchestration.

#### Scenario: Batch context and guidance are configured

- **WHEN** the skill has selected one or more changes from one planning root
- **THEN** it calls `openspec instructions archive --change "<selected-change>" --json` once for that root
- **AND** uses returned context and archive guidance as advisory inputs across the batch

#### Scenario: Batch operation inputs are absent

- **WHEN** archive instruction output omits context and operation guidance
- **THEN** the skill continues with its existing bulk archive behavior

#### Scenario: Guidance conflicts with batch behavior

- **WHEN** guidance conflicts with built-in conflict analysis, explicit user choices, resolved paths, or command contracts
- **THEN** the skill keeps existing bulk archive behavior authoritative
- **AND** does not infer skipped prompts, replacement paths, or command flags from the guidance
