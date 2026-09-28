## ADDED Requirements

### Requirement: Load current archive inputs for a batch

The `/opsx:bulk-archive` skill SHALL request current archive operation inputs once for the selected planning root without changing its existing batch orchestration.

#### Scenario: Batch context and guidance are configured

- **WHEN** the skill has selected one or more changes from one planning root
- **THEN** it calls `openspec instructions archive --change "<selected-change>" --json` once for that root
- **AND** treats context as a required prompt-level instruction input and applies relevant project facts, conventions, and constraints across the batch
- **AND** treats operation guidance as optional additive advice, considers every entry, and follows entries that are applicable and compatible with the built-in batch workflow

#### Scenario: Batch operation inputs are absent

- **WHEN** archive instruction output omits context and operation guidance
- **THEN** the skill continues with its existing bulk archive behavior

#### Scenario: Batch archive instruction lookup fails

- **WHEN** `openspec instructions archive --change "<selected-change>" --json` exits non-zero or does not return valid archive-instruction JSON
- **THEN** the skill reports the instruction lookup error
- **AND** stops the batch before inspecting or writing specs or moving any change
- **AND** does not treat the failed lookup as absent context or operation guidance

#### Scenario: Context or guidance conflicts with batch behavior

- **WHEN** context or operation guidance conflicts with built-in conflict analysis, explicit user choices, resolved paths, or command contracts
- **THEN** the generated skill keeps required project context and advisory operation guidance separate from conflict analysis and CLI-derived values
- **AND** tells the agent to report context conflicts
- **AND** tells the agent to explain why conflicting or inapplicable operation guidance was not followed
- **AND** this change leaves existing CLI checks, resolved paths, and command contracts unchanged
- **AND** the template tells the agent not to infer skipped prompts, replacement paths, or command flags from either field
- **AND** the system does not represent that prompt-level precedence as an enforceable check

### Requirement: Carry artifact rules into each batch spec sync

The `/opsx:bulk-archive` skill SHALL fetch current `specs` artifact instructions for each selected change with concrete delta specs and SHALL use the returned artifact rules only for main specs written by that change's merge.

#### Scenario: Discover specs inputs per change

- **WHEN** bulk archive assesses delta specs for a selected change
- **THEN** it uses that change's `artifactPaths.specs.existingOutputPaths` as the complete delta-spec input
- **AND** does not infer delta specs from other artifacts

#### Scenario: Selected changes use different schemas

- **WHEN** a batch contains changes using different schemas
- **THEN** the skill evaluates `artifactPaths.specs.existingOutputPaths` separately for each change
- **AND** requests `specs` artifact instructions once for each change whose list contains delta specs, using that change and selected root
- **AND** obtains every required specs-instruction snapshot before the first main-spec write
- **AND** applies each returned rule set only to main specs produced from that change
- **AND** passes each change's specs-rule snapshot to its inline sync workflow without a duplicate instruction fetch

#### Scenario: A batch specs instruction lookup fails

- **WHEN** a required `openspec instructions specs --change "<name>" --json` lookup exits non-zero or does not return valid artifact-instruction JSON
- **THEN** the skill reports the affected change and instruction lookup error
- **AND** stops the whole batch before writing any main spec or moving any change
- **AND** does not treat the failed lookup as an absent artifact rule set

#### Scenario: A batch change has no specs outputs

- **WHEN** a selected change has no `artifactPaths.specs` entry or its `existingOutputPaths` list is empty
- **THEN** no spec sync or `specs` instruction lookup is performed for that change
- **AND** the change continues through the existing batch archive flow

#### Scenario: Batch artifact rules remain separate from archive guidance

- **WHEN** artifact instructions contain rules and archive instructions contain `operationGuidance`
- **THEN** artifact rules constrain spec content and form
- **AND** configured archive guidance remains optional additive advice for choices within the archive operation
- **AND** neither field is relabeled or merged into the other

#### Scenario: Batch has no artifact rules

- **WHEN** `specs` artifact instructions return no rules for a selected change
- **THEN** the existing batch conflict resolution and semantic merge behavior continue unchanged
