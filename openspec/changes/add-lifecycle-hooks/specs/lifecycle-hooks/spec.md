# Spec: Lifecycle Hooks

## ADDED Requirements

### Requirement: Hook Directory Discovery

The system SHALL discover hooks from the `openspec/hooks/` directory by scanning for integration subfolders.

#### Scenario: Hooks directory exists with integrations
- **WHEN** `openspec/hooks/` contains subfolders (e.g., `linear/`, `slack/`)
- **THEN** system scans each subfolder for hook files

#### Scenario: Hooks directory does not exist
- **WHEN** `openspec/hooks/` directory does not exist
- **THEN** system returns no hooks (not an error condition)

#### Scenario: Hooks directory is empty
- **WHEN** `openspec/hooks/` exists but contains no subfolders
- **THEN** system returns no hooks without warning

#### Scenario: Integration folder is empty
- **WHEN** an integration subfolder exists but contains no files
- **THEN** system skips that integration without warning

### Requirement: Hook File Naming Convention

The system SHALL extract timing and phase from hook filenames using the pattern `{before|after}-{phase}.md`.

#### Scenario: Valid before hook filename
- **WHEN** file is named `before-proposal.md`
- **THEN** system extracts timing=`before` and phase=`proposal`

#### Scenario: Valid after hook filename
- **WHEN** file is named `after-apply.md`
- **THEN** system extracts timing=`after` and phase=`apply`

#### Scenario: Custom phase name
- **WHEN** file is named `before-review.md`
- **THEN** system extracts timing=`before` and phase=`review`

#### Scenario: Invalid filename format
- **WHEN** file is named `setup.md` (no timing prefix)
- **THEN** system ignores the file with debug log

#### Scenario: Invalid timing prefix
- **WHEN** file is named `during-proposal.md`
- **THEN** system ignores the file with debug log

#### Scenario: Non-markdown file
- **WHEN** file is named `before-proposal.txt`
- **THEN** system ignores the file (only `.md` files processed)

### Requirement: Hook Composition

The system SHALL concatenate hooks from all integration folders for the same phase and timing.

#### Scenario: Multiple integrations with same hook
- **WHEN** both `linear/before-proposal.md` and `slack/before-proposal.md` exist
- **THEN** both are concatenated into the before-proposal hooks

#### Scenario: Alphabetical ordering by integration
- **GIVEN** integrations `linear/` and `another/` both have `before-proposal.md`
- **WHEN** hooks are composed
- **THEN** `another/before-proposal.md` appears before `linear/before-proposal.md`

#### Scenario: Single integration with hook
- **WHEN** only `linear/after-archive.md` exists for that phase/timing
- **THEN** only that hook content is used

### Requirement: Duplicate Detection

The system SHALL warn when duplicate filenames exist within the same integration folder.

#### Scenario: No duplicates
- **WHEN** integration folder contains unique filenames
- **THEN** no warnings are logged

#### Scenario: Duplicate detected (case sensitivity)
- **WHEN** integration folder contains both `before-proposal.md` and `BEFORE-PROPOSAL.md` on case-insensitive filesystem
- **THEN** system logs a warning about the duplicate

### Requirement: Supported Lifecycle Phases

The system SHALL support hooks for any phase name, not a hardcoded list.

#### Scenario: Standard phase hooks
- **WHEN** files match `before-proposal.md`, `after-apply.md`, `before-archive.md`
- **THEN** system processes them for their respective phases

#### Scenario: Custom phase hooks
- **WHEN** file matches `before-review.md` (custom phase from schema)
- **THEN** system processes it for the `review` phase

#### Scenario: Unknown phase with no matching workflow
- **WHEN** file matches `before-unknown.md` but no workflow uses `unknown` phase
- **THEN** hook is loaded but never injected (no error)

### Requirement: Hook Timing Points

The system SHALL support `before` and `after` timing for each lifecycle phase.

#### Scenario: Before hook timing
- **WHEN** a `before` hook exists for a phase
- **THEN** the hook content is injected after guardrails and before the main steps

#### Scenario: After hook timing
- **WHEN** an `after` hook exists for a phase
- **THEN** the hook content is injected after the references section

#### Scenario: Both before and after hooks
- **WHEN** both `before` and `after` hooks exist for a phase
- **THEN** both are injected at their respective positions

### Requirement: Hook Content Size Limit

The system SHALL enforce a 50KB size limit per hook file to prevent instruction bloat.

#### Scenario: Hook content within limit
- **WHEN** hook file is under 50KB
- **THEN** content is included in phase instructions

#### Scenario: Hook content exceeds limit
- **WHEN** hook file exceeds 50KB
- **THEN** system logs a warning with the size and limit, and skips that hook file

#### Scenario: Combined hooks under total limit
- **WHEN** multiple hook files for same phase are each under 50KB
- **THEN** all are concatenated (no aggregate limit, only per-file)

### Requirement: Hook Injection into Phase Instructions

The system SHALL inject resolved hook content into the slash command templates at the appropriate positions.

#### Scenario: Before hook injection
- **WHEN** generating proposal instructions with `before` hooks discovered
- **THEN** output includes:
  1. Guardrails section
  2. **Hook content** (with integration header: `## linear: Before Proposal`)
  3. Steps section
  4. References section

#### Scenario: After hook injection
- **WHEN** generating proposal instructions with `after` hooks discovered
- **THEN** output includes:
  1. Guardrails section
  2. Steps section
  3. References section
  4. **Hook content** (with integration header: `## linear: After Proposal`)

#### Scenario: No hooks discovered
- **WHEN** generating phase instructions with no hooks in `openspec/hooks/`
- **THEN** output is identical to current behavior (no additional sections)

#### Scenario: Hook section headers include integration name
- **WHEN** hook from `linear/before-proposal.md` is injected
- **THEN** it is prefixed with header: `## linear: Before Proposal`

#### Scenario: Multiple integrations in same position
- **GIVEN** `another/before-proposal.md` and `linear/before-proposal.md` exist
- **WHEN** before hooks are injected
- **THEN** output includes:
  ```markdown
  ## another: Before Proposal
  [content from another]

  ## linear: Before Proposal
  [content from linear]
  ```

### Requirement: Hook Loading During Template Generation

The system SHALL discover and load hooks when generating slash command templates, not ahead of time.

#### Scenario: Hooks discovered during template generation
- **WHEN** slash command templates are generated
- **THEN** system scans `openspec/hooks/` at that time

#### Scenario: File changes reflected immediately
- **WHEN** a hook file is modified between command invocations
- **THEN** the next template generation uses the updated content

#### Scenario: Missing project root
- **WHEN** template generation cannot determine project root
- **THEN** hooks are skipped without error
