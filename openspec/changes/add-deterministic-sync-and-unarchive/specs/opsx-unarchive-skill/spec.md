## ADDED Requirements

### Requirement: OPSX Unarchive Skill

The system SHALL provide an `/opsx:unarchive` skill that restores an archived change to active, delegating the deterministic work to the `openspec unarchive` CLI rather than moving folders or editing specs itself.

#### Scenario: Unarchive a selected change

- **WHEN** the agent executes `/opsx:unarchive` with a change name
- **THEN** the skill invokes `openspec unarchive <name>` to perform the restore
- **AND** it displays the CLI's result (restored location and spec-reversal outcome)

#### Scenario: Change selection prompt

- **WHEN** the agent executes `/opsx:unarchive` without specifying a change
- **AND** the change cannot be inferred from conversation context
- **THEN** the skill lists archived changes (via `openspec list --archived --json`) and asks the user to choose
- **AND** it never auto-selects, including when several archives share a name

### Requirement: CLI Delegation

The skill SHALL perform all deterministic operations — resolution, spec reversal, drift checking, folder move, and atomicity — by calling the `openspec unarchive` CLI, and SHALL NOT re-implement that logic in prose.

#### Scenario: No manual file operations

- **WHEN** the skill restores a change
- **THEN** it does not manually move the change directory
- **AND** it does not manually edit files under `openspec/specs/`
- **AND** it relies on the CLI for the reversal

#### Scenario: Surface CLI guardrails verbatim

- **WHEN** the CLI refuses to reverse specs because they have drifted, or because a pre-snapshot change contains irreversible operations
- **THEN** the skill reports that refusal to the user
- **AND** it offers the `--keep-specs` option the CLI recommends rather than attempting its own workaround

### Requirement: Confirmation And Output

The skill SHALL confirm the action before running it and present a clear summary of the outcome.

#### Scenario: Confirm before restoring

- **WHEN** the skill has resolved which archived change to restore
- **THEN** it shows the user what it will do (target change, whether specs will be reversed or kept) before invoking the CLI
- **AND** it proceeds only after the user confirms

#### Scenario: Summarize the result

- **WHEN** the CLI completes
- **THEN** the skill displays the restored change name, its new active location, and whether specs were reversed or kept

#### Scenario: Report a clean failure

- **WHEN** the CLI aborts (for example, the destination already exists or the change name is ambiguous)
- **THEN** the skill reports the CLI's diagnostic and the suggested next step
- **AND** it does not attempt a manual fallback
