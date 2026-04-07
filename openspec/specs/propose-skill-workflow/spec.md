## ADDED Requirements

### Requirement: Propose skill scans for matching exploration doc
The propose skill SHALL scan `openspec/explorations/` (all `<yyyy-mm>/` subdirectories) for an exploration document whose topic matches the proposed change, before creating any artifacts. The match SHALL be determined by the agent comparing the change description against exploration filenames and the `# Exploration: <topic>` header in each doc.

#### Scenario: Matching exploration doc found
- **WHEN** user invokes propose for change "auth-redesign"
- **AND** `openspec/explorations/2026-04/exploration-2026-04-07-auth-redesign.md` exists
- **THEN** the skill explicitly states: "Using `explorations/2026-04/exploration-2026-04-07-auth-redesign.md` as context for this proposal"
- **AND** reads the exploration doc before creating the proposal
- **AND** seeds the proposal with insights and decisions from the exploration doc

#### Scenario: Multiple exploration docs found
- **WHEN** multiple exploration docs match the change topic
- **THEN** the skill lists the matches and selects the most recent one
- **AND** states which doc was selected and why

#### Scenario: No exploration doc found for non-trivial change
- **WHEN** no matching exploration doc exists
- **AND** the agent judges the change to be non-trivial
- **THEN** the skill prompts: "No exploration found for this change. It's recommended to run `/enpalspec:explore` first. Continue anyway, or explore now?"
- **AND** waits for user response before proceeding

#### Scenario: User chooses to explore first
- **WHEN** prompted and user answers "explore now"
- **THEN** the skill instructs the user to run `/enpalspec:explore <topic>` and exits
- **AND** does NOT proceed with artifact creation

#### Scenario: User continues without exploration
- **WHEN** prompted and user answers "continue anyway"
- **THEN** the skill proceeds with proposal creation without exploration context

### Requirement: Trivial change detection skips exploration gate
The propose skill SHALL detect trivial changes and skip the exploration gate without prompting. The agent SHALL judge triviality based on: the change description indicating a small fix (typo, rename, config value, single-line change), the proposed change requiring no new capabilities or spec changes, and no architectural decisions involved.

#### Scenario: Trivial change bypasses gate
- **WHEN** user invokes propose with a description such as "fix typo in error message" or "rename CLI flag"
- **AND** the agent judges this to be trivial
- **THEN** the skill proceeds directly to artifact creation without scanning for exploration docs or prompting the user

#### Scenario: Agent confirms trivial judgment
- **WHEN** the agent determines a change is trivial
- **THEN** it briefly states its reasoning: "This looks like a minor change — skipping exploration check"
- **AND** proceeds immediately

### Requirement: Proposal seeded from exploration insights
The propose skill SHALL use the exploration doc's Insights & Decisions and Open Questions sections to inform the proposal, design, and specs it creates. Decisions already made during exploration SHALL NOT be relitigated in the proposal.

#### Scenario: Exploration decisions reflected in proposal
- **WHEN** an exploration doc records a decision "Use HttpOnly cookies for auth tokens"
- **AND** propose reads that exploration doc
- **THEN** the generated proposal reflects that decision without asking the user to choose again

#### Scenario: Open questions from exploration carried into design
- **WHEN** the exploration doc contains unresolved open questions
- **THEN** those questions appear in the design.md Open Questions section
