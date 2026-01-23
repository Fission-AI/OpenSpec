## ADDED Requirements

### Requirement: ADR Directory Structure

The system SHALL maintain a dedicated directory structure for Architectural Decision Records (ADRs) parallel to functional specifications, using a two-file approach for context efficiency.

#### Scenario: Initializing ADR structure

- **WHEN** an OpenSpec project is initialized or updated
- **THEN** it SHALL include an `openspec/adrs/` directory
- **AND** each ADR SHALL be stored in `openspec/adrs/[decision-name]/` with two files:
  - `decision.md` - Concise summary (always loaded into AI context)
  - `adr.md` - Full rationale and analysis (loaded on-demand)
- **AND** the directory structure SHALL mirror the pattern used for specs

#### Scenario: Organizing ADRs by decision domain

- **WHEN** creating a new ADR
- **THEN** the decision name SHALL use kebab-case (e.g., `database-selection`, `api-framework-choice`)
- **AND** the name SHALL be descriptive of the architectural decision
- **AND** each ADR SHALL reside in its own directory under `adrs/`
- **AND** contain both `decision.md` and `adr.md` files

#### Scenario: Two-file structure for context efficiency

- **WHEN** an ADR is created
- **THEN** it SHALL have two files:
  - `decision.md`: Concise summary (~200 tokens) with status, scope, what, and key trade-offs
  - `adr.md`: Full context, options analysis, and detailed consequences (~800-1500 tokens)
- **AND** AI agents SHALL primarily load decision.md files for context
- **AND** AI agents MAY load adr.md for detailed analysis when needed

### Requirement: ADR Document Format

ADRs SHALL follow a two-file structured format optimized for context efficiency while maintaining comprehensive rationale.

#### Scenario: Creating decision.md summary file

- **WHEN** writing a decision.md file
- **THEN** it SHALL include these sections:
  - `# Decision: [Name]` - Title
  - `**Status:**` - Accepted | Proposed | Superseded
  - `**Scope:**` - Pattern-based description of what this affects (not exhaustive list)
  - `**What:**` - One-sentence summary of the decision
  - `**Key Trade-offs:**` - Major benefits (✓) and drawbacks (✗)
  - `**See:**` - Reference to full ADR (./adr.md)
- **AND** keep the file concise (~200 tokens)

#### Scenario: Creating adr.md rationale file

- **WHEN** writing an adr.md file
- **THEN** it SHALL include these sections:
  - `# ADR: [Decision Name]` - Title
  - `## Context` - Detailed background and problem statement
  - `## Options Considered` - Comprehensive alternatives analysis with pros/cons
  - `## Decision Rationale` - Detailed explanation of why option was chosen
  - `## Consequences` - Detailed impacts and migration considerations
  - `## References` (optional) - Related specs, ADRs, or external links

#### Scenario: Pattern-based scope in decision.md

- **WHEN** writing the Scope field in decision.md
- **THEN** use pattern-based descriptions rather than exhaustive lists:
  - Example: "All capabilities requiring non-relational data storage"
  - Example: "Authentication and authorization domain"
  - Example: "Any spec that needs key-value storage or high-throughput writes"
- **AND** MAY include examples of affected specs for clarity
- **AND** SHALL NOT require maintaining exhaustive lists that need updates when new specs are added

#### Scenario: Cross-cutting architectural decision in decision.md

- **WHEN** an ADR applies to multiple specs (e.g., "Use DynamoDB for non-SQL storage")
- **THEN** decision.md SHALL include:
  - **Scope:** "All capabilities requiring non-relational data storage"
  - Examples in scope description: "user-auth (sessions), analytics-events, audit-logs"
- **AND** each affected spec's design.md SHALL reference this ADR
- **AND** the ADR serves as the single source of truth for this architectural choice

#### Scenario: Documenting detailed context in adr.md

- **WHEN** writing the Context section in adr.md
- **THEN** it SHALL provide detailed background explaining the problem
- **AND** it SHALL document all relevant constraints and requirements
- **AND** it SHALL explain why a decision is needed
- **AND** it MAY include stakeholder considerations

