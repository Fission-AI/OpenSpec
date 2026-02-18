# OpenSpec Conventions Specification

## Purpose

OpenSpec conventions SHALL define how system capabilities are documented, how changes are proposed and tracked, and how specifications evolve over time. This meta-specification serves as the source of truth for OpenSpec's own conventions.
## Requirements
### Requirement: Structured conventions for specs and changes

OpenSpec conventions SHALL mandate a structured spec format with clear requirement and scenario sections so tooling can parse consistently.

#### Scenario: Following the structured spec format

- **WHEN** writing or updating OpenSpec specifications
- **THEN** authors SHALL use `### Requirement: ...` followed by at least one `#### Scenario: ...` section

### Requirement: Behavior-First Specification Boundary
OpenSpec specifications SHALL capture verifiable behavior contracts and avoid internal implementation detail.

#### Scenario: Writing behavior requirements
- **WHEN** documenting a capability in `spec.md`
- **THEN** requirements focus on externally observable behavior, interfaces, error handling, and constraints
- **AND** scenarios remain testable or explicitly verifiable

#### Scenario: Avoiding implementation leakage
- **WHEN** details involve concrete library choices, class/function structure, or execution mechanics
- **THEN** those details SHALL be documented in `design.md` or `tasks.md` instead of behavioral requirements

### Requirement: Progressive Rigor
OpenSpec conventions SHALL keep specs lightweight by default and scale rigor only when risk or coordination complexity demands it.

#### Scenario: Routine change specification
- **WHEN** a change is local and low-risk
- **THEN** authors use concise, behavior-first requirements with minimal ceremony

#### Scenario: High-risk or cross-boundary change specification
- **WHEN** a change is cross-team, cross-repo, API-contract breaking, migration-heavy, or security/privacy sensitive
- **THEN** authors increase detail and explicit validation expectations proportionally

### Requirement: Project Structure
An OpenSpec project SHALL maintain a consistent directory structure for specifications and changes.

#### Scenario: Initializing project structure
- **WHEN** an OpenSpec project is initialized
- **THEN** it SHALL have this structure:
```
openspec/
├── project.md              # Project-specific context
├── AGENTS.md               # AI assistant instructions
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

### Requirement: Header-Based Requirement Identification

Requirement headers SHALL serve as unique identifiers for programmatic matching between current specs and proposed changes.

#### Scenario: Matching requirements programmatically

- **WHEN** processing delta changes
- **THEN** use the `### Requirement: [Name]` header as the unique identifier
- **AND** match using normalized headers: `normalize(header) = trim(header)`
- **AND** compare headers with case-sensitive equality after normalization

#### Scenario: Handling requirement renames

- **WHEN** renaming a requirement
- **THEN** use a special `## RENAMED Requirements` section
- **AND** specify both old and new names explicitly:
  ```markdown
  ## RENAMED Requirements
  - FROM: `### Requirement: Old Name`
  - TO: `### Requirement: New Name`
  ```
- **AND** if content also changes, include under MODIFIED using the NEW header

#### Scenario: Validating header uniqueness

- **WHEN** creating or modifying requirements
- **THEN** ensure no duplicate headers exist within a spec
- **AND** validation tools SHALL flag duplicate headers as errors

### Requirement: Change Storage Convention

Change proposals SHALL store only the additions, modifications, and removals to specifications, not complete future states.

#### Scenario: Creating change proposals with additions

- **WHEN** creating a change proposal that adds new requirements
- **THEN** include only the new requirements under `## ADDED Requirements`
- **AND** each requirement SHALL include its complete content
- **AND** use the standard structured format for requirements and scenarios

#### Scenario: Creating change proposals with modifications  

- **WHEN** creating a change proposal that modifies existing requirements
- **THEN** include the modified requirements under `## MODIFIED Requirements`
- **AND** use the same header text as in the current spec (normalized)
- **AND** include the complete modified requirement (not a diff)
- **AND** optionally annotate what changed with inline comments like `← (was X)`

#### Scenario: Creating change proposals with removals

- **WHEN** creating a change proposal that removes requirements
- **THEN** list them under `## REMOVED Requirements`
- **AND** use the normalized header text for identification
- **AND** include reason for removal
- **AND** document any migration path if applicable

