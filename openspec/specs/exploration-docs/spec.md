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
The exploration document SHALL contain the following sections in order: a top-level heading with the topic, metadata (date, linked change if any), a Context section written at session start, an Observations section written by the assistant before any Q&A rounds, a Rounds section where Q&A questions are appended before the user answers them, and an Insights & Decisions section written at the end. There is no Open Questions section.

#### Scenario: Document created at session start
- **WHEN** an explore session begins
- **THEN** the document is created immediately with the heading, metadata, and Context section filled in
- **AND** the Observations section is present with a `<!-- Written by assistant before Round 1 -->` placeholder
- **AND** the Rounds section is present with a placeholder comment
- **AND** there is NO `## Open Questions` section in the template

#### Scenario: Observations section written before Round 1
- **WHEN** the skill writes to the document for the first time
- **THEN** the `## Observations` section is filled with codebase findings, diagrams, and framing
- **AND** `## Round 1` questions are appended immediately after in the same operation
- **AND** this all happens before the user has answered anything

#### Scenario: Q&A round appended before user answers
- **WHEN** a Q&A round begins
- **THEN** the round's questions are appended to the `## Rounds` section with the user's answer fields left blank
- **AND** the document is NOT rewritten from scratch — only appended to
- **AND** the user fills in the answers by editing the file directly

#### Scenario: Session ends with Insights & Decisions only
- **WHEN** the explore session concludes
- **THEN** the `## Insights & Decisions` section is written summarising all decisions made
- **AND** no `## Open Questions` section is written — unresolved questions are asked as a final round instead

### Requirement: Q&A log entry format
Each question in a Q&A round SHALL use `### QN.M — {Title}` headings, present checkbox options with one `[x]` pre-marked recommended option labelled with a reason, and include a freetext answer field that the user fills in directly.

#### Scenario: Q&A entry format in file
- **WHEN** the skill appends a Q&A question to the exploration file
- **THEN** the question uses a `### QN.M — {Question title}` heading
- **AND** lists 2–4 options as markdown checkboxes
- **AND** pre-marks the recommended option as `[x]` with a `← recommended: <reason>` label
- **AND** all other options are marked `[ ]`
- **AND** includes a freetext field: `> **Your answer / freetext:**` followed by a blank `>` line

#### Scenario: User answers by editing the file
- **WHEN** the user opens the exploration file to answer a round
- **THEN** they change the `[ ]` on their chosen option to `[x]` (and optionally uncheck the pre-marked recommended if they chose differently)
- **AND** fill in their freetext answer under `> **Your answer / freetext:**`
- **AND** signal readiness in chat ("next", "done", etc.)

#### Scenario: Recommended option is pre-selected for accept-default UX
- **WHEN** the skill appends a Q&A question to the exploration file
- **THEN** exactly one option is marked `[x]`
- **AND** that option is the recommended choice with `← recommended: <reason>` on the same line
- **AND** the user can accept the recommendation by leaving the checkbox unchanged and saying "next"

#### Scenario: Prose-only options are not allowed
- **WHEN** the skill writes a question under `## Rounds`
- **THEN** it MUST NOT use prose-only option lists (e.g., "Option A / Option B" without checkbox lines)
- **AND** it MUST NOT put `← recommended:` on an unchecked `[ ]` line
- **AND** it MUST NOT pre-select a non-recommended option with `[x]`