#### Scenario: Comprehensive options analysis in adr.md

- **WHEN** documenting options considered in adr.md
- **THEN** each option SHALL be listed as a subsection
- **AND** each option SHALL include comprehensive pros and cons
- **AND** each option MAY include cost analysis, performance characteristics, etc.
- **AND** the rationale for rejection/acceptance SHALL be clear and detailed

#### Scenario: Recording detailed consequences in adr.md

- **WHEN** documenting consequences in adr.md
- **THEN** both positive and negative impacts SHALL be listed in detail
- **AND** trade-offs accepted SHALL be explicit
- **AND** migration considerations SHALL be documented
- **AND** future considerations and rollback strategies SHALL be noted if relevant

### Requirement: ADR Template System

The system SHALL support customizable templates for both decision.md and adr.md files at project level.

#### Scenario: Using default templates

- **WHEN** no custom templates are configured
- **THEN** the system SHALL use built-in default templates for both files:
  - `src/core/templates/decision.md` - Decision summary template
  - `src/core/templates/adr.md` - Full rationale template
- **AND** the default templates SHALL include all standard sections
- **AND** the templates SHALL include helpful placeholder text

#### Scenario: Configuring project-specific templates

- **WHEN** a project wants to customize the ADR format
- **THEN** they MAY create `openspec/templates/decision.md` and/or `openspec/templates/adr.md`
- **AND** optionally configure paths in `openspec/config.yaml` under `templates.decision` and `templates.adr`
- **AND** the custom templates SHALL override the built-in defaults

#### Scenario: Template resolution order

- **WHEN** the system needs an ADR template
- **THEN** for decision.md it SHALL check in this order:
  1. Project template: `openspec/templates/decision.md`
  2. Built-in default: `src/core/templates/decision.md`
- **AND** for adr.md it SHALL check in this order:
  1. Project template: `openspec/templates/adr.md`
  2. Built-in default: `src/core/templates/adr.md`
- **AND** use the first template found for each file type

### Requirement: ADR Change Proposals

ADR changes SHALL follow the same delta-based proposal workflow as functional specifications.

#### Scenario: Creating ADR change proposal

- **WHEN** proposing a new or modified ADR
- **THEN** create a change directory under `openspec/changes/[change-name]/`
- **AND** include ADR deltas in `openspec/changes/[change-name]/adrs/[decision-name]/` with both files:
  - `decision.md` - Summary with delta operations
  - `adr.md` - Full rationale with delta operations
- **AND** use delta operations: `## ADDED Decisions`, `## MODIFIED Decisions`, `## REMOVED Decisions`, `## RENAMED Decisions`

#### Scenario: Adding new ADR

- **WHEN** creating a new architectural decision
- **THEN** create both files in `changes/[name]/adrs/[decision-name]/`:
  - `decision.md` with `## ADDED Decisions` section containing summary
  - `adr.md` with `## ADDED Decisions` section containing full rationale
- **AND** include the complete content in both files
- **AND** follow the standard two-file ADR format

#### Scenario: Modifying existing ADR

- **WHEN** updating an existing architectural decision
- **THEN** include changes in both files under `## MODIFIED Decisions`:
  - Update `decision.md` if summary, scope, or trade-offs change
  - Update `adr.md` if context, options, or detailed consequences change
- **AND** use the same decision name header as in current ADR
- **AND** include the complete updated content for modified files
- **AND** optionally annotate what changed with inline comments

#### Scenario: Removing obsolete ADR

- **WHEN** deprecating an architectural decision
- **THEN** list it under `## REMOVED Decisions`
- **AND** include the decision name for identification
- **AND** document the reason for removal
- **AND** reference any superseding ADR if applicable

#### Scenario: Renaming ADR

- **WHEN** changing an ADR's name
- **THEN** use `## RENAMED Decisions` section
- **AND** specify FROM and TO names explicitly
- **AND** if content also changes, include in `## MODIFIED Decisions` using the new name

### Requirement: Decision-Level Granularity

