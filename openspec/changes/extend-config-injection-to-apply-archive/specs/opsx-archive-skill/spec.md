## ADDED Requirements

### Requirement: Load current archive operation inputs

The `/opsx:archive` skill SHALL request current archive operation inputs after resolving the target change and selected planning root, while preserving its existing archive workflow.

#### Scenario: Archive context and guidance are configured

- **WHEN** the skill has selected a change
- **AND** current config contains project context and `operations.archive.guidance`
- **THEN** the skill calls `openspec instructions archive --change "<name>" --json` with the selected-root context
- **AND** uses returned context as project background
- **AND** uses returned operation guidance as additive advice for the archive workflow

#### Scenario: Archive operation inputs are absent

- **WHEN** archive instruction output omits context and operation guidance
- **THEN** the skill continues with its existing archive workflow

#### Scenario: Archive context or guidance conflicts with the workflow

- **WHEN** returned context or operation guidance conflicts with a built-in archive step, explicit user choice, resolved path, or command contract
- **THEN** the generated skill identifies context and operation guidance as advisory inputs separate from built-in steps and CLI-derived values
- **AND** this change leaves existing CLI checks, resolved paths, and command contracts unchanged
- **AND** the template tells the agent not to infer replacement paths, skipped prompts, or command flags from either advisory field
- **AND** the system does not represent that prompt-level precedence as an enforceable check

#### Scenario: Archive uses guidance as input only

- **WHEN** the skill receives context or operation guidance
- **THEN** it does not copy those fields verbatim into specs, change artifacts, or archive summaries unless separately requested by the user

### Requirement: Preserve archive execution behavior

The `/opsx:archive` skill SHALL keep its existing completion checks, task checks, spec-sync decision, confirmation behavior, archive move, and completion summary in this change.

#### Scenario: Runtime inputs are loaded

- **WHEN** archive instructions return configured inputs
- **THEN** no archive execution phase, filesystem operation, or user decision is added, removed, or reordered solely by this change

### Requirement: Carry artifact rules into archive-driven spec sync

The `/opsx:archive` skill SHALL fetch current artifact instructions before archive-driven spec sync writes an artifact and SHALL use the returned artifact rules only to constrain that artifact.

#### Scenario: Resolve the artifact that owns each delta spec

- **WHEN** archive has discovered concrete delta spec paths for a selected change
- **THEN** the skill matches each path against `artifactPaths.<id>.existingOutputPaths` from that change's status output
- **AND** requires each delta path to match exactly one owning artifact ID
- **AND** groups delta paths by owner instead of assuming the owner ID is `specs`

#### Scenario: Delta spec ownership is missing or ambiguous

- **WHEN** a concrete delta spec path matches zero or multiple artifact IDs
- **THEN** the skill reports the path and candidate owners
- **AND** stops before writing any main spec or moving the change

#### Scenario: Archive sync writes a spec artifact

- **WHEN** delta specs exist and the user chooses to sync them during archive
- **THEN** the skill requests current instructions once for each owning artifact ID, using the selected change and planning root
- **AND** applies the returned artifact rules while semantically merging the delta into the main spec
- **AND** keeps artifact rules separate from archive `operationGuidance`
- **AND** passes the owner-to-rules snapshot to the inline sync workflow so that workflow does not fetch the same instructions again

#### Scenario: Artifact rules are absent

- **WHEN** archive-driven spec sync receives no artifact rules for the artifact being written
- **THEN** the existing semantic merge behavior continues unchanged

#### Scenario: Artifact rules contain operation-like advice

- **WHEN** an artifact rule describes archive paths, prompts, command flags, or unrelated workflow steps
- **THEN** the generated skill limits that rule to the content and form of the artifact being written
- **AND** existing archive paths, prompts, CLI checks, and command contracts remain unchanged

#### Scenario: Artifact rule text is consumed

- **WHEN** archive-driven spec sync applies artifact rules
- **THEN** the rules guide the resulting artifact without being copied verbatim into that artifact or the archive summary
