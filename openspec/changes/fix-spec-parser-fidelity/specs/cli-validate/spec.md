## ADDED Requirements

### Requirement: Multi-line requirement bodies SHALL be parsed for normative keywords
The validator SHALL detect `SHALL`/`MUST` across the entire requirement body, not only the first body line. Requirement-text extraction SHALL capture every body line from after the `### Requirement:` header up to the first `#### Scenario:` header (skipping blank lines and `**metadata**:` lines), and normative-keyword detection SHALL run over the full captured body. Both the change-delta validation path and the main-spec validation path SHALL use the same extraction logic.

#### Scenario: Normative keyword on the second wrapped line of a change delta
- **GIVEN** a delta requirement whose descriptive text wraps across two lines and whose `SHALL` keyword is on the second line
- **WHEN** running `openspec validate <change-id> --strict`
- **THEN** validation SHALL recognize the requirement as containing `SHALL` and SHALL NOT report `must contain SHALL or MUST`

#### Scenario: Normative keyword on the second wrapped line of a main spec
- **GIVEN** a main spec requirement whose `SHALL` statement wraps onto the second body line
- **WHEN** running `openspec validate <spec-id> --strict`
- **THEN** validation SHALL recognize the keyword and SHALL NOT report `Requirement must contain SHALL or MUST keyword`

#### Scenario: Single-line requirement is unaffected
- **GIVEN** a requirement whose `SHALL` statement is on a single body line
- **WHEN** running `openspec validate <id> --strict`
- **THEN** validation behavior, messages, and the displayed requirement text SHALL be unchanged from before this change

### Requirement: Fenced code blocks SHALL be ignored during requirement-text extraction
The validator and markdown parser SHALL ignore lines inside fenced code blocks (` ``` ` or `~~~`) when extracting requirement body text and when locating the first `#### Scenario:` boundary. A `#`-prefixed line inside a fenced code block in a requirement body SHALL NOT truncate the captured body or be mistaken for a header or scenario boundary.

#### Scenario: Hash comment inside a fenced block in the requirement body
- **GIVEN** a requirement whose body spans multiple lines and contains a fenced code block with lines beginning with `#` (for example a shell comment)
- **WHEN** the spec is parsed for validation
- **THEN** the full requirement body SHALL be captured, the requirement count SHALL be correct, and scenarios SHALL parse normally

### Requirement: A single normative-keyword predicate SHALL be used across validation paths
All `SHALL`/`MUST` detection SHALL use one predicate so that the delta-spec validation path and the schema-based validation path accept and reject identical text. The predicate SHALL match `SHALL` or `MUST` as whole words.

#### Scenario: Keyword detection agrees across paths
- **GIVEN** identical requirement body text validated once as a change delta and once as a main spec
- **WHEN** running `openspec validate` on each
- **THEN** both SHALL reach the same conclusion about whether the body contains a normative keyword
