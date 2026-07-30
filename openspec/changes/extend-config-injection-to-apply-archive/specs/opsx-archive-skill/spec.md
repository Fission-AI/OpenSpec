## ADDED Requirements

### Requirement: Load current archive operation inputs

The `/opsx:archive` skill SHALL request current archive operation inputs after resolving the target change and selected planning root, while preserving its existing archive workflow.

#### Scenario: Archive context and guidance are configured

- **WHEN** the skill has selected a change
- **AND** current config contains project context and `operations.archive.guidance`
- **THEN** the skill calls `openspec instructions archive --change "<name>" --json` with the selected-root context
- **AND** treats context as a required prompt-level instruction input
- **AND** tells the agent to read it and apply relevant project facts, conventions, and constraints
- **AND** treats operation guidance as optional additive advice
- **AND** tells the agent to read and consider it and follow entries that are applicable and compatible with the built-in archive workflow

#### Scenario: Archive operation inputs are absent

- **WHEN** archive instruction output omits context and operation guidance
- **THEN** the skill continues with its existing archive workflow

#### Scenario: Archive instruction lookup fails

- **WHEN** `openspec instructions archive --change "<name>" --json` exits non-zero or does not return valid archive-instruction JSON
- **THEN** the skill reports the instruction lookup error
- **AND** stops before inspecting or writing specs or moving the change
- **AND** does not treat the failed lookup as absent context or operation guidance

#### Scenario: Archive context or guidance conflicts with the workflow

- **WHEN** returned context or operation guidance conflicts with a built-in archive step, explicit user choice, resolved path, or command contract
- **THEN** the generated skill keeps required project context and advisory operation guidance separate from built-in steps and CLI-derived values
- **AND** tells the agent to report context conflicts
- **AND** tells the agent to explain why conflicting or inapplicable operation guidance was not followed
- **AND** this change leaves existing CLI checks, resolved paths, and command contracts unchanged
- **AND** the template tells the agent not to infer replacement paths, skipped prompts, or command flags from either field
- **AND** the system does not represent that prompt-level precedence as an enforceable check

#### Scenario: Archive consumes runtime instructions without copying them

- **WHEN** the skill receives context or operation guidance
- **THEN** it does not copy those fields verbatim into specs, change artifacts, or archive summaries unless separately requested by the user

### Requirement: Preserve archive execution behavior

The `/opsx:archive` skill SHALL keep its existing completion checks, task checks, spec-sync decision, confirmation behavior, archive move, and completion summary in this change.

#### Scenario: Runtime inputs are loaded

- **WHEN** archive instructions return configured inputs
- **THEN** no archive execution phase, filesystem operation, or user decision is added, removed, or reordered solely by this change

### Requirement: Carry artifact rules into archive-driven spec sync

The `/opsx:archive` skill SHALL fetch current `specs` artifact instructions before archive-driven spec sync writes main specs and SHALL use the returned artifact rules only to constrain those specs.

#### Scenario: Archive discovers delta specs from the specs artifact

- **WHEN** archive assesses delta specs for a selected change
- **THEN** it uses `artifactPaths.specs.existingOutputPaths` from that change's status output as the complete delta-spec input
- **AND** does not infer delta specs from other artifacts

#### Scenario: Schema or change has no specs outputs

- **WHEN** `artifactPaths.specs` is absent or its `existingOutputPaths` list is empty
- **THEN** archive continues without a spec-sync prompt
- **AND** does not request `specs` artifact instructions

#### Scenario: Archive sync writes main specs

- **WHEN** `artifactPaths.specs.existingOutputPaths` contains delta specs
- **AND** the user chooses to sync them during archive
- **THEN** the skill requests `openspec instructions specs --change "<name>" --json` once using the selected change and planning root
- **AND** applies the returned artifact rules while semantically merging the delta into the main spec
- **AND** keeps artifact rules separate from archive `operationGuidance`
- **AND** passes the specs-rule snapshot to the inline sync workflow so that workflow does not fetch the same instructions again

#### Scenario: Specs instruction lookup fails

- **WHEN** delta specs exist and the user chooses to sync them during archive
- **AND** `openspec instructions specs --change "<name>" --json` exits non-zero or does not return valid artifact-instruction JSON
- **THEN** the skill reports the instruction lookup error
- **AND** stops before modifying any main spec or moving the change
- **AND** does not treat the failed lookup as an absent artifact rule set

#### Scenario: User archives without syncing

- **WHEN** delta specs exist and the user explicitly chooses archive without syncing
- **THEN** the skill does not request `specs` artifact instructions for a merge
- **AND** the existing archive-without-sync path continues

#### Scenario: Artifact rules are absent

- **WHEN** archive-driven spec sync receives no rules from `specs` artifact instructions
- **THEN** the existing semantic merge behavior continues unchanged

#### Scenario: Artifact rules contain operation-like advice

- **WHEN** an artifact rule describes archive paths, prompts, command flags, or unrelated workflow steps
- **THEN** the generated skill limits that rule to the content and form of the artifact being written
- **AND** existing archive paths, prompts, CLI checks, and command contracts remain unchanged

#### Scenario: Artifact rule text is consumed

- **WHEN** archive-driven spec sync applies artifact rules
- **THEN** the rules guide the resulting artifact without being copied verbatim into that artifact or the archive summary
