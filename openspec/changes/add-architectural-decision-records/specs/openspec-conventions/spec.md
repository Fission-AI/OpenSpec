## MODIFIED Requirements

### Requirement: Project Structure

An OpenSpec project SHALL maintain a consistent directory structure for specifications, architectural decisions, and changes.

#### Scenario: Initializing project structure

- **WHEN** an OpenSpec project is initialized
- **THEN** it SHALL have this structure:
```
openspec/
├── project.md              # Project-specific context
├── AGENTS.md               # AI assistant instructions
├── specs/                  # Current deployed capabilities (functional)
│   └── [capability]/       # Single, focused capability
│       ├── spec.md         # WHAT and WHY
│       └── design.md       # HOW (optional, for established patterns)
├── adrs/                   # Architectural Decision Records (non-functional)
│   └── [decision-name]/    # Single architectural decision
│       ├── decision.md     # Summary: status, scope, what, trade-offs (~200 tokens)
│       └── adr.md          # Full rationale: context, options, consequences (~800-1500 tokens)
├── templates/              # Optional custom templates
│   ├── decision.md         # Project-specific decision summary template
│   └── adr.md              # Project-specific ADR rationale template
└── changes/                # Proposed changes
    ├── [change-name]/      # Descriptive change identifier
    │   ├── proposal.md     # Why, what, and impact
    │   ├── tasks.md        # Implementation checklist
    │   ├── design.md       # Technical decisions (optional)
    │   ├── specs/          # Spec deltas
    │   │   └── [capability]/
    │   │       └── spec.md # ADDED/MODIFIED/REMOVED Requirements
    │   └── adrs/           # ADR deltas
    │       └── [decision-name]/
    │           ├── decision.md  # ADDED/MODIFIED/REMOVED Decisions (summary)
    │           └── adr.md       # ADDED/MODIFIED/REMOVED Decisions (full)
    └── archive/            # Completed changes
        └── YYYY-MM-DD-[name]/
```

## ADDED Requirements

### Requirement: Distinction Between Specs and ADRs

OpenSpec SHALL maintain a clear distinction between functional specifications (specs) and Architectural Decision Records (ADRs). ADRs are inherently cross-cutting and apply to multiple specs, while specs typically focus on a single capability.

#### Scenario: Functional specifications for behavior

- **WHEN** documenting what the system does or how it behaves
- **THEN** use specs in `openspec/specs/[capability]/spec.md`
- **AND** specs SHALL focus on functional requirements, features, and user-facing behavior
- **AND** specs SHALL use the structured format with `### Requirement:` and `#### Scenario:` headers

#### Scenario: ADRs for architectural decisions

- **WHEN** documenting architectural or non-functional decisions
- **THEN** use ADRs in `openspec/adrs/[decision-name]/adr.md`
- **AND** ADRs SHALL focus on technology choices, infrastructure, patterns, and cross-cutting concerns
- **AND** ADRs SHALL use the ADR format with Context, Decision, Options, and Consequences sections

#### Scenario: Cross-cutting ADR example

- **WHEN** an architectural decision affects multiple specs
- **THEN** create one ADR listing all affected specs in its Scope section
- **AND** each affected spec references the ADR in its design.md
- **AND** the ADR serves as single source of truth
- Example: ADR "Use DynamoDB for Non-SQL Storage" lists scope: "user-auth, sessions, analytics-events, audit-logs"

#### Scenario: Choosing between spec and ADR

- **WHEN** deciding where to document information
- **THEN** use this guideline:
  - **Specs**: Features, capabilities, user behavior, API contracts, business rules (typically one capability)
  - **ADRs**: Technology stack, infrastructure patterns, security approaches, library selections, architectural patterns (typically cross-cutting, affects multiple specs)
- **AND** specs MAY reference ADRs for architectural context
- **AND** ADRs SHALL declare their scope (which specs they affect)

### Requirement: ADR Template Support

OpenSpec SHALL support customizable templates for ADRs to accommodate different project needs.

#### Scenario: Using default template

