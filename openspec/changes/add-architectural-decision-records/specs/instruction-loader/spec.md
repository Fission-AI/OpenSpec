## ADDED Requirements

### Requirement: Include ADRs in AI Context

The instruction loader SHALL include Architectural Decision Records (ADRs) when providing context to AI agents, prioritizing decision summaries for efficiency.

#### Scenario: Loading ADR summaries for AI context

- **WHEN** an AI agent requests context about the project
- **THEN** the instruction loader SHALL load decision.md files from all ADRs in `openspec/adrs/`
- **AND** provide decision summaries alongside specs, project.md, and AGENTS.md
- **AND** clearly label ADRs as architectural decisions to distinguish from functional specs
- **AND** keep context efficient (~200 tokens per ADR vs ~1000+ for full ADRs)

#### Scenario: Loading full ADR on demand

- **WHEN** an AI agent needs detailed rationale for a specific ADR
- **THEN** the instruction loader MAY load the full adr.md file
- **AND** provide complete context, options analysis, and consequences
- **AND** load only when explicitly needed (e.g., when modifying an ADR or resolving conflicts)

#### Scenario: Referencing ADRs in proposals

- **WHEN** an AI agent creates a proposal involving architectural choices
- **THEN** the agent SHALL check relevant ADRs
- **AND** reference applicable ADRs in the proposal's design.md
- **AND** ensure implementation tasks align with ADR decisions
- **AND** flag potential conflicts with existing ADRs

#### Scenario: ADR-aware implementation

- **WHEN** an AI agent implements tasks from a change
- **THEN** the agent SHALL consult referenced ADRs
- **AND** follow architectural patterns specified in ADRs
- **AND** use technologies and approaches documented in ADRs
- **AND** avoid contradicting established architectural decisions without explicit justification

#### Scenario: Proposing ADR updates

- **WHEN** an AI agent identifies need for new or updated architectural decision
- **THEN** the agent SHALL propose ADR changes using the delta format
- **AND** explain why the architectural decision is needed
- **AND** document alternatives considered
- **AND** outline consequences of the decision

#### Scenario: Loading specific ADRs by topic

- **WHEN** an AI agent works on a change affecting specific architectural areas
- **THEN** the instruction loader MAY prioritize loading relevant ADRs
- **AND** include related ADRs based on keywords or references
- **AND** ensure comprehensive context for architectural consistency
