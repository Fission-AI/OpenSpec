## ADDED Requirements

### Requirement: Only Requirement-prefixed headers SHALL identify requirements
When parsing a spec's Requirements section or a change's ADDED/MODIFIED sections, the parser SHALL treat a level-3 header as a requirement only when it matches the canonical, case-insensitive header rule `### Requirement: <name>`. Other level-3 headers within those sections SHALL NOT be treated as requirements. All parsers (delta-block validation, main-spec validation, and the archive spec rebuild) SHALL use this same recognition rule.

#### Scenario: Stray level-3 divider is not a requirement
- **GIVEN** a Requirements section containing `### Documentation Requirements` followed by a valid `### Requirement: AI Application Documentation` block
- **WHEN** the spec is parsed
- **THEN** only `### Requirement: AI Application Documentation` SHALL be counted as a requirement
- **AND** `### Documentation Requirements` SHALL NOT produce a phantom requirement that fails `SHALL`/scenario validation

#### Scenario: Recognition is consistent across commands
- **WHEN** the same spec content is processed by `openspec validate <change>`, `openspec validate <spec>`, and the archive spec rebuild
- **THEN** all SHALL identify the same set of requirements

#### Scenario: REMOVED and RENAMED sections are unaffected
- **GIVEN** a change with `## REMOVED Requirements` or `## RENAMED Requirements` sections using their bullet-list or `FROM:`/`TO:` syntax
- **WHEN** the change is parsed
- **THEN** those requirements SHALL continue to be recognized by their existing dedicated parsing, independent of the level-3 header rule
