## ADDED Requirements

### Requirement: Requirement bodies SHALL be parsed in full for normative keywords
The validator SHALL detect `SHALL`/`MUST` across the entire requirement body, not only the first body line. Requirement-text extraction SHALL capture every body line from after the `### Requirement:` header up to the first `#### Scenario:` header, skipping blank lines, `**metadata**:` lines, and lines inside fenced code blocks. Normative-keyword detection SHALL run over the full captured body. The change-delta path and the main-spec path SHALL use the same extraction logic so they cannot diverge.

#### Scenario: Normative keyword on the second wrapped line (change and spec)
- **GIVEN** a requirement whose descriptive text wraps across two lines with `SHALL` on the second line
- **WHEN** running `openspec validate <id> --strict` for both a change delta and a main spec
- **THEN** both SHALL recognize the keyword and SHALL NOT report a missing-`SHALL`/`MUST` error

#### Scenario: Metadata fields precede the description
- **GIVEN** a requirement whose body begins with `**ID**:`/`**Priority**:` metadata lines before a `MUST` description
- **WHEN** running `openspec validate <spec-id> --strict`
- **THEN** validation SHALL skip the metadata lines, detect `MUST` in the description, and pass — matching the existing behavior of `openspec validate <change-id>`

#### Scenario: Single-line requirement is unaffected
- **GIVEN** a requirement whose `SHALL` statement is on a single body line
- **WHEN** running `openspec validate <id> --strict`
- **THEN** validation behavior and messages SHALL be unchanged from before this change

### Requirement: Fenced code blocks SHALL NOT corrupt requirement-text extraction
The validator and markdown parser SHALL ignore lines inside fenced code blocks (` ``` ` or `~~~`) when extracting requirement body text and when locating the first `#### Scenario:` boundary. A fenced code block appearing before the prose line of a requirement SHALL NOT cause the fence marker or a `#`-comment inside it to be taken as the requirement text.

#### Scenario: Fenced block before the prose line
- **GIVEN** a requirement whose body opens with a fenced code block containing `#`-comment lines, followed by the `SHALL` prose line
- **WHEN** the spec or change is validated
- **THEN** the captured requirement text SHALL be the prose line (not the fence marker), and validation SHALL pass

### Requirement: A single normative-keyword predicate SHALL be used across validation paths
All `SHALL`/`MUST` detection SHALL use one predicate that matches `SHALL` or `MUST` as whole words, so the delta-spec validation path and the schema-based validation path accept and reject identical text.

#### Scenario: Keyword detection agrees across paths
- **GIVEN** identical requirement body text validated once as a change delta and once as a main spec
- **WHEN** running `openspec validate` on each
- **THEN** both SHALL reach the same conclusion about whether the body contains a normative keyword
