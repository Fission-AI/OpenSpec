## ADDED Requirements

### Requirement: Creating ADR Changes

Change proposals SHALL support creating and modifying Architectural Decision Records (ADRs) using the delta-based approach.

#### Scenario: Creating change with ADR deltas

- **WHEN** creating a change proposal that includes architectural decisions
- **THEN** create ADR delta files under `openspec/changes/[change-name]/adrs/[decision-name]/adr.md`
- **AND** use delta sections: `## ADDED Decisions`, `## MODIFIED Decisions`, `## REMOVED Decisions`, `## RENAMED Decisions`
- **AND** follow the same delta pattern as spec changes

#### Scenario: Scaffolding new ADR in a change

- **WHEN** adding a new architectural decision in a change
- **THEN** create directory `changes/[change-name]/adrs/[decision-name]/`
- **AND** create both files:
  - `decision.md` with `## ADDED Decisions` section and summary
  - `adr.md` with `## ADDED Decisions` section and full rationale
- **AND** include complete content in both files following required formats
- **AND** follow the project's templates if available

#### Scenario: Modifying existing ADR in a change

- **WHEN** updating an existing architectural decision
- **THEN** reference the existing ADR by name under `## MODIFIED Decisions`
- **AND** include the complete updated ADR content
- **AND** use the same decision name header as in current ADR
- **AND** optionally annotate changes with inline comments for reviewers

#### Scenario: Removing ADR in a change

- **WHEN** deprecating an architectural decision
- **THEN** list it under `## REMOVED Decisions`
- **AND** include the decision name for identification
- **AND** document the reason for removal
- **AND** reference any superseding ADR if the decision is being replaced

#### Scenario: Combining spec and ADR changes

- **WHEN** a change affects both functional specs and architectural decisions
- **THEN** include both spec deltas in `changes/[change-name]/specs/`
- **AND** include ADR deltas in `changes/[change-name]/adrs/`
- **AND** reference ADRs from relevant spec design.md files
- **AND** explain in proposal.md how specs and ADRs relate

#### Scenario: Referencing ADRs in design.md

- **WHEN** a change's implementation depends on architectural decisions
- **THEN** reference relevant ADRs in the change's `design.md`
- **AND** use format: "See ADR: [decision-name]"
- **AND** explain how the ADR influences the implementation approach

### Requirement: Extracting Architectural Decisions from Requests

AI agents SHALL proactively identify when user requests contain architectural decisions and create ADRs automatically.

#### Scenario: Identifying architectural decisions in feature requests

- **WHEN** AI processes a user request for a new feature
- **THEN** analyze the request for architectural implications:
  - Technology choices (e.g., "session storage" implies database selection)
  - Infrastructure needs (e.g., "real-time updates" implies WebSocket/SSE decision)
  - Security requirements (e.g., "user authentication" implies auth method decision)
  - Cross-cutting concerns (e.g., "track events" implies logging/analytics strategy)
- **AND** identify decisions that should be ADRs vs spec implementation details

#### Scenario: Creating ADR and spec in same change

- **WHEN** AI detects an architectural decision is needed for a spec
- **THEN** create both in the same change:
  - ADR under `changes/[name]/adrs/[decision]/`
  - Spec under `changes/[name]/specs/[capability]/`
- **AND** explain in proposal.md: "This feature requires [architectural decision], so including ADR"
- **AND** structure tasks.md with dependency: ADR review → spec implementation
- **AND** have spec's design.md reference the ADR

#### Scenario: Example - login feature with storage

- **WHEN** user requests "create a login feature with session storage"
- **THEN** AI SHALL detect:
  - Functional requirement: login feature (spec)
  - Architectural decision: database for sessions (ADR)
- **AND** check: does an ADR for data storage exist?
  - If YES: reference existing ADR in spec
  - If NO: create new ADR in same change
- **AND** create change containing both ADR and spec

#### Scenario: Reusing existing ADRs

- **WHEN** AI detects an architectural decision is needed
- **THEN** check if a relevant ADR already exists
- **AND** if ADR exists and applies, reference it from the spec
- **AND** if ADR exists but needs updating, modify it in the change
- **AND** only create new ADR if no relevant one exists

#### Scenario: Determining ADR vs implementation detail

- **WHEN** deciding whether a decision warrants an ADR
- **THEN** create ADR if the decision:
  - Affects or could affect multiple specs
  - Involves technology/infrastructure selection
  - Has multiple reasonable alternatives
  - Has long-term architectural implications
- **AND** keep as implementation detail if the decision:
  - Only affects one capability
  - Is purely functional/behavioral
  - Is a standard implementation pattern
  - Unlikely to be reused elsewhere

### Requirement: ADR Template Usage

When creating new ADRs, the system SHALL support using templates to ensure consistency.

#### Scenario: Using default ADR template

- **WHEN** scaffolding a new ADR and no custom template exists
- **THEN** use the built-in default ADR template
- **AND** populate placeholders with example content
- **AND** include all standard sections

#### Scenario: Using custom ADR template

- **WHEN** scaffolding a new ADR and `openspec/templates/adr.md` exists
- **THEN** use the custom template instead of the default
- **AND** respect project-specific sections and formatting
- **AND** preserve template placeholders for author to fill in

#### Scenario: Manual ADR creation without template

- **WHEN** an author creates an ADR manually without scaffolding
- **THEN** validation SHALL still check for required sections
- **AND** the ADR SHALL follow the standard format regardless of template
