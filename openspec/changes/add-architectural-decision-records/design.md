# Design: Architectural Decision Records

## Context

OpenSpec currently only supports functional specifications (specs) which document behavioral requirements. However, software projects need to document architectural decisions that cross-cut multiple specs - decisions about technology choices, infrastructure patterns, security approaches, and other non-functional concerns.

ADRs are a well-established pattern in software architecture (popularized by Michael Nygard) for documenting architectural decisions in a lightweight, version-controlled format.

**Stakeholders**: AI agents, developers, architects, technical leads

**Constraints**:
- Must not disrupt existing spec workflow
- Must use the same delta-based change process for consistency
- Must integrate seamlessly with existing CLI commands
- Must be parseable by AI agents to influence future proposals

## Goals / Non-Goals

### Goals
- Add parallel ADR structure alongside specs
- Support customizable ADR templates per project
- Integrate ADRs into existing CLI commands (list, show, validate, archive)
- Make ADRs available to AI agents for context when creating proposals
- Use the same delta-based change workflow as specs

### Non-Goals
- Replacing or modifying the existing spec system
- Adding complex ADR-specific tooling beyond basic CRUD operations
- Enforcing strict ADR format beyond basic validation
- Automatic ADR generation or inference from code

## Decisions

### Decision 1: Parallel Structure to Specs

**What**: Create `adrs/` directory at the same level as `specs/`, with similar structure:
```
openspec/
├── specs/              # Functional specifications
│   └── [capability]/
│       └── spec.md
├── adrs/               # Architectural decisions
│   └── [decision-name]/
│       └── adr.md
└── changes/
    └── [change-name]/
        ├── specs/      # Spec deltas
        └── adrs/       # ADR deltas
```

**Why**:
- **Cross-cutting nature**: ADRs affect multiple specs, so they can't be nested within a single spec
  - Example: "Use DynamoDB for non-SQL storage" affects user-auth, session-management, analytics, etc.
  - Placing ADRs at the top level (parallel to specs) reflects their one-to-many relationship
- Clear separation of concerns (functional vs architectural)
- Familiar structure for users already using specs
- Easy to understand which documents serve which purpose
- Each ADR declares its scope (which specs it affects) rather than being owned by one spec

**Alternatives considered**:
- ADRs nested within specs → Rejected: ADRs are cross-cutting; they don't belong to one spec
- Single unified document type with metadata tags → Rejected: Too complex, loses clarity
- ADRs as metadata within specs → Rejected: Pollutes functional specs with architectural details
- Separate repo for ADRs → Rejected: Breaks cohesion, harder to keep in sync
- Multiple ADR copies (one per affected spec) → Rejected: Duplication, inconsistency risk

### Decision 2: Delta-Based Change Workflow for ADRs

**What**: ADR changes follow the same pattern as spec changes:
```markdown
## ADDED Decisions
### Decision: Technology Choice
...

## MODIFIED Decisions
### Decision: Existing Decision
...

## REMOVED Decisions
### Decision: Deprecated Pattern
...
```

**Why**:
- Consistency with existing workflow reduces cognitive load
- Reuse existing validation and archiving infrastructure
- AI agents already understand delta format

**Alternatives considered**:
- Immutable ADRs (new ADR supersedes old) → Rejected: Doesn't match OpenSpec's delta approach
- Freeform ADR updates without deltas → Rejected: Loses traceability and validation

### Decision 3: Template System

**What**: Three-tier template resolution:
1. Project-specific template: `openspec/templates/adr.md`
2. Global config template (future): `~/.openspec/templates/adr.md`
3. Built-in default template: `src/core/templates/adr.md`

Template configuration in `openspec/config.yaml`:
```yaml
templates:
  adr: ./templates/adr.md  # Optional override
```

**Why**:
- Projects have different ADR needs (microservices vs monolith, security-focused vs startup)
- Default template provides good starting point
- Gradual adoption - templates are optional

**Alternatives considered**:
- No templates, freeform ADRs → Rejected: Loses structure, harder to validate
- Only built-in template → Rejected: Inflexible for diverse projects
- Multiple template types → Rejected: Over-engineering for v1

### Decision 4: Two-File ADR Structure

**What**: Split ADRs into two files for context efficiency:

**File 1: decision.md** (Concise summary, always loaded)
```markdown
# Decision: [Name]

**Status:** Accepted | Proposed | Superseded

**Scope:** [Pattern-based description, not exhaustive list]
Examples: "All capabilities requiring non-relational data storage"

**What:** [One-sentence summary of the decision]

**Key Trade-offs:**
- ✓ Managed service, scales automatically
- ✓ Proven at scale
- ✗ Vendor lock-in
- ✗ Higher cost at low scale

**See:** [Full ADR](./adr.md) for detailed context and analysis.
```

**File 2: adr.md** (Full rationale, loaded on-demand)
```markdown
# ADR: [Decision Name]

## Context
[Detailed background, problem statement, constraints, stakeholders]

## Options Considered
### Option 1: [Name]
- Pros: [Comprehensive list]
- Cons: [Comprehensive list]
- Cost analysis: [Details]

### Option 2: [Name]
[Full analysis...]

## Decision Rationale
[Detailed explanation of why this option was chosen]

## Consequences
[Detailed impacts, migration considerations, rollback strategy]

## References
- [Related specs, ADRs, external resources]
```

