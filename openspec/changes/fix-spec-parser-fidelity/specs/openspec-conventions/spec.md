## ADDED Requirements

### Requirement: Requirement recognition SHALL use the canonical header rule consistently
All parsers — change-delta validation, main-spec validation, and the archive spec rebuild — SHALL recognize a level-3 header as a requirement only when it matches the canonical, case-insensitive rule `### Requirement: <name>`. Other level-3 headers within a Requirements/ADDED/MODIFIED section SHALL NOT be treated as requirements. This tightens the previously permissive main-spec parser (which accepted any `### <text>` header) to match the rule already enforced by the delta parser, the convention, and `specs-apply`.

#### Scenario: Stray level-3 divider is not a requirement
- **GIVEN** a Requirements section containing `### Documentation Requirements` followed by a valid `### Requirement: AI Application Documentation` block
- **WHEN** the spec is parsed by any command
- **THEN** only `### Requirement: AI Application Documentation` SHALL be counted as a requirement
- **AND** `### Documentation Requirements` SHALL NOT produce a phantom requirement that fails `SHALL`/scenario validation

#### Scenario: Recognition is consistent across commands
- **WHEN** the same spec content is processed by `openspec validate <change>`, `openspec validate <spec>`, and the archive spec rebuild
- **THEN** all SHALL identify the same set of requirements

#### Scenario: Non-conventional bare headers require migration
- **GIVEN** a legacy spec that used a bare `### <text>` header (without the `Requirement:` prefix) to declare a requirement
- **WHEN** the spec is parsed after this change
- **THEN** that header SHALL no longer be recognized as a requirement
- **AND** the change SHALL ship a changelog note instructing authors to use `### Requirement: <name>` as the convention already requires

#### Scenario: REMOVED and RENAMED sections are unaffected
- **GIVEN** a change with `## REMOVED Requirements` or `## RENAMED Requirements` sections using their bullet-list or `FROM:`/`TO:` syntax
- **WHEN** the change is parsed
- **THEN** those requirements SHALL continue to be recognized by their existing dedicated parsing, independent of the level-3 header rule
