# Pastelsdd Conventions Specification

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