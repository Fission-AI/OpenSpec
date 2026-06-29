## ADDED Requirements

### Requirement: Only Requirement-prefixed headers SHALL identify requirements
When parsing a spec's Requirements section, the parser SHALL treat a level-3 header as a requirement only when its title begins with `Requirement:` (case-insensitive, after normalization). Other level-3 headers within the Requirements section SHALL NOT be treated as requirements.

#### Scenario: Stray level-3 divider is not a requirement
- **GIVEN** a Requirements section containing `### Documentation Requirements` followed by a valid `### Requirement: AI Application Documentation` block
- **WHEN** the spec is parsed
- **THEN** only `### Requirement: AI Application Documentation` SHALL be counted as a requirement
- **AND** `### Documentation Requirements` SHALL NOT produce a phantom requirement that fails `SHALL`/scenario validation

#### Scenario: Recognition is consistent across commands
- **WHEN** the same spec content is processed by `openspec validate` and by the rebuilt-spec validation in `openspec archive`
- **THEN** both SHALL identify the same set of requirements
