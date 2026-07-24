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

#### Scenario: Context or guidance conflicts with batch behavior

- **WHEN** context or operation guidance conflicts with built-in conflict analysis, explicit user choices, resolved paths, or command contracts
- **THEN** the generated skill identifies context and operation guidance as advisory inputs separate from conflict analysis and CLI-derived values
- **AND** this change leaves existing CLI checks, resolved paths, and command contracts unchanged
- **AND** the template tells the agent not to infer skipped prompts, replacement paths, or command flags from either advisory field
- **AND** the system does not represent that prompt-level precedence as an enforceable check

### Requirement: Carry artifact rules into each batch spec sync

The `/opsx:bulk-archive` skill SHALL fetch current artifact instructions for each selected change before its delta specs are merged and SHALL use the returned artifact rules only for the artifact being written.

#### Scenario: Resolve owning artifacts per change

- **WHEN** bulk archive has discovered concrete delta spec paths for a selected change
- **THEN** it matches each path against that change's `artifactPaths.<id>.existingOutputPaths`
- **AND** requires exactly one owning artifact ID per delta path
- **AND** groups paths by owner without assuming a literal `specs` artifact ID

#### Scenario: Selected changes use different schemas

- **WHEN** a batch contains changes whose delta-spec artifacts resolve under different schemas
- **THEN** the skill resolves owners and requests artifact instructions separately for each change using that change's selected root and schema
- **AND** applies each returned rule set only to artifacts produced from that change
- **AND** passes each change's owner-to-rules snapshot to its inline sync workflow without a duplicate instruction fetch

#### Scenario: A batch change has ambiguous ownership

- **WHEN** a delta path for one selected change matches zero or multiple artifact IDs
- **THEN** that change is not ready to sync or archive
- **AND** no main spec is written for that change
- **AND** the batch report identifies the path and candidate owners before confirmation

#### Scenario: Batch artifact rules remain separate from archive guidance

- **WHEN** artifact instructions contain rules and archive instructions contain `operationGuidance`
- **THEN** artifact rules constrain spec content and form
- **AND** archive guidance remains optional advice for the archive operation
- **AND** neither field is relabeled or merged into the other

#### Scenario: Batch has no artifact rules

- **WHEN** artifact instructions return no rules for a synced artifact
- **THEN** the existing batch conflict resolution and semantic merge behavior continue unchanged
