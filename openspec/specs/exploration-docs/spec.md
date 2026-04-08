# exploration-docs Specification

## Purpose
Define the structure and storage convention for exploration documents created during `/enpalspec:explore` sessions.

## Requirements

### Requirement: Exploration doc path convention
The system SHALL store exploration documents at `openspec/explorations/<yyyy-mm>/exploration-<yyyy-mm-dd>-<topic>.md` relative to the project root, where `<topic>` is a kebab-case summary of the exploration subject derived from the user's input.

#### Scenario: Path uses date subfolder
- **WHEN** an exploration session starts on 2026-04-07 for topic "auth-redesign"
- **THEN** the exploration doc is created at `openspec/explorations/2026-04/exploration-2026-04-07-auth-redesign.md`
- **AND** the path is constructed using `path.join()` with platform-appropriate separators

#### Scenario: Path uses correct date subfolder on month boundary
- **WHEN** an exploration session starts on 2026-05-01
- **THEN** the exploration doc is created under `openspec/explorations/2026-05/`

### Requirement: Exploration doc structure
The exploration document SHALL contain the following sections in order: a top-level heading with the topic, metadata (date, linked change if any), a Context section written at the start, a Rounds section appended after each Q&A round, an Insights & Decisions section written at the end, and an Open Questions section written at the end.

#### Scenario: Document created at session start
- **WHEN** an explore session begins
- **THEN** the document is created immediately with the heading, metadata, and Context section filled in
- **AND** the Rounds section is present but empty

#### Scenario: Q&A round appended
- **WHEN** the user completes a Q&A round
- **THEN** a new `### Round N — <Theme>` subsection is appended under Rounds
- **AND** each question in the round is recorded with its title, options presented, and the selected answer
- **AND** the document is NOT rewritten from scratch — only appended to

#### Scenario: Session ends with summary
- **WHEN** the explore session concludes
- **THEN** the Insights & Decisions section is written summarising key decisions made
- **AND** the Open Questions section is written listing unresolved items

### Requirement: Q&A log entry format
Each question in the Q&A log SHALL record: the question number and title as a heading, the question text, all options presented (with the recommended option marked), and the selected answer with any user notes.

#### Scenario: Q&A entry captures selection
- **WHEN** user selects option B for question Q1.2
- **THEN** the log entry shows all options, marks B as selected, and includes any freetext the user provided
- **AND** the recommended option is visually marked in the options list