**Directory structure:**
```
adrs/database-strategy/
├── decision.md    # ~200 tokens - always in context
└── adr.md         # ~800-1500 tokens - reference/on-demand
```

**Why**:
- **Context efficiency**: 20 ADRs × 200 tokens = 4K (vs 20K for full ADRs)
- **Quick reference**: AI sees all decisions without loading full rationale
- **On-demand detail**: Full analysis available when needed
- **User-friendly**: Quick scan of decision.md, deep dive into adr.md when needed
- **Scope flexibility**: Pattern-based descriptions, not exhaustive lists to maintain

**Alternatives considered**:
- Single file with separator comments → Rejected: Harder to parse, less clear
- Only decision.md (no full rationale) → Rejected: Loses valuable context
- Summary in frontmatter → Rejected: Not as flexible, harder to read
- Database/structured storage → Rejected: Over-engineering, breaks markdown simplicity

### Decision 5: CLI Integration Strategy

**What**: Extend existing commands with ADR support rather than creating ADR-specific commands:
- `openspec list --adrs` instead of `openspec adr list`
- `openspec show [name] --type adr` for disambiguation
- `openspec validate [change]` validates both specs and ADRs
- `openspec archive [change]` archives both specs and ADRs

**Why**:
- Consistent with verb-first CLI design principle (from openspec-conventions)
- Reduces command proliferation
- Natural workflow - users think about "changes" not "spec changes" vs "ADR changes"

**Alternatives considered**:
- Separate `openspec adr` command namespace → Rejected: Violates verb-first principle, creates fragmentation
- Automatic detection without flags → Rejected: Ambiguous, harder to script

### Decision 6: AI Context Integration

**What**: Update instruction loader to include ADRs when providing context to AI agents:
```
Context provided:
- specs/ - Functional specifications
- adrs/ - Architectural decisions
- changes/ - Pending proposals
```

When AI creates proposals, it should reference relevant ADRs in design.md and tasks.

**Why**:
- ADRs only valuable if they influence implementation
- AI can check consistency with architectural decisions
- Reduces need for users to repeat architectural context

**Alternatives considered**:
- Manual ADR references only → Rejected: Easy to forget, inconsistent
- ADR validation blocks conflicting proposals → Rejected: Too rigid for v1

## Risks / Trade-offs

### Risk 1: Template Complexity
**Risk**: Users may create overly complex templates that are hard to work with
**Mitigation**:
- Provide simple, well-documented default template
- Document template best practices in AGENTS.md
- Keep validation minimal to not enforce rigidity

### Risk 2: Spec vs ADR Boundary Confusion
**Risk**: Users may be unclear when to use specs vs ADRs
**Mitigation**:
- Clear documentation with examples
- Simple rule: functional behavior = spec, architectural choice = ADR
- ADRs can reference multiple specs they influence

### Risk 3: Delta Format Mismatch
**Risk**: ADR structure might not fit delta operations as cleanly as specs
**Mitigation**:
- Design ADR format with deltas in mind (decision-level granularity)
- Support MODIFIED for updating existing decisions
- Allow REMOVED with superseding ADR reference

### Risk 4: Increased Cognitive Load
**Risk**: Two parallel documentation systems could confuse users
**Mitigation**:
- Clear visual distinction in CLI output (icons, colors)
- Consistent workflow reduces learning curve
- Optional adoption - teams can use specs only if preferred

## Migration Plan

### Phase 1: Core Implementation
1. Implement template system and default ADR template
2. Add ADR parser and validation
3. Extend CLI commands (list, show, validate, archive)
4. Update AGENTS.md with ADR workflow

### Phase 2: Testing & Refinement
1. Manual testing with sample ADR changes
2. Cross-platform path testing
3. Validate AI context integration
4. Gather feedback on default template

### Phase 3: Documentation & Rollout
1. Update all affected specs with deltas
2. Create example ADRs for OpenSpec itself (e.g., "Why TypeScript", "Why Delta Format")
3. Announce feature with migration guide

### Rollback Strategy
If ADRs prove problematic:
- Feature is purely additive, can be deprecated without breaking existing workflows
- Remove ADR parsing from CLI commands
- Archive `adrs/` directory
- Update docs to mark as deprecated

## Open Questions

1. **Should ADRs have status fields** (proposed, accepted, deprecated, superseded)?
   - Leaning NO for v1: Keep simple, use REMOVED/ADDED for superseding
   - Can add in future if needed

2. **Should we support ADR numbering** (ADR-001, ADR-002)?
   - Leaning NO: Directory name is sufficient, numbering adds complexity
   - Users can number manually if desired (001-database-choice/)

3. **Should there be a separate archive for ADRs**?
   - Leaning NO: Use same `changes/archive/` for both specs and ADRs
   - Keeps change history unified

4. **Should ADRs be required for certain types of spec changes**?
   - Leaning NO for v1: Make optional, encourage through documentation
   - Could add validation warning in future ("Consider creating ADR for new infrastructure")