ADR deltas SHALL operate at the decision level, treating each ADR file as an atomic unit.

#### Scenario: Matching decisions for updates

- **WHEN** processing ADR deltas
- **THEN** match decisions by the `# ADR: [Name]` header
- **AND** use normalized header matching (trim whitespace)
- **AND** compare headers with case-sensitive equality after normalization

#### Scenario: Validating delta references

- **WHEN** validating ADR changes
- **THEN** ensure MODIFIED decisions reference existing ADRs
- **AND** ensure REMOVED decisions reference existing ADRs
- **AND** ensure ADDED decisions don't conflict with existing ADRs
- **AND** report specific errors for mismatches

### Requirement: ADR and Spec Relationship

ADRs SHALL be clearly distinguished from functional specifications with different purposes, structures, and scope characteristics. ADRs are inherently cross-cutting and apply to multiple specs.

#### Scenario: One-to-many relationship between ADRs and specs

- **WHEN** an architectural decision affects multiple capabilities
- **THEN** create one ADR that applies to all affected specs (not separate ADRs per spec)
- **AND** list all affected specs in the ADR's Scope section
- **AND** each affected spec references the same ADR
- **AND** this ensures consistency - one source of truth for cross-cutting decisions

#### Scenario: Determining when to use ADR vs Spec

- **WHEN** documenting a decision
- **THEN** use ADR for architectural and non-functional decisions that typically affect multiple specs:
  - Technology choices (frameworks, libraries, languages)
  - Infrastructure patterns (deployment, hosting, CI/CD)
  - Security approaches (authentication methods, encryption)
  - Cross-cutting concerns (logging, monitoring, error handling)
  - Data storage strategies (database selection, caching approaches)
- **AND** use Spec for functional behavioral requirements focused on a single capability:
  - Features and capabilities
  - User-facing behavior
  - API contracts
  - Business logic rules

#### Scenario: Referencing ADRs from Specs

- **WHEN** a spec depends on architectural decisions
- **THEN** reference relevant ADRs in the spec's design.md
- **AND** use format: "See ADR: [decision-name]" for references
- **AND** ensure spec implementation aligns with ADR decisions

#### Scenario: Referencing Specs from ADRs

- **WHEN** an ADR affects multiple specs
- **THEN** list affected specs in the ADR's References section
- **AND** explain how the decision impacts each spec
- **AND** update affected specs' design.md to reference the ADR

### Requirement: AI Context Integration

ADRs SHALL be included in AI agent context to influence proposal generation and implementation decisions.

#### Scenario: Loading ADRs for AI context

- **WHEN** an AI agent is creating a proposal or implementation
- **THEN** the system SHALL load relevant ADRs
- **AND** include ADRs in the context provided to the AI
- **AND** AI agents SHALL reference ADRs when making architectural decisions

#### Scenario: AI proposal consistency with ADRs

- **WHEN** an AI creates a proposal involving architectural choices
- **THEN** the proposal's design.md SHALL reference relevant ADRs
- **AND** implementation tasks SHALL align with ADR decisions
- **AND** conflicts with existing ADRs SHALL be flagged or explained

### Requirement: ADR Lifecycle

ADRs SHALL follow a lifecycle from proposal to acceptance to potential deprecation.

#### Scenario: Proposing new ADR

- **WHEN** creating an ADR proposal
- **THEN** include it in a change proposal for review
- **AND** validate the ADR format
- **AND** await approval before archiving to `adrs/`

#### Scenario: Accepting ADR

- **WHEN** an ADR change is approved and implemented
- **THEN** archive the change to move ADR to `openspec/adrs/`
- **AND** the ADR becomes active guidance for future work
- **AND** update AGENTS.md if the ADR affects AI workflows

#### Scenario: Superseding ADR

- **WHEN** an ADR is no longer valid
- **THEN** create a new change with the superseding ADR under `## ADDED Decisions`
- **AND** remove the old ADR under `## REMOVED Decisions`
- **AND** reference the superseding ADR in the removal reason
- **AND** archive both changes together when complete
