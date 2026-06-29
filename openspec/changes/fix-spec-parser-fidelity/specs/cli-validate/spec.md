## ADDED Requirements

### Requirement: Multi-line requirement bodies SHALL be parsed for normative keywords
The validator SHALL detect `SHALL`/`MUST` across the entire requirement body, not only the first body line. Requirement-text extraction SHALL capture every body line from after the `### Requirement:` header up to the first `#### Scenario:` header (skipping blank lines and `**metadata**:` lines), and normative-keyword detection SHALL run over the full captured body.

#### Scenario: Normative keyword on the second wrapped line
- **GIVEN** a requirement whose descriptive text wraps across two lines and whose `SHALL` keyword is on the second line
- **WHEN** running `openspec validate <change-id> --strict`
- **THEN** validation SHALL recognize the requirement as containing `SHALL` and NOT report `must contain SHALL or MUST`

#### Scenario: Single-line requirement unaffected
- **GIVEN** a requirement whose `SHALL` statement is on a single body line
- **WHEN** running `openspec validate <change-id> --strict`
- **THEN** validation behavior and messages SHALL be unchanged from before this change

### Requirement: Fenced code blocks SHALL be ignored during requirement-text extraction
The validator and markdown parser SHALL ignore lines inside fenced code blocks (` ``` ` or `~~~`) when extracting requirement body text. A `#`-prefixed line inside a fenced code block in a requirement body SHALL NOT truncate the captured text or be mistaken for a section header.

#### Scenario: Hash comment inside a fenced block in the requirement body
- **GIVEN** a requirement body that contains a fenced code block with lines beginning with `#` (for example a shell comment)
- **WHEN** the spec is parsed for validation
- **THEN** the full requirement body SHALL be captured, the requirement count SHALL be correct, and scenarios SHALL parse normally
