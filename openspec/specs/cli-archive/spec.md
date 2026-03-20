# CLI Archive Command Specification

## Purpose
The archive command moves completed changes from the active changes directory to the archive folder with date-based naming, following OpenSpec conventions.

## Command Syntax
```bash
openspec archive [change-name] [--yes|-y]
```

Options:
- `--yes`, `-y`: Skip confirmation prompts (for automation)
## Requirements
### Requirement: Change Selection

The command SHALL support both interactive and direct change selection methods.

#### Scenario: Interactive selection

- **WHEN** no change-name is provided
- **THEN** display interactive list of available changes (excluding archive/)
- **AND** allow user to select one

#### Scenario: Direct selection

- **WHEN** change-name is provided
- **THEN** use that change directly
- **AND** validate it exists

### Requirement: Task Completion Check

The command SHALL verify task completion status before archiving to prevent premature archival.

#### Scenario: Incomplete tasks found

- **WHEN** incomplete tasks are found (marked with `- [ ]`)
- **THEN** display all incomplete tasks to the user
- **AND** prompt for confirmation to continue
- **AND** default to "No" for safety

#### Scenario: All tasks complete

- **WHEN** all tasks are complete OR no tasks.md exists
- **THEN** proceed with archiving without prompting

### Requirement: Archive Process

The archive operation SHALL follow a structured process to safely move changes to the archive.

#### Scenario: Performing archive

- **WHEN** archiving a change
- **THEN** execute these steps:
  1. Create archive/ directory if it doesn't exist
  2. Generate target name as `YYYY-MM-DD-[change-name]` using current date
  3. Check if target directory already exists
  4. Update main specs from the change's future state specs (see Spec Update Process below)
  5. Move the entire change directory to the archive location

#### Scenario: Archive already exists

- **WHEN** target archive already exists
- **THEN** fail with error message
- **AND** do not overwrite existing archive

#### Scenario: Successful archive

- **WHEN** move succeeds
- **THEN** display success message with archived name and list of updated specs

### Requirement: Spec Update Process

The archive command MUST apply delta specs to main specs using structured merge operations that preserve content at the finest granularity possible — specifically, at the scenario level within requirement blocks.

#### Scenario: Applying delta changes

- **WHEN** archiving a change with delta-based specs
- **THEN** parse and apply delta changes as defined in openspec-conventions
- **AND** validate all operations before applying

#### Scenario: Validating delta changes

- **WHEN** processing delta changes
- **THEN** perform validations as specified in openspec-conventions
- **AND** if validation fails, show specific errors and abort

#### Scenario: Conflict detection

- **WHEN** applying deltas would create duplicate requirement headers
- **THEN** abort with error message showing the conflict
- **AND** suggest manual resolution

#### Scenario: MODIFIED requirement merges at scenario level

- WHEN a delta spec contains a MODIFIED requirement with scenario-level tags (`(MODIFIED)`, `(REMOVED)`)
- THEN the merge MUST operate at the `#### Scenario:` level within the requirement block:
  1. **Scenarios tagged `(MODIFIED)`**: Replace the matching scenario in the main spec (matched by name after stripping the tag)
  2. **Scenarios tagged `(REMOVED)`**: Remove the matching scenario from the main spec
  3. **Scenarios with no tag that exist in main**: Replace the matching scenario (implicit update)
  4. **Scenarios with no tag that do NOT exist in main**: Append as new scenarios
  5. **Main scenarios not referenced by delta**: Preserved unchanged
- AND the requirement-level description (text between `### Requirement:` header and first `#### Scenario:`) MUST be replaced by the delta's description if the delta provides a non-empty description
- AND the merged block MUST be reconstructed in order: description + preserved main scenarios (in original order) + new scenarios (appended)
- AND the merged output MUST NOT contain delta-specific tags (`(MODIFIED)`, `(REMOVED)`) in scenario headers — tags MUST be stripped before writing to the main spec

