## MODIFIED Requirements

### Requirement: Propose skill scans for matching exploration doc
The propose skill SHALL scan `openspec/explorations/` (all `<yyyy-mm>/` subdirectories) for an exploration document whose topic matches the proposed change, before creating any artifacts, **unless an explicit exploration path is provided via `--exploration`**. The match SHALL be determined by the agent comparing the change description against exploration filenames and the `# Exploration: <topic>` header in each doc. When `--exploration <path>` is provided, the skill SHALL skip the directory scan and read the specified file directly.

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
- **AND** `--exploration` parameter was NOT provided
- **THEN** the skill prompts: "No exploration found for this change. It's recommended to run `/enpalspec:explore` first. Continue anyway, or explore now?"
- **AND** waits for user response before proceeding

#### Scenario: User chooses to explore first
- **WHEN** prompted and user answers "explore now"
- **THEN** the skill instructs the user to run `/enpalspec:explore <topic>` and exits
- **AND** does NOT proceed with artifact creation

#### Scenario: User continues without exploration
- **WHEN** prompted and user answers "continue anyway"
- **THEN** the skill proceeds with proposal creation without exploration context

#### Scenario: Explicit exploration path bypasses scan
- **WHEN** user provides `--exploration <path>`
- **THEN** the skill does NOT scan `openspec/explorations/`
- **AND** does NOT prompt the user about missing exploration docs
- **AND** reads the specified file directly as exploration context
