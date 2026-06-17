## MODIFIED Requirements

### Requirement: YAML frontmatter scalar escaping
Command adapters that emit YAML frontmatter SHALL render scalar field values without unescaped control characters.

#### Scenario: Escape carriage returns in YAML frontmatter
- **WHEN** a generated YAML frontmatter scalar value contains a carriage return character
- **THEN** the emitted scalar SHALL be double quoted
- **AND** the carriage return SHALL be represented as the escaped `\r` sequence
- **AND** the generated YAML frontmatter SHALL not contain the raw carriage return inside the scalar value

#### Scenario: Preserve existing YAML scalar escaping
- **WHEN** a generated YAML frontmatter scalar value contains existing supported special characters such as a colon, double quote, backslash, or line feed
- **THEN** the emitted scalar SHALL preserve the existing double-quoted escaping behavior