> The last clause ("tags MUST be stripped") was missing from the original spec. This caused tag pollution in merged main specs (PR #843 review finding).

#### Scenario: Full-block replacement for legacy delta specs

- WHEN a delta spec contains a MODIFIED requirement where NO scenarios have tags (`(MODIFIED)`, `(REMOVED)`)
- THEN the merge MUST use full-block replacement (legacy behavior)
- AND this ensures backward compatibility with existing delta specs that include all scenarios

#### Scenario: Scenario count warning on unexpected decrease

- WHEN a scenario-level merge results in fewer scenarios than expected
- THEN the merge MUST compute `expected_count` as `main_count - matchedRemovedCount`
- AND the merge MUST emit a warning when `merged_count < expected_count`: `"⚠️ Warning: {specName} requirement '{name}': scenario count {merged_count} is less than expected {expected_count} ({main_count} main - {matchedRemovedCount} removed)"`
- AND the merge MUST still proceed (warning, not error)

> Updated to align with precision warning suppression logic introduced in the same PR. Wording now matches the staged main spec and implementation exactly.

#### Scenario: Scenario name normalization for matching

- WHEN matching delta scenarios to main scenarios
- THEN the match MUST be performed by normalizing scenario names: strip `(MODIFIED)` and `(REMOVED)` tags, then trim whitespace
- AND `Phase 2 gate check (MODIFIED)` MUST match `Phase 2 gate check`

#### Scenario: Unmatched MODIFIED scenario emits warning (ADDED)

- WHEN a delta scenario is tagged `(MODIFIED)` but its normalized name does NOT match any scenario in the main requirement
- THEN the system MUST emit a warning: `⚠️ Warning: MODIFIED scenario '<name>' not found in main — appended as new`
- AND the scenario MUST still be appended to the merged output (non-breaking behavior)
- AND the scenario header MUST have the `(MODIFIED)` tag stripped before writing

> This catches typos in scenario names. Without this warning, a mistyped MODIFIED scenario silently duplicates instead of replacing the intended target.

#### Scenario: Unmatched REMOVED scenario emits warning (ADDED)

- WHEN a delta scenario is tagged `(REMOVED)` but its normalized name does NOT match any scenario in the main requirement
- THEN the system MUST emit a warning: `⚠️ Warning: REMOVED scenario '<name>' not found in main — ignored`
- AND the unmatched REMOVED scenario MUST NOT be counted toward `matchedRemovedCount`
- AND the system MUST NOT create or append any new scenario for the unmatched entry

> Symmetry with unmatched MODIFIED warning. Without this, a typo in a REMOVED tag silently does nothing AND can suppress the scenario-count warning via overcounting.

#### Scenario: Precision warning suppression for REMOVED scenarios

- WHEN a delta contains scenarios tagged `(REMOVED)` AND the merged scenario count is less than the main scenario count
- THEN the system MUST calculate `matchedRemovedCount` as the number of REMOVED-tagged scenarios whose normalized name MATCHED an existing main scenario
- AND the system MUST calculate the expected count as: `main_count - matchedRemovedCount`
- AND the system MUST only suppress the warning if `merged_count >= expected_count`
- AND if `merged_count < expected_count`, the system MUST emit a warning including the expected count, actual count, main count, and matched removed count

> Previously, ANY `(REMOVED)` tag suppressed the warning entirely. The revised logic uses matched removals only, preventing unmatched typos from hiding real scenario loss.

#### Scenario: Unique counting for matched REMOVED scenarios (ADDED)

- WHEN a delta spec contains multiple `(REMOVED)` entries with the same normalized scenario name
- THEN the system MUST count each unique matched scenario name only ONCE toward `matchedRemovedCount`
- AND `matchedRemovedCount` MUST equal the number of unique REMOVED names that matched main scenarios
- AND duplicate REMOVED entries for the same name MUST NOT inflate `matchedRemovedCount`

> Prevents duplicate REMOVED entries from understating `expectedMinCount`, which would suppress warnings when scenarios are accidentally dropped.

#### Scenario: Deduplicated appends for new delta scenarios (ADDED)

- WHEN appending new delta scenarios (not matched to any main scenario)
- THEN the system MUST track each appended scenario name to prevent duplicate appends
- AND if a delta contains multiple scenarios with the same normalized name, only the first MUST be appended
- AND subsequent duplicates MUST be skipped silently

> Prevents duplicate scenario entries in merged output when delta contains multiple entries with the same normalized name.

### Requirement: Confirmation Behavior

The spec update confirmation SHALL provide clear visibility into changes before they are applied.

#### Scenario: Displaying confirmation

- **WHEN** prompting for confirmation
- **THEN** display a clear summary showing:
  - Which specs will be created (new capabilities)
  - Which specs will be updated (existing capabilities)
  - The source path for each spec
- **AND** format the confirmation prompt as:
  ```
  The following specs will be updated:
  
  NEW specs to be created:
    - cli-archive (from changes/add-archive-command/specs/cli-archive/spec.md)
  
  EXISTING specs to be updated:
    - cli-init (from changes/update-init-command/specs/cli-init/spec.md)
  
  Update 2 specs and archive 'add-archive-command'? [y/N]:
  ```
#### Scenario: Handling confirmation response

- **WHEN** waiting for user confirmation
- **THEN** default to "No" for safety (require explicit "y" or "yes")
- **AND** skip confirmation when `--yes` or `-y` flag is provided

#### Scenario: User declines confirmation

- **WHEN** user declines the confirmation
- **THEN** abort the entire archive operation
- **AND** display message: "Archive cancelled. No changes were made."
- **AND** exit with non-zero status code

### Requirement: Error Conditions

The command SHALL handle various error conditions gracefully.

#### Scenario: Handling errors

- **WHEN** errors occur
- **THEN** handle the following conditions:
  - Missing openspec/changes/ directory
  - Change not found
  - Archive target already exists
  - File system permissions issues

### Requirement: Skip Specs Option

The archive command SHALL support a `--skip-specs` flag that skips all spec update operations and proceeds directly to archiving.

#### Scenario: Skipping spec updates with flag

- **WHEN** executing `openspec archive <change> --skip-specs`
- **THEN** skip spec discovery and update confirmation
- **AND** proceed directly to moving the change to archive
- **AND** display a message indicating specs were skipped

### Requirement: Non-blocking confirmation

The archive operation SHALL proceed when the user declines spec updates instead of cancelling the entire operation.

#### Scenario: User declines spec update confirmation

- **WHEN** the user declines spec update confirmation
- **THEN** skip spec updates
- **AND** continue with the archive operation
- **AND** display a success message indicating specs were not updated

### Requirement: Display Output

The command SHALL provide clear feedback about delta operations.

#### Scenario: Showing delta application

- **WHEN** applying delta changes
- **THEN** display for each spec:
  - Number of requirements added
  - Number of requirements modified
  - Number of requirements removed
  - Number of requirements renamed
- **AND** use standard output symbols (+ ~ - →) as defined in openspec-conventions:
  ```
  Applying changes to specs/user-auth/spec.md:
    + 2 added
    ~ 3 modified
    - 1 removed
    → 1 renamed
  ```

### Requirement: Archive Validation

The archive command SHALL validate changes before applying them to ensure data integrity.

#### Scenario: Pre-archive validation

- **WHEN** executing `openspec archive change-name`
- **THEN** validate the change structure first
- **AND** only proceed if validation passes
- **AND** show validation errors if it fails

#### Scenario: Force archive without validation

- **WHEN** executing `openspec archive change-name --no-validate`
- **THEN** skip validation (unsafe mode)
- **AND** show warning about skipping validation

### Requirement: Scenario-Level Parsing

The requirement block parser MUST support parsing `#### Scenario:` sections within requirement blocks into structured data, enabling fine-grained merge operations.

#### Scenario: Parse scenarios from requirement block

- WHEN a `RequirementBlock` is parsed for scenarios
- THEN the parser MUST extract each `#### Scenario:` section as a `ScenarioBlock` containing:
  - `headerLine`: the full `#### Scenario:` line
  - `name`: the scenario name (without tags)
  - `tag`: optional `MODIFIED`, `REMOVED`, or `undefined`
  - `raw`: the full scenario block content including header
- AND the parser MUST extract the requirement-level description (text between `### Requirement:` header and first `#### Scenario:`)
- AND the parser MUST handle requirements with no scenarios (description-only blocks)

#### Scenario: Extract tags from scenario headers

- WHEN a scenario header contains a tag suffix like `(MODIFIED)` or `(REMOVED)`
- THEN the parser MUST extract the tag as a separate field
- AND the scenario name MUST NOT include the tag
- AND the tag MUST be case-insensitive for matching

## Why These Decisions

**Interactive selection**: Reduces typing and helps users see available changes
**Task checking**: Prevents accidental archiving of incomplete work
**Date prefixing**: Maintains chronological order and prevents naming conflicts
**No overwrite**: Preserves historical archives and prevents data loss
**Spec updates before archiving**: Specs in the main directory represent current reality; when a change is deployed and archived, its future state specs become the new reality and must replace the main specs
**Confirmation for spec updates**: Provides visibility into what will change, prevents accidental overwrites, and ensures users understand the impact before specs are modified
**--yes flag for automation**: Allows CI/CD pipelines to archive without interactive prompts while maintaining safety by default for manual use