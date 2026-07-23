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
- **THEN** the generated skill identifies guidance as advisory input separate from conflict analysis and CLI-derived values
- **AND** this change leaves existing CLI checks, resolved paths, and command contracts unchanged
- **AND** the template tells the agent not to infer skipped prompts, replacement paths, or command flags from the guidance
- **AND** the system does not represent that prompt-level precedence as an enforceable check

### Requirement: Carry artifact rules into each batch spec sync

The `/opsx:bulk-archive` skill SHALL fetch current artifact instructions for each selected change before its delta specs are merged and SHALL use the returned artifact rules only for the artifact being written.

#### Scenario: Selected changes use different schemas

- **WHEN** a batch contains changes whose delta-spec artifacts resolve under different schemas
- **THEN** the skill requests artifact instructions separately for each change using that change's selected root and schema
- **AND** applies each returned rule set only to artifacts produced from that change

#### Scenario: Batch artifact rules remain separate from archive guidance

- **WHEN** artifact instructions contain rules and archive instructions contain `operationGuidance`
- **THEN** artifact rules constrain spec content and form
- **AND** archive guidance remains optional advice for the archive operation
- **AND** neither field is relabeled or merged into the other

#### Scenario: Batch has no artifact rules

- **WHEN** artifact instructions return no rules for a synced artifact
- **THEN** the existing batch conflict resolution and semantic merge behavior continue unchanged
