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
