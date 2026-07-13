## ADDED Requirements

### Requirement: Brief Workflow Invocation
The system SHALL provide an optional `/opsx:brief` workflow that generates a human-readable HTML brief for an OpenSpec change.

#### Scenario: Brief with change name
- **WHEN** the user invokes `/opsx:brief <change-name>`
- **THEN** the agent SHALL generate a brief for that change
- **AND** write it to `openspec/changes/<change-name>/brief.html`

#### Scenario: Brief without change name
- **WHEN** the user invokes `/opsx:brief` without a change name
- **THEN** the agent SHALL select a change using the same change-selection conventions as other OPSX change workflows
- **AND** prompt the user when the change is ambiguous

### Requirement: Artifact-Based Synthesis
The brief workflow SHALL synthesize content from existing OpenSpec artifacts without making the brief authoritative.

#### Scenario: Load change artifacts
- **WHEN** generating the brief
- **THEN** the agent SHALL run `openspec status --change "<name>" --json`
- **AND** run `openspec instructions apply --change "<name>" --json`
- **AND** read the artifact paths listed in `contextFiles`

#### Scenario: Missing artifacts
- **WHEN** some expected artifacts are missing
- **THEN** the brief SHALL still be generated from available artifacts
- **AND** identify missing or unspecified information instead of inventing it

#### Scenario: Source attribution
- **WHEN** the brief states a claim derived from an artifact
- **THEN** the brief SHALL include source attribution to the relevant artifact path or artifact id

#### Scenario: Source artifact coverage
- **WHEN** generating the source artifact index
- **THEN** the brief SHALL include every file path returned in `contextFiles`
- **AND** SHALL NOT silently omit delta spec files or schema-specific artifacts

#### Scenario: Inferred impacts
- **WHEN** the brief includes affected modules, file areas, behavior changes, risks, or questions not explicitly stated by artifacts
- **THEN** the brief SHALL label them as inference

### Requirement: HTML Brief Content
The generated brief SHALL be concise, readable, and review-oriented.

#### Scenario: Required sections
- **WHEN** the brief is generated
- **THEN** it SHALL include sections for:
  - what the change does
  - explicit non-goals
  - user-visible behavior changes
  - affected modules or file areas
  - key design decisions and trade-offs
  - implementation order
  - testing and verification plan
  - risks and questions requiring user confirmation
  - source artifact index

#### Scenario: Static local HTML
- **WHEN** writing `brief.html`
- **THEN** the file SHALL be standalone static HTML
- **AND** SHALL NOT depend on external JavaScript, CSS, fonts, CDN links, images, or network resources
- **AND** SHALL use system fonts instead of remote fonts

#### Scenario: Generic OpenSpec output
- **WHEN** writing `brief.html`
- **THEN** the file SHALL NOT include unrelated product names, project names, footers, or branding unless present in the source artifacts
- **AND** SHALL NOT include agent- or harness-specific paths or labels unless present in the source artifacts

### Requirement: Optional Workflow Installation
The brief workflow SHALL be available for custom profile selection but not installed by the default core profile.

#### Scenario: Core profile
- **WHEN** OpenSpec resolves the default `core` workflow profile
- **THEN** `brief` SHALL NOT be included

#### Scenario: Custom profile
- **WHEN** the user selects `brief` in a custom workflow profile
- **THEN** OpenSpec SHALL generate the corresponding skill and command files according to the configured delivery mode

### Requirement: Best-Effort Opening
The brief workflow SHALL attempt to open the generated HTML file without treating opener failures as brief generation failures.

#### Scenario: Open succeeds
- **WHEN** the agent writes `brief.html`
- **AND** the host opener command succeeds
- **THEN** the workflow SHALL report the generated file path and that it was opened

#### Scenario: Open fails
- **WHEN** the host opener command fails or is unavailable
- **THEN** the workflow SHALL report the generated file path clearly
- **AND** SHALL NOT treat the opener failure as a failed brief generation
