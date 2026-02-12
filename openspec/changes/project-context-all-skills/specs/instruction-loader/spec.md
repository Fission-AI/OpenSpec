## MODIFIED Requirements

### Requirement: Template Enrichment
The system SHALL enrich templates with change-specific context.

#### Scenario: Include artifact metadata
- **WHEN** instructions are generated for an artifact
- **THEN** the output includes change name, artifact ID, schema name, and output path

#### Scenario: Include dependency status
- **WHEN** an artifact has dependencies
- **THEN** the output shows each dependency with completion status (done/missing)

#### Scenario: Include unlocked artifacts
- **WHEN** instructions are generated
- **THEN** the output includes which artifacts become available after this one

#### Scenario: Root artifact indicator
- **WHEN** an artifact has no dependencies
- **THEN** the dependency section indicates this is a root artifact

#### Scenario: Include project context in apply instructions
- **WHEN** `generateApplyInstructions()` is called for a change
- **THEN** the output includes a `context` field read from `config.yaml` via `readProjectConfig()`

#### Scenario: Apply instructions with no config
- **WHEN** `generateApplyInstructions()` is called and no `config.yaml` exists
- **THEN** the `context` field is `undefined` and the rest of the apply instructions are unaffected

#### Scenario: Apply instructions text output includes project context
- **WHEN** `printApplyInstructionsText()` is called with a non-empty `context` field
- **THEN** the text output includes a `<project_context>` block with the context content, matching the format used by artifact instructions
