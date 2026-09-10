# opsx-verify-skill Specification

## Purpose
Define `/opsx:verify` behavior for assessing implementation completeness, correctness, and coherence against change artifacts.

## Requirements
### Requirement: Verify Skill Invocation
The system SHALL provide an `/opsx:verify` skill that validates implementation against change artifacts.

#### Scenario: Verify with change name provided
- **WHEN** agent executes `/opsx:verify <change-name>`
- **THEN** the agent verifies implementation for that specific change
- **AND** produces a verification report

#### Scenario: Verify without change name
- **WHEN** agent executes `/opsx:verify` without a change name
- **THEN** the agent infers the change from conversation context, or auto-selects it when only one active change exists
- **AND** when ambiguous, prompts user to select from all active changes, including changes with no tracked tasks
- **AND** announces which change was selected and how to override

#### Scenario: Change has no task descriptions
- **WHEN** the structured task list provides no usable task descriptions, even if task progress reports nonzero totals
- **THEN** the agent reports Task Completion as not verified with the reason
- **AND** continues checks supported by the remaining artifacts
- **AND** does not require tasks when the schema does not track them

### Requirement: Completeness Verification
The agent SHALL verify that all required work has been completed.

#### Scenario: Task completion check
- **WHEN** verifying completeness
- **THEN** the agent uses the top-level `tasks` and `progress` from apply instructions
- **AND** apply instructions aggregate every concrete file matched by the active schema's `apply.tracks`, regardless of the tracked artifact's ID
- **AND** reports complete and total task counts from `progress`
- **AND** reports completion status with specific incomplete tasks listed
- **AND** reports remaining checkboxes without descriptions when `progress.remaining` exceeds the listed incomplete tasks

#### Scenario: Tracking evidence becomes unavailable
- **WHEN** one or more files matched by `apply.tracks` cannot be read after resolution
- **THEN** apply instructions include every unavailable path and reason
- **AND** preserve tasks and progress from readable tracking files
- **AND** do not report `all_done`
- **AND** the agent marks Task Completion as not verified from partial evidence

#### Scenario: Spec coverage check
- **WHEN** verifying completeness
- **AND** delta specs exist in `openspec/changes/<name>/specs/`
- **THEN** the agent extracts all requirements from delta specs
- **AND** searches codebase for implementation of each requirement
- **AND** reports which requirements appear to have implementation vs which are missing

#### Scenario: All tasks complete
- **WHEN** all tasks are marked complete
- **THEN** report "Tasks: N/N complete"
- **AND** mark Task Completion as passed only when task descriptions are available
- **AND** mark the completeness dimension as passed only when all its checks ran and passed

#### Scenario: Incomplete tasks found
- **WHEN** some tasks are incomplete
- **THEN** report "Tasks: X/N complete"
- **AND** list each incomplete task
- **AND** mark as CRITICAL issue
- **AND** suggest: "Complete remaining tasks or mark as done if already implemented"

### Requirement: Correctness Verification
The agent SHALL verify that implementation matches the specifications.

#### Scenario: Requirement implementation mapping
- **WHEN** verifying correctness
- **THEN** for each requirement in delta specs:
  - Search codebase for implementation
  - Identify relevant files and line numbers
  - Assess whether implementation satisfies the requirement

#### Scenario: Scenario coverage check
- **WHEN** verifying correctness
- **THEN** for each scenario in delta specs:
  - Check if the scenario's conditions are handled in code
  - Check if tests exist that cover the scenario
  - Report coverage status

#### Scenario: Implementation matches spec
- **WHEN** implementation appears to satisfy a requirement
- **THEN** report which files/lines implement it
- **AND** mark requirement as covered

#### Scenario: Implementation diverges from spec
- **WHEN** implementation exists but doesn't match spec intent
- **THEN** report the divergence as WARNING
- **AND** explain what differs
- **AND** suggest: either update implementation or update spec to match reality

#### Scenario: Missing implementation
- **WHEN** no implementation found for a requirement
- **THEN** report as CRITICAL issue
- **AND** suggest: "Implement requirement X" with guidance on what's needed

### Requirement: Coherence Verification
The agent SHALL verify that implementation is sensible and follows design decisions.

#### Scenario: Design.md adherence check
- **WHEN** verifying coherence
- **AND** design.md exists for the change
- **THEN** extract key decisions from design.md
- **AND** verify implementation follows those decisions
- **AND** report any deviations

#### Scenario: No design.md
- **WHEN** verifying coherence
- **AND** no design.md exists
- **THEN** skip design adherence check
- **AND** report "Design Adherence: Not verified (No design.md to verify against)"

