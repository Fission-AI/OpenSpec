## ADDED Requirements

### Requirement: Mandatory enforcement language for artifact-creating skills
Skills that create artifacts (Continue, FF, New, Onboard) SHALL use mandatory language ("you MUST follow") when describing how to handle `context`, `rules`, and `instruction` fields from the instructions output.

#### Scenario: Continue skill enforcement
- **WHEN** the Continue skill prompt describes the `context`, `rules`, and `instruction` fields
- **THEN** it uses "you MUST follow" language and explicitly states these are mandatory constraints, not suggestions

#### Scenario: FF skill enforcement
- **WHEN** the FF skill prompt describes the `context`, `rules`, and `instruction` fields
- **THEN** it uses "you MUST follow" language and explicitly states these are mandatory constraints, not suggestions

#### Scenario: New skill enforcement
- **WHEN** the New skill prompt describes the `context`, `rules`, and `instruction` fields
- **THEN** it uses "you MUST follow" language and explicitly states these are mandatory constraints, not suggestions

#### Scenario: Onboard skill enforcement
- **WHEN** the Onboard skill prompt describes the `context`, `rules`, and `instruction` fields
- **THEN** it uses "you MUST follow" language and explicitly states these are mandatory constraints, not suggestions

### Requirement: Context consumption for code-operating skills
Skills that operate on code (Apply, Verify) SHALL consume the `context` field from `instructions apply --json` and use mandatory enforcement language.

#### Scenario: Apply skill consumes context
- **WHEN** the Apply skill reads the output of `openspec instructions apply --json`
- **THEN** it treats the `context` field as mandatory project constraints that MUST be followed when implementing code

#### Scenario: Verify skill consumes context
- **WHEN** the Verify skill reads the output of `openspec instructions apply --json`
- **THEN** it treats the `context` field as mandatory project constraints that MUST be followed when verifying code

### Requirement: Context loading for change-independent skills
Skills that operate without a change context (Explore, Archive, Bulk-archive, Sync) SHALL load project context at session start via `openspec instructions --context --json`.

#### Scenario: Explore skill loads context
- **WHEN** the Explore skill starts a session
- **THEN** it calls `openspec instructions --context --json` and treats the `context` field as mandatory project constraints

#### Scenario: Archive skill loads context
- **WHEN** the Archive skill starts a session
- **THEN** it calls `openspec instructions --context --json` and treats the `context` field as mandatory project constraints

#### Scenario: Bulk-archive skill loads context
- **WHEN** the Bulk-archive skill starts a session
- **THEN** it calls `openspec instructions --context --json` and treats the `context` field as mandatory project constraints

#### Scenario: Sync skill loads context
- **WHEN** the Sync skill starts a session
- **THEN** it calls `openspec instructions --context --json` and treats the `context` field as mandatory project constraints

### Requirement: Generated slash commands match skill templates
The generated `.claude/commands/opsx/*.md` files SHALL reflect the same enforcement language as their corresponding skill templates in `skill-templates.ts`.

#### Scenario: Slash commands are regenerated
- **WHEN** skills are generated via `openspec skills generate`
- **THEN** all `.claude/commands/opsx/*.md` files contain the updated mandatory enforcement language matching their skill template
