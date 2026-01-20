## MODIFIED Requirements

### Requirement: Parser SHALL handle cross-platform line endings
The markdown parser SHALL correctly identify sections regardless of line ending format (LF, CRLF, CR). Additionally, the parser SHALL handle variations in whitespace around requirement headers to ensure robust parsing across different text editors and platforms.

#### Scenario: Required sections parsed with CRLF line endings
- **GIVEN** a change proposal markdown saved with CRLF line endings
- **AND** the document contains `## Why` and `## What Changes`
- **WHEN** running `openspec validate <change-id>`
- **THEN** validation SHALL recognize the sections and NOT raise parsing errors

#### Scenario: Requirement headers with variable whitespace
- **GIVEN** a delta spec file with `###  Requirement:` (extra space) or `###Requirement:` (no space)
- **WHEN** running `openspec validate <change-id>`
- **THEN** the parser SHALL recognize these as valid requirement headers
- **AND** validation SHALL parse the requirement blocks successfully

#### Scenario: Mixed line endings within file
- **GIVEN** a delta spec file with inconsistent line endings (some LF, some CRLF)
- **WHEN** running `openspec validate <change-id>`
- **THEN** the parser SHALL normalize all line endings before processing
- **AND** validation SHALL parse all requirement blocks correctly

### Requirement: Validation SHALL provide actionable remediation steps
Validation output SHALL include specific guidance to fix each error, including expected structure, example headers, and suggested commands to verify fixes. Error messages SHALL provide detailed diagnostic information when parsing fails.

#### Scenario: No deltas found in change
- **WHEN** validating a change with zero parsed deltas
- **THEN** show error "No deltas found" with guidance:
  - Explain that change specs must include `## ADDED Requirements`, `## MODIFIED Requirements`, `## REMOVED Requirements`, or `## RENAMED Requirements`
  - Remind authors that files must live under `openspec/changes/{id}/specs/<capability>/spec.md`
  - Include an explicit note: "Spec delta files cannot start with titles before the operation headers"
  - Suggest running `openspec change show {id} --json --deltas-only` for debugging

#### Scenario: Delta sections found but no requirements parsed
- **WHEN** validation detects delta section headers (e.g., `## ADDED Requirements`) but parses zero requirement blocks
- **THEN** show error indicating which sections were found but empty
- **AND** include diagnostic details:
  - Expected requirement header format: `### Requirement: Description`
  - List the first few lines after each section header (up to 5 lines) to aid debugging
  - Note that whitespace must be consistent and line endings normalized
  - Suggest checking for invisible characters or encoding issues
- **AND** suggest running `openspec show {id} --json --deltas-only` to verify parser behavior

#### Scenario: Missing required sections
- **WHEN** a required section is missing
- **THEN** include expected header names and a minimal skeleton:
  - For Spec: `## Purpose`, `## Requirements`
  - For Change: `## Why`, `## What Changes`
  - Provide an example snippet of the missing section with placeholder prose ready to copy
  - Mention the quick-reference section in `openspec/AGENTS.md` as the authoritative template

#### Scenario: Missing requirement descriptive text
- **WHEN** a requirement header lacks descriptive text before scenarios
- **THEN** emit an error explaining that `### Requirement:` lines must be followed by narrative text before any `#### Scenario:` headers
  - Show compliant example: "### Requirement: Foo" followed by "The system SHALL ..."
  - Suggest adding 1-2 sentences describing the normative behavior prior to listing scenarios
  - Reference the pre-validation checklist in `openspec/AGENTS.md`

## ADDED Requirements

### Requirement: Parser SHALL provide diagnostic logging for parse failures
When the parser encounters malformed requirement blocks, it SHALL collect diagnostic information to help authors identify the root cause without requiring deep knowledge of parser internals.

#### Scenario: Log lines that fail requirement header regex
- **WHEN** the parser scans a delta section and encounters lines that almost match the requirement header pattern
- **THEN** the parser SHALL log (at debug level or include in validation output) lines that:
  - Start with `###` but don't match the full pattern
  - Have unexpected characters or whitespace
  - May be missing the "Requirement:" keyword
- **AND** these logs SHALL be available when validation fails to parse requirements

#### Scenario: Provide line numbers in error messages
- **WHEN** validation fails to parse requirement blocks from a section
- **THEN** error messages SHALL include:
  - The line number range where the section begins
  - Line numbers of any lines that triggered regex near-misses
  - A sample of the raw text (escaped/quoted) to show hidden characters
