## ADDED Requirements

### Requirement: Archive rebuilt-spec validation SHALL match validate semantics
The rebuilt-spec validation performed during `openspec archive` SHALL recognize requirements using the same rules as `openspec validate`. A change that passes `openspec validate --strict` SHALL NOT newly fail validation at archive time due to requirement-recognition differences between the delta-block parser and the full-spec parser.

#### Scenario: Stray non-requirement header does not block archive
- **GIVEN** a change whose spec deltas pass `openspec validate --strict` and whose Requirements section contains a stray level-3 header that is not a `### Requirement:` header
- **WHEN** running `openspec archive <change-id>`
- **THEN** the rebuilt-spec validation SHALL NOT treat the stray header as a phantom requirement and SHALL NOT report `must contain SHALL or MUST` or `must have at least one scenario` for it

#### Scenario: Genuinely invalid spec still fails consistently
- **GIVEN** a change whose spec contains a real `### Requirement:` block with no `SHALL`/`MUST` and no scenario
- **WHEN** running both `openspec validate <change-id> --strict` and `openspec archive <change-id>`
- **THEN** both commands SHALL report the same requirement as invalid