- **WHEN** no custom ADR template is configured
- **THEN** the system SHALL provide a built-in default ADR template
- **AND** the default template SHALL include standard sections (Context, Decision, Options, Consequences)

#### Scenario: Customizing ADR template

- **WHEN** a project needs a specific ADR format
- **THEN** create `openspec/templates/adr.md` with the custom template
- **AND** optionally configure the template path in `openspec/config.yaml`
- **AND** the custom template SHALL override the built-in default

### Requirement: ADR Change Workflow

ADR changes SHALL follow the same proposal, review, and archive workflow as functional specifications.

#### Scenario: Creating ADR proposals

- **WHEN** proposing a new or modified architectural decision
- **THEN** create a change proposal under `openspec/changes/[change-name]/`
- **AND** include ADR deltas in `openspec/changes/[change-name]/adrs/[decision-name]/adr.md`
- **AND** use delta sections: `## ADDED Decisions`, `## MODIFIED Decisions`, `## REMOVED Decisions`, `## RENAMED Decisions`

#### Scenario: Reviewing ADR changes

- **WHEN** reviewing an ADR change proposal
- **THEN** validate the ADR format and content
- **AND** ensure the decision is well-justified with context and options
- **AND** verify consequences are clearly documented
- **AND** approve or request changes via normal change review process

#### Scenario: Archiving ADR changes

- **WHEN** archiving a completed ADR change
- **THEN** apply delta operations to `openspec/adrs/` directory:
  1. Process RENAMED decisions first
  2. Process REMOVED decisions
  3. Process MODIFIED decisions (update existing ADRs)
  4. Process ADDED decisions (create new ADRs)
- **AND** validate that MODIFIED/REMOVED reference existing ADRs
- **AND** validate that ADDED don't conflict with existing ADRs

### Requirement: ADR Format Structure

ADRs SHALL use a two-file structured format optimized for context efficiency and comprehensive documentation.

#### Scenario: decision.md summary file

- **WHEN** creating a decision.md file
- **THEN** it SHALL include these fields:
  - `# Decision: [Name]` - Title
  - `**Status:**` - Accepted | Proposed | Superseded
  - `**Scope:**` - Pattern-based description of what this affects
  - `**What:**` - One-sentence summary
  - `**Key Trade-offs:**` - Major benefits (✓) and drawbacks (✗)
  - `**See:**` - Reference to full ADR (./adr.md)
- **AND** keep content concise (~200 tokens)

#### Scenario: adr.md rationale file

- **WHEN** creating an adr.md file
- **THEN** it SHALL include these sections:
  - `# ADR: [Decision Name]` - Title header
  - `## Context` - Detailed background, problem statement, constraints
  - `## Options Considered` - Comprehensive alternatives with pros/cons
  - `## Decision Rationale` - Detailed explanation of choice
  - `## Consequences` - Detailed impacts, migration, trade-offs
  - `## References` (optional) - Related specs, ADRs, external resources

#### Scenario: Pattern-based scope in decision.md

- **WHEN** writing the Scope field in decision.md
- **THEN** use pattern-based descriptions rather than exhaustive lists:
  - Example: "All capabilities requiring non-relational data storage"
  - Example: "Authentication and authorization domain"
  - Example: "Any spec needing key-value storage or high-throughput writes"
- **AND** MAY include examples: "user-auth (sessions), analytics-events, audit-logs"
- **AND** SHALL NOT require maintaining exhaustive lists

### Requirement: Cross-Reference Between Specs and ADRs

Specs and ADRs SHALL support cross-referencing to maintain architectural consistency.

#### Scenario: Referencing ADRs from spec design docs

- **WHEN** a spec's implementation depends on architectural decisions
- **THEN** reference the relevant ADR in the spec's `design.md`
- **AND** use format: "See ADR: [decision-name]" or link to the ADR file
- **AND** ensure implementation follows ADR guidance

#### Scenario: Listing affected specs in ADRs

- **WHEN** an ADR impacts multiple capabilities
- **THEN** list affected specs in the ADR's References section
- **AND** explain how the decision affects each spec
- **AND** update affected specs to reference the ADR when they're next modified
