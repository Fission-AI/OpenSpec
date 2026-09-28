## ADDED Requirements

### Requirement: Requirement bodies SHALL be parsed in full for normative keywords
The validator SHALL detect `SHALL`/`MUST` across the entire requirement body, not only the first body line. Requirement-text extraction SHALL capture every body line from after the `### Requirement:` header up to the first Markdown header on a non-fenced line (a `#### Scenario:` header, or a stray `###` divider absorbed into a delta block), skipping blank lines and lines inside fenced code blocks. `**metadata**:` lines SHALL be skipped only when other body text remains; a body consisting solely of metadata lines SHALL be kept as the requirement text. Detection SHALL run over the full captured body. Canonical `### Requirement:` blocks with no body text SHALL NOT satisfy body-keyword validation from the header title alone; they SHALL receive the existing body-keyword hint when the keyword appears only in the header. The Markdown parser MAY still use the header title as display text for supported bare-header specs. The change-delta reader and the main-spec validator SHALL share this body extraction so they cannot diverge.

#### Scenario: Normative keyword on the second wrapped line (change and spec)
- **GIVEN** a requirement whose text wraps across two lines with `SHALL` on the second line
- **WHEN** running `openspec validate <id> --strict` for both a change delta and a main spec
- **THEN** both SHALL detect the keyword and SHALL NOT report a missing-`SHALL`/`MUST` error

#### Scenario: Metadata fields precede the description
- **GIVEN** a requirement whose body begins with `**ID**:`/`**Priority**:` lines before a `MUST` description
- **WHEN** running `openspec validate <spec-id> --strict`
- **THEN** validation SHALL skip the metadata lines, detect `MUST`, and pass — matching `openspec validate <change-id>`

#### Scenario: Requirement written entirely as a metadata line
- **GIVEN** a requirement whose whole body is `**Constraint**: The system MUST ...`
- **WHEN** running `openspec validate <id> --strict` for both a change delta and a main spec
- **THEN** both SHALL keep that line as the requirement text and detect the `MUST`

#### Scenario: Stray divider bounds the requirement body
- **GIVEN** a delta requirement followed by a stray `### Background` divider whose notes contain `MUST`
- **WHEN** running `openspec validate <change-id> --strict`
- **THEN** the requirement body SHALL end at the divider and the `MUST` in the notes SHALL NOT satisfy the keyword check

#### Scenario: Single-line requirement is unaffected
- **GIVEN** a requirement whose `SHALL` statement is on a single body line
- **WHEN** running `openspec validate <id> --strict`
- **THEN** validation behavior, messages, and displayed text SHALL be unchanged from before this change

### Requirement: Fenced code blocks SHALL NOT corrupt extraction or scenario counting
The validator and Markdown parser SHALL ignore lines inside fenced code blocks (` ``` ` or `~~~`) when extracting requirement body text, when locating the body-ending header boundary, and when counting scenarios. A fenced block before the prose line SHALL NOT make the fence marker the requirement text, and a `#### Scenario:` inside a fenced block SHALL NOT count as a real scenario.

#### Scenario: Fenced block before the prose line
- **GIVEN** a requirement whose body opens with a fenced code block containing `#`-comment lines, followed by the `SHALL` prose line
- **WHEN** the spec or change is validated
- **THEN** the captured requirement text SHALL be the prose line (not the fence marker) and validation SHALL pass

#### Scenario: Fenced scenario is not a real scenario
- **GIVEN** a requirement whose only `#### Scenario:` appears inside a fenced code example, with no real scenario
- **WHEN** running `openspec validate <change-id> --strict`
- **THEN** validation SHALL report the requirement as missing a scenario — the same result as `openspec validate <spec-id>`

### Requirement: A single normative-keyword predicate SHALL be used across readers
All `SHALL`/`MUST` detection SHALL use one predicate that matches `SHALL` or `MUST` as whole words (delimited by word boundaries, so a substring inside a longer word such as `MARSHALL` does not match), so the change-delta reader and the schema-based reader accept and reject identical text.

#### Scenario: Keyword detection agrees across readers
- **GIVEN** identical requirement body text validated once as a change delta and once as a main spec
- **WHEN** running `openspec validate` on each
- **THEN** both SHALL reach the same conclusion about whether the body contains a normative keyword

### Requirement: Non-canonical headers in delta sections SHALL be surfaced without changing recognition
When an `## ADDED`/`## MODIFIED Requirements` section in a change delta contains a level-3 header that is not a canonical `### Requirement:` header, `openspec validate <change>` SHALL emit an INFO-level note identifying it, because the delta reader will otherwise skip it silently. The note SHALL be derived from the headers the delta reader actually skips while parsing, so it describes the reader's real section and fence boundaries. This note SHALL NOT change which headers are recognized as requirements, and SHALL NOT change the `valid` result — including under `--strict`. This behavior applies only to change deltas: bare `### <statement>` headers in main specs are recognized requirements (see the scenario below) and SHALL NOT trigger such notes.

#### Scenario: Stray divider header is reported, not silently skipped
- **GIVEN** a delta whose `## ADDED Requirements` section contains `### Documentation Requirements` followed by a valid `### Requirement: …` block
- **WHEN** running `openspec validate <change-id> --strict`
- **THEN** validation SHALL emit an INFO note naming the stray `### Documentation Requirements` header
- **AND** the `valid` result SHALL be unchanged from current behavior (the INFO does not cause failure)

#### Scenario: Nameless requirement header gets a dedicated hint
- **GIVEN** a delta whose `## ADDED Requirements` section contains a bare `### Requirement:` header with no name
- **WHEN** running `openspec validate <change-id>`
- **THEN** the INFO note SHALL say the header is missing a requirement name (not suggest `### Requirement: Requirement:`)

#### Scenario: Bare requirement headers in main specs remain supported
- **GIVEN** a main spec whose requirements use bare `### <statement>` headers without the `Requirement:` prefix
- **WHEN** running `openspec validate <spec-id> --strict`
- **THEN** those headers SHALL continue to be recognized as requirements exactly as before this change
