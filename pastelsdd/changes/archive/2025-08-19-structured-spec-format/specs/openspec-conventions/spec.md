# Pastelsdd Conventions Specification

## ADDED Requirements

### Requirement: Structured Format Adoption

Behavioral specifications SHALL adopt the structured format with `### Requirement:` and `#### Scenario:` headers as the default.

#### Scenario: Use structured headings for behavior

- **WHEN** documenting behavioral requirements
- **THEN** use `### Requirement:` for requirements
- **AND** use `#### Scenario:` for scenarios with bold WHEN/THEN/AND keywords

## Purpose

Pastelsdd conventions SHALL define how system capabilities are documented, how changes are proposed and tracked, and how specifications evolve over time. This meta-specification serves as the source of truth for Pastelsdd's own conventions.

## Core Principles

The system SHALL follow these principles:
- Specs reflect what IS currently built and deployed
- Changes contain proposals for what SHOULD be changed
- AI drives the documentation process
- Specs are living documentation kept in sync with deployed code

## Directory Structure

WHEN an Pastelsdd project is initialized
THEN it SHALL have this structure:
```
pastelsdd/
├── project.md              # Project-specific context
├── README.md               # AI assistant instructions
├── specs/                  # Current deployed capabilities
│   └── [capability]/       # Single, focused capability
│       ├── spec.md         # WHAT and WHY
│       └── design.md       # HOW (optional, for established patterns)
└── changes/                # Proposed changes
    ├── [change-name]/      # Descriptive change identifier
    │   ├── proposal.md     # Why, what, and impact
    │   ├── tasks.md        # Implementation checklist
    │   ├── design.md       # Technical decisions (optional)
    │   └── specs/          # Complete future state
    │       └── [capability]/
    │           └── spec.md # Clean markdown (no diff syntax)
    └── archive/            # Completed changes
        └── YYYY-MM-DD-[name]/
```

## Specification Format

### Requirement: Structured Format for Behavioral Specs

Behavioral specifications SHALL use a structured format with consistent section headers and keywords to ensure visual consistency and parseability.

#### Scenario: Writing requirement sections

- **WHEN** documenting a requirement in a behavioral specification
- **THEN** use a level-3 heading with format `### Requirement: [Name]`
- **AND** immediately follow with a SHALL statement describing core behavior
- **AND** keep requirement names descriptive and under 50 characters

#### Scenario: Documenting scenarios

- **WHEN** documenting specific behaviors or use cases
- **THEN** use level-4 headings with format `#### Scenario: [Description]`
- **AND** use bullet points with bold keywords for steps:
  - **GIVEN** for initial state (optional)
  - **WHEN** for conditions or triggers
  - **THEN** for expected outcomes
  - **AND** for additional outcomes or conditions

#### Scenario: Adding implementation details

- **WHEN** a step requires additional detail
- **THEN** use sub-bullets under the main step
- **AND** maintain consistent indentation
  - Sub-bullets provide examples or specifics
  - Keep sub-bullets concise

### Requirement: Format Flexibility

The structured format SHALL be the default for behavioral specifications, but alternative formats MAY be used when more appropriate for the content type.

#### Scenario: Documenting API specifications

- **WHEN** documenting REST API endpoints or GraphQL schemas
- **THEN** OpenAPI, GraphQL SDL, or similar formats MAY be used
- **AND** the spec SHALL clearly indicate the format being used
- **AND** behavioral aspects SHALL still follow the structured format

#### Scenario: Documenting data schemas

- **WHEN** documenting data structures, database schemas, or configurations
- **THEN** JSON Schema, SQL DDL, or similar formats MAY be used
- **AND** include the structured format for behavioral rules and constraints

#### Scenario: Using simplified format

- **WHEN** documenting simple capabilities without complex scenarios
- **THEN** a simplified WHEN/THEN format without full structure MAY be used
- **AND** this should be consistent within the capability

## Change Storage Convention

### Future State Storage

WHEN creating a change proposal
THEN store the complete future state of affected specs
AND use clean markdown without diff syntax

The `changes/[name]/specs/` directory SHALL contain:
- Complete spec files as they will exist after the change
- Clean markdown without `+` or `-` prefixes
- All formatting and structure of the final intended state

### Proposal Format

WHEN documenting what changes
THEN the proposal SHALL explicitly describe each change:

```markdown
**[Section or Behavior Name]**
- From: [current state/requirement]
- To: [future state/requirement]
- Reason: [why this change is needed]
- Impact: [breaking/non-breaking, who's affected]
```

This explicit format compensates for not having inline diffs and ensures reviewers understand exactly what will change.

## Change Lifecycle

The change process SHALL follow these states:

1. **Propose**: AI creates change with future state specs and explicit proposal
2. **Review**: Humans review proposal and future state
3. **Approve**: Change is approved for implementation
4. **Implement**: Follow tasks.md checklist (can span multiple PRs)
5. **Deploy**: Changes are deployed to production
6. **Update**: Specs in `specs/` are updated to match deployed reality
7. **Archive**: Change is moved to `archive/YYYY-MM-DD-[name]/`

## Viewing Changes

WHEN reviewing proposed changes
THEN reviewers can compare using:
- GitHub PR diff view when changes are committed
- Command line: `diff -u specs/[capability]/spec.md changes/[name]/specs/[capability]/spec.md`
- Any visual diff tool comparing current vs future state

The system relies on tools to generate diffs rather than storing them.

## Capability Naming

Capabilities SHALL use:
- Verb-noun patterns (e.g., `user-auth`, `payment-capture`)
- Hyphenated lowercase names
- Singular focus (one responsibility per capability)
- No nesting (flat structure under `specs/`)

## When Changes Require Proposals

A proposal SHALL be created for:
- New features or capabilities
- Breaking changes to existing behavior
- Architecture or pattern changes
- Performance optimizations that change behavior
- Security updates affecting access patterns

A proposal is NOT required for:
- Bug fixes restoring intended behavior
- Typos or formatting fixes
- Non-breaking dependency updates
- Adding tests for existing behavior
- Documentation clarifications

## Why This Approach

Clean future state storage provides:
- **Readability**: No diff syntax pollution
- **AI-compatibility**: Standard markdown that AI tools understand
- **Simplicity**: No special parsing or processing needed
- **Tool-agnostic**: Any diff tool can show changes
- **Clear intent**: Explicit proposals document reasoning

The structured format adds:
- **Visual Consistency**: Requirement and Scenario prefixes make sections instantly recognizable
- **Parseability**: Consistent structure enables tooling and automation
- **Flexibility**: Alternative formats supported where appropriate
- **Gradual Adoption**: Existing specs can migrate incrementally