#### Scenario: Design decision followed
- **WHEN** implementation follows a design decision
- **THEN** report as confirmed
- **AND** cite evidence from code

#### Scenario: Design decision violated
- **WHEN** implementation contradicts a design decision
- **THEN** report as WARNING
- **AND** explain the contradiction
- **AND** suggest: either update implementation or update design.md

#### Scenario: Code pattern consistency
- **WHEN** verifying coherence
- **AND** available artifacts support identifying implementation changes beyond a tasks-only check
- **THEN** check if new code follows existing project patterns
- **AND** flag any significant deviations as suggestions
- **AND** report Code Pattern Consistency as not verified if implementation changes cannot be identified

### Requirement: Verification Report Format
The agent SHALL produce a structured, prioritized report.

#### Scenario: Report summary
- **WHEN** verification completes
- **THEN** display summary scorecard:
  ```text
  ## Verification Report: <change-name>

  ### Summary
  | Dimension    | Status   |
  |--------------|----------|
  | Completeness | X/Y      |
  | Correctness  | X/Y      |
  | Coherence    | Followed |
  ```
- **AND** report `Not verified (<reason>)` for every skipped or partially verified check in its dimension's status
- **AND** never count a skipped check as passing

#### Scenario: Issue prioritization
- **WHEN** issues are found
- **THEN** group and display in priority order:
  1. CRITICAL - Must fix before archive (missing implementation, incomplete tasks)
  2. WARNING - Should fix (divergence from spec/design, missing tests)
  3. SUGGESTION - Nice to fix (pattern inconsistencies, minor improvements)

#### Scenario: Actionable recommendations
- **WHEN** reporting an issue
- **THEN** include specific, actionable fix recommendation
- **AND** reference relevant files and line numbers where applicable
- **AND** avoid vague suggestions like "consider reviewing"

#### Scenario: All checks pass
- **WHEN** every check ran and no issues were found across all dimensions
- **THEN** display:
  ```text
  All checks passed. Ready for archive.
  ```

#### Scenario: Critical issues found
- **WHEN** CRITICAL issues exist
- **THEN** display:
  ```text
  X critical issue(s) found. Fix before archiving.
  ```
- **AND** do NOT suggest running archive
- **AND** name every skipped check and its reason, if any

#### Scenario: Only warnings
- **WHEN** every check ran and no CRITICAL issues but warnings exist
- **THEN** display:
  ```text
  No critical issues. Y warning(s) to consider.
  Ready for archive (with noted improvements).
  ```

#### Scenario: Only suggestions
- **WHEN** every check ran and only suggestions exist
- **THEN** report "No critical issues or warnings. Z suggestion(s) to consider. Ready for archive (with noted improvements)."

#### Scenario: Checks skipped
- **WHEN** any check was skipped or partially verified and no CRITICAL issues exist
- **THEN** report "No critical issues found in the checks that ran"
- **AND** name every unverified check and its reason
- **AND** include the warning count when nonzero
- **AND** do not claim archive readiness

#### Scenario: Suggestions in final assessment
- **WHEN** suggestions exist
- **THEN** include their count in the final assessment, including assessments with critical issues or skipped checks

### Requirement: Flexible Artifact Handling
The agent SHALL gracefully handle changes with varying artifact completeness.

#### Scenario: Minimal change (tasks only)
- **WHEN** change has only tasks.md
- **THEN** verify task completion only
- **AND** skip spec and design checks
- **AND** note which checks were skipped

#### Scenario: Change with specs but no design
- **WHEN** change has tasks.md and delta specs but no design.md
- **THEN** verify completeness and correctness
- **AND** skip design adherence
- **AND** still check code coherence against project patterns

#### Scenario: Full change (all artifacts)
- **WHEN** change has proposal, design, specs, and tasks
- **THEN** perform all verification checks
- **AND** cross-reference artifacts for consistency

#### Scenario: Unusable or partial artifact evidence
- **WHEN** an artifact cannot be read or lacks usable requirements, scenarios, or design decisions
- **THEN** mark each affected check as not verified with its reason
- **AND** continue checks supported by the remaining evidence without treating partial coverage as a fully verified check

#### Scenario: Intentional artifact omissions
- **WHEN** a check has no supporting artifacts because the schema omits task tracking or optional artifacts, or the change declares `skip_specs: true`
- **THEN** report why the corresponding checks were not verified
- **AND** do not require or create optional or intentionally skipped artifacts to obtain a passing report
- **AND** treat verification as advisory: not verified describes a limit of the report, not a new archive gate
- **AND** leave archive checks and user-confirmation behavior unchanged