The `changes/[name]/specs/` directory SHALL contain:
- Delta files showing only what changes
- Sections for ADDED, MODIFIED, REMOVED, and RENAMED requirements
- Normalized header matching for requirement identification
- Complete requirements using the structured format
- Clear indication of change type for each requirement

#### Scenario: Using standard output symbols

- **WHEN** displaying delta operations in CLI output
- **THEN** use these standard symbols:
  - `+` for ADDED (green)
  - `~` for MODIFIED (yellow)
  - `-` for REMOVED (red)
  - `→` for RENAMED (cyan)

### Requirement: Archive Process Enhancement

The archive process SHALL programmatically apply delta changes to current specifications using header-based matching.

#### Scenario: Archiving changes with deltas

- **WHEN** archiving a completed change
- **THEN** the archive command SHALL:
  1. Parse RENAMED sections first and apply renames
  2. Parse REMOVED sections and remove by normalized header match
  3. Parse MODIFIED sections and replace by normalized header match (using new names if renamed)
  4. Parse ADDED sections and append new requirements
- **AND** validate that all MODIFIED/REMOVED headers exist in current spec
- **AND** validate that ADDED headers don't already exist
- **AND** generate the updated spec in the main specs/ directory

#### Scenario: Handling conflicts during archive

- **WHEN** delta changes conflict with current spec state
- **THEN** the archive command SHALL report specific conflicts
- **AND** require manual resolution before proceeding
- **AND** provide clear guidance on resolving conflicts

### Requirement: Proposal Format

Proposals SHALL explicitly document all changes with clear from/to comparisons.

#### Scenario: Documenting changes

- **WHEN** documenting what changes
- **THEN** the proposal SHALL explicitly describe each change:

```markdown
**[Section or Behavior Name]**
- From: [current state/requirement]
- To: [future state/requirement]
- Reason: [why this change is needed]
- Impact: [breaking/non-breaking, who's affected]
```

This explicit format compensates for not having inline diffs and ensures reviewers understand exactly what will change.

### Requirement: Change Review

The system SHALL support multiple methods for reviewing proposed changes.

#### Scenario: Reviewing changes

- **WHEN** reviewing proposed changes
- **THEN** reviewers can compare using:
- GitHub PR diff view when changes are committed
- Command line: `diff -u specs/[capability]/spec.md changes/[name]/specs/[capability]/spec.md`
- Any visual diff tool comparing current vs future state

### Requirement: Structured Format Adoption

Behavioral specifications SHALL adopt the structured format with `### Requirement:` and `#### Scenario:` headers as the default.

#### Scenario: Use structured headings for behavior

- **WHEN** documenting behavioral requirements
- **THEN** use `### Requirement:` for requirements
- **AND** use `#### Scenario:` for scenarios with bold WHEN/THEN/AND keywords

### Requirement: Verb–Noun CLI Command Structure
OpenSpec CLI design SHALL use verbs as top-level commands with nouns provided as arguments or flags for scoping.

#### Scenario: Verb-first command discovery
- **WHEN** a user runs a command like `openspec list`
- **THEN** the verb communicates the action clearly
- **AND** nouns refine scope via flags or arguments (e.g., `--changes`, `--specs`)

#### Scenario: Backward compatibility for noun commands
- **WHEN** users run noun-prefixed commands such as `openspec spec ...` or `openspec change ...`
- **THEN** the CLI SHALL continue to support them for at least one release
- **AND** display a deprecation warning that points to verb-first alternatives

#### Scenario: Disambiguation guidance
- **WHEN** item names are ambiguous between changes and specs
- **THEN** `openspec show` and `openspec validate` SHALL accept `--type spec|change`
- **AND** the help text SHALL document this clearly

## Core Principles

The system SHALL follow these principles:
- Specs reflect what IS currently built and deployed
- Changes contain proposals for what SHOULD be changed
- AI drives the documentation process
- Specs are living documentation kept in sync with deployed code

## Directory Structure

### Requirement: Project Structure

An OpenSpec project SHALL maintain a consistent directory structure for specifications and changes.

#### Scenario: Initializing project structure

