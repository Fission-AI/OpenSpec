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

### Requirement: Proactive ADR Suggestion

The system SHALL guide AI agents to proactively detect when architectural decisions are needed and create ADRs without explicit user request.

#### Scenario: Detecting architectural decisions in user requests

- **WHEN** an AI agent receives a request that implies architectural choices
- **THEN** the agent SHALL analyze the request for architectural decisions:
  - Technology selection (database, framework, library, language)
  - Infrastructure choices (hosting platform, deployment strategy, CI/CD)
  - Security approaches (authentication method, encryption strategy)
  - Cross-cutting patterns (logging, monitoring, error handling)
  - Data storage strategies (database type, caching approach)
- **AND** check if relevant ADRs exist
- **AND** create new ADRs in the same change if architectural decisions are missing

#### Scenario: Extracting architectural decisions from feature requests

- **WHEN** user requests a feature like "add login with session storage"
- **THEN** the AI agent SHALL identify implicit architectural decisions:
  - "session storage" implies database/storage choice
- **AND** check for existing ADR covering this decision
- **AND** if no ADR exists, create one in the same change as the spec
- **AND** have the spec reference the ADR in its design.md

#### Scenario: Single change with both ADR and spec

- **WHEN** AI creates a change with both new ADR and new spec
- **THEN** structure the change with both:
  - `changes/[name]/adrs/[decision]/` - Architectural decision
  - `changes/[name]/specs/[capability]/` - Functional spec
- **AND** explain in proposal.md why both are needed
- **AND** set up task dependencies: ADR review before spec implementation
- **AND** ensure spec references the ADR

#### Scenario: Not creating unnecessary ADRs

- **WHEN** a decision is feature-specific and unlikely to affect other specs
- **THEN** the AI agent SHALL NOT create an ADR
- **AND** document the decision in the spec's design.md instead
- **AND** only elevate to ADR if the decision is truly cross-cutting or architectural
