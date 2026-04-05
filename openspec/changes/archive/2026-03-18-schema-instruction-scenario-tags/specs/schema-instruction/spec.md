# schema-instruction — Delta Spec (schema-instruction-scenario-tags)

## ADDED Requirements

### Requirement: Schema Instruction Completeness

The `spec-driven` schema's `specs` artifact instruction MUST document all delta spec features supported by the merge engine, including scenario-level merge tags.

#### Scenario: Instruction includes scenario-level tag guidance

- WHEN an AI agent runs `openspec instructions specs --change <name>`
- THEN the returned instruction MUST document scenario-level `(MODIFIED)` and `(REMOVED)` tags
- AND the instruction MUST explain that without tags, MODIFIED requirements use full-block replacement
- AND the instruction MUST warn that full-block replacement destroys scenarios not included in the delta
- AND the instruction MUST provide an example of MODIFIED with scenario tags

#### Scenario: Instruction distinguishes full-block vs scenario-level approaches

- WHEN describing the MODIFIED requirements workflow
- THEN the instruction MUST present both approaches: full-block copy and scenario-level tags
- AND the instruction MUST recommend scenario-level tags when the main spec requirement has multiple scenarios
- AND the instruction MUST warn against using full-block approach with partial scenarios