- **WHEN** an OpenSpec project is initialized
- **THEN** it SHALL have this structure:
```
openspec/
├── project.md              # Project-specific context
├── AGENTS.md               # AI assistant instructions
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

## Change Storage Convention

### Requirement: Header-Based Requirement Identification

Requirement headers SHALL serve as unique identifiers for programmatic matching between current specs and proposed changes.

#### Scenario: Matching requirements programmatically

- **WHEN** processing delta changes
- **THEN** use the `### Requirement: [Name]` header as the unique identifier
- **AND** match using normalized headers: `normalize(header) = trim(header)`
- **AND** compare headers with case-sensitive equality after normalization

#### Scenario: Handling requirement renames

- **WHEN** renaming a requirement
- **THEN** use a special `## RENAMED Requirements` section
- **AND** specify both old and new names explicitly:
  ```markdown
  ## RENAMED Requirements
  - FROM: `### Requirement: Old Name`
  - TO: `### Requirement: New Name`
  ```
- **AND** if content also changes, include under MODIFIED using the NEW header

#### Scenario: Validating header uniqueness

- **WHEN** creating or modifying requirements
- **THEN** ensure no duplicate headers exist within a spec
- **AND** validation tools SHALL flag duplicate headers as errors

### Requirement: Change Storage Convention

Change proposals SHALL store only the additions, modifications, and removals to specifications, not complete future states.

#### Scenario: Creating change proposals with additions

- **WHEN** creating a change proposal that adds new requirements
- **THEN** include only the new requirements under `## ADDED Requirements`
- **AND** each requirement SHALL include its complete content
- **AND** use the standard structured format for requirements and scenarios

#### Scenario: Creating change proposals with modifications  

- **WHEN** creating a change proposal that modifies existing requirements
- **THEN** include the modified requirements under `## MODIFIED Requirements`
- **AND** use the same header text as in the current spec (normalized)
- **AND** include the complete modified requirement (not a diff)
- **AND** optionally annotate what changed with inline comments like `← (was X)`

#### Scenario: Creating change proposals with removals

- **WHEN** creating a change proposal that removes requirements
- **THEN** list them under `## REMOVED Requirements`
- **AND** use the normalized header text for identification
- **AND** include reason for removal
- **AND** document any migration path if applicable

The `changes/[name]/specs/` directory SHALL contain:
- Delta files showing only what changes
- Sections for ADDED, MODIFIED, REMOVED, and RENAMED requirements
- Normalized header matching for requirement identification
- Complete requirements using the structured format
- Clear indication of change type for each requirement

#### Scenario: Using standard output symbols

- **WHEN** displaying delta operations in CLI output
- **THEN** use these standard symbols:
  - `+` for ADDED (green)
  - `~` for MODIFIED (yellow)
  - `-` for REMOVED (red)
  - `→` for RENAMED (cyan)

### Requirement: Archive Process Enhancement

The archive process SHALL programmatically apply delta changes to current specifications using header-based matching.

#### Scenario: Archiving changes with deltas

- **WHEN** archiving a completed change
- **THEN** the archive command SHALL:
  1. Parse RENAMED sections first and apply renames
  2. Parse REMOVED sections and remove by normalized header match
  3. Parse MODIFIED sections and replace by normalized header match (using new names if renamed)
  4. Parse ADDED sections and append new requirements
- **AND** validate that all MODIFIED/REMOVED headers exist in current spec
- **AND** validate that ADDED headers don't already exist
- **AND** generate the updated spec in the main specs/ directory

#### Scenario: Handling conflicts during archive

- **WHEN** delta changes conflict with current spec state
- **THEN** the archive command SHALL report specific conflicts
- **AND** require manual resolution before proceeding
- **AND** provide clear guidance on resolving conflicts

### Requirement: Proposal Format

Proposals SHALL explicitly document all changes with clear from/to comparisons.

#### Scenario: Documenting changes

- **WHEN** documenting what changes
- **THEN** the proposal SHALL explicitly describe each change:

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

### Requirement: Change Review

The system SHALL support multiple methods for reviewing proposed changes.

#### Scenario: Reviewing changes

- **WHEN** reviewing proposed changes
- **THEN** reviewers can compare using:
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
- **Gradual Adoption**: Existing specs can migrate incrementally
