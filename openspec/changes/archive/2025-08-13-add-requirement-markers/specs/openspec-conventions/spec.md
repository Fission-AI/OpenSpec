# OpenSpec Conventions Specification

## Purpose

OpenSpec conventions SHALL define how system capabilities are documented, how changes are proposed and tracked, and how specifications evolve over time. This meta-specification serves as the source of truth for OpenSpec's own conventions.

## Core Principles

The system SHALL follow these principles:
- Specs reflect what IS currently built and deployed
- Changes contain proposals for what SHOULD be changed
- AI drives the documentation process
- Specs are living documentation kept in sync with deployed code

## Directory Structure

WHEN an OpenSpec project is initialized
THEN it SHALL have this structure:
```
openspec/
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

## Requirement Markers

### Marker Syntax

@requirement marker-syntax
WHEN writing a requirement in a spec
THEN prefix it with @requirement followed by a brief kebab-case identifier
AND place the marker on the line immediately before the WHEN statement

@requirement marker-identifier
WHEN choosing an identifier for @requirement
THEN use kebab-case (lowercase with hyphens)
AND keep it brief but descriptive (2-4 words)
AND ensure it's unique within the spec

@requirement marker-placement
WHEN adding @requirement markers to a spec
THEN place them in the ## Behavior or ## Behaviors section
AND ensure each WHEN/THEN block has exactly one marker
AND maintain a blank line after each THEN block for readability

### Examples

@requirement valid-marker-example
WHEN a spec includes properly formatted markers
THEN tools can extract and identify requirements programmatically
AND the spec remains human-readable

Example of correct usage:
```markdown
## Behavior

@requirement user-register
WHEN user registers with valid email
THEN create account and send confirmation

@requirement user-login
WHEN user logs in with correct credentials
THEN return JWT token with user data

@requirement invalid-credentials
WHEN user provides invalid credentials
THEN return 401 unauthorized error
```

@requirement invalid-marker-detection
WHEN a requirement lacks an @requirement marker
THEN tools should gracefully skip it
AND optionally warn about unmarked requirements

### Edge Cases

@requirement multiline-when-then
WHEN a WHEN or THEN clause spans multiple lines
THEN the @requirement marker still goes on the line before WHEN
AND the entire block is considered part of that requirement

@requirement multiple-then-clauses
WHEN a requirement has multiple THEN clauses using AND
THEN treat them as part of the same requirement
AND use a single @requirement marker for the entire block

@requirement nested-conditions
WHEN requirements have nested conditions or complex logic
THEN keep the @requirement marker simple
AND let the WHEN/THEN content contain the complexity

## Spec Structure

@requirement spec-file-location
WHEN creating a spec file
THEN place it in openspec/specs/[capability-name]/spec.md
AND use kebab-case for the capability name

@requirement spec-sections
WHEN structuring a spec
THEN include these sections in order:
- # [Capability Name] Specification
- ## Purpose (brief description)
- ## Behavior or ## Behaviors (with @requirement markers)
- ## Examples (optional, for complex requirements)

## Benefits of Requirement Markers

@requirement tooling-extraction
WHEN tools need to extract requirements from specs
THEN they can parse @requirement markers reliably
AND avoid complex regex patterns for WHEN/THEN extraction

@requirement requirement-counting
WHEN displaying change summaries
THEN tools can count requirements by counting @requirement markers
AND show accurate requirement counts per spec

@requirement requirement-referencing
WHEN documenting or discussing specific requirements
THEN use the @requirement identifier for clear reference
AND maintain consistency across documentation

## Why This Approach

Clean future state storage provides:
- **Readability**: No diff syntax pollution
- **AI-compatibility**: Standard markdown that AI tools understand
- **Simplicity**: No special parsing or processing needed
- **Tool-agnostic**: Any diff tool can show changes
- **Clear intent**: Explicit proposals document reasoning