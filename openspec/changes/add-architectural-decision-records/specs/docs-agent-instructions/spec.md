## ADDED Requirements

### Requirement: ADR Creation Guidance in Agent Instructions

The agent instructions (AGENTS.md) SHALL include comprehensive guidance on when and how to create Architectural Decision Records proactively.

#### Scenario: Documenting ADR vs spec decision criteria

- **WHEN** AGENTS.md is updated for ADR support
- **THEN** it SHALL include clear criteria for when to create ADRs:
  - Technology/library selection (database, framework, auth method, language)
  - Infrastructure decisions (hosting platform, deployment strategy, CI/CD)
  - Security approaches (authentication method, encryption strategy)
  - Cross-cutting patterns (logging, monitoring, error handling)
  - Data storage strategies (database type, caching approach)
  - Decisions affecting multiple specs (current or future)
- **AND** include criteria for when NOT to create ADRs:
  - Feature-specific implementation details
  - Decisions only affecting one capability
  - Standard implementation patterns
  - Purely functional/behavioral decisions

#### Scenario: Proactive ADR detection instructions

- **WHEN** AGENTS.md provides ADR guidance
- **THEN** it SHALL instruct AI agents to:
  - Analyze user requests for architectural implications
  - Check if relevant ADRs exist before creating specs
  - Create ADRs proactively when architectural decisions are detected
  - Not require users to explicitly request ADRs
  - Include both ADR and spec in the same change when appropriate

#### Scenario: Example-driven guidance

- **WHEN** documenting ADR creation in AGENTS.md
- **THEN** include concrete examples:
  - Example 1: "add login with session storage" → Create database-strategy ADR + user-auth spec
  - Example 2: "add real-time notifications" → Create messaging-strategy ADR + notifications spec
  - Example 3: "add user analytics" → Check for existing analytics ADR, create if missing
- **AND** show the resulting change structure with both ADR and spec
- **AND** explain how to reference ADRs from specs

#### Scenario: ADR workflow integration

- **WHEN** AGENTS.md documents the change workflow
- **THEN** it SHALL explain:
  - How to create a change with both ADRs and specs
  - How to structure tasks.md with ADR → spec dependencies
  - How to reference existing ADRs from new specs
  - How to update existing ADRs when architectural decisions evolve
  - How to determine if existing ADR needs modification vs creating new ADR

#### Scenario: Quick reference for ADR decisions

- **WHEN** AGENTS.md provides ADR guidance
- **THEN** include a decision tree or checklist:
  ```
  Does this request involve:
  ☐ Technology selection? (database, framework, library)
  ☐ Infrastructure choice? (hosting, deployment, CI/CD)
  ☐ Security approach? (auth method, encryption)
  ☐ Cross-cutting concern? (logging, monitoring, error handling)
  ☐ Decision affecting multiple specs?

  If YES to any → Check for existing ADR
    - ADR exists and applies → Reference it
    - ADR exists but needs update → Modify it
    - No ADR exists → Create new ADR in same change
  ```

#### Scenario: Pattern-based scope guidance

- **WHEN** AGENTS.md explains ADR scope documentation
- **THEN** instruct AI agents to:
  - Use pattern-based descriptions, not exhaustive lists
  - Provide examples: "All capabilities requiring non-relational data storage"
  - Include specific examples for clarity: "user-auth (sessions), analytics-events"
  - NOT maintain exhaustive lists that require updates
  - Update scope patterns when architectural boundaries change

#### Scenario: Two-file structure usage

- **WHEN** AGENTS.md documents ADR creation
- **THEN** explain the two-file structure:
  - decision.md: Concise summary for quick reference (~200 tokens)
  - adr.md: Full rationale for deep analysis (~800-1500 tokens)
- **AND** instruct when to create each:
  - Always create both for new ADRs
  - Update decision.md when summary/scope/trade-offs change
  - Update adr.md when context/options/consequences change
  - Both files use same delta operations (ADDED/MODIFIED/REMOVED/RENAMED)

#### Scenario: CLI command reference for ADRs

- **WHEN** AGENTS.md provides ADR workflow documentation
- **THEN** include CLI command examples:
  - `openspec list --adrs` - List all ADRs
  - `openspec show [adr] --type adr` - Show decision summary
  - `openspec show [adr] --type adr --full` - Show full rationale
  - `openspec validate [change]` - Validate ADRs and specs
  - `openspec archive [change]` - Archive both ADRs and specs
