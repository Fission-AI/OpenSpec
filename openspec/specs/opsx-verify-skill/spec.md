# opsx-verify-skill Specification

## Purpose
Define `/opsx:verify` behavior for assessing implementation completeness, correctness, and coherence against change artifacts, including an opt-in bounded adversarial mode.

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
- **AND** when ambiguous, prompts user to select from available changes, showing only changes that have implementation tasks
- **AND** announces which change was selected and how to override

#### Scenario: Change has no tasks
- **WHEN** selected change has no tasks.md or tasks are empty
- **THEN** the agent reports "No tasks to verify"
- **AND** suggests running `/opsx:continue` to create tasks

### Requirement: Optional Adversarial Verification
The agent SHALL support `--adversarial` as an explicit opt-in mode of the existing verify workflow while preserving standard verification behavior when the mode is absent.

#### Scenario: Standard verification remains the default
- **WHEN** `/opsx:verify <change-name>` is invoked without `--adversarial`
- **THEN** the agent performs the existing completeness, correctness, and coherence checks
- **AND** does not perform adversarial claim selection, counterexample search, or extra validation
- **AND** uses the existing baseline report and archive-readiness assessment

#### Scenario: Adversarial flag is workflow input
- **WHEN** `/opsx:verify <change-name> --adversarial` is invoked
- **THEN** the agent removes `--adversarial` from positional input before selecting the change
- **AND** does not treat `--adversarial` as a change name
- **AND** does not forward `--adversarial` to any `openspec` CLI command

#### Scenario: Adversarial effort is bounded and prioritized
- **WHEN** adversarial mode is enabled
- **THEN** the agent reuses evidence gathered by standard verification
- **AND** prioritizes claims touching changed implementation paths, high-risk boundaries and error paths, cross-component behavior, and other contract-important behavior
- **AND** checks at most 5 important claims in one invocation
- **AND** reports important claims beyond the budget as `UNCHECKED`
- **AND** reports the lower-priority unchecked remainder explicitly rather than implying exhaustive coverage

#### Scenario: Selected claims are actively challenged
- **WHEN** an important claim is selected for adversarial verification
- **THEN** the agent traces the relevant execution path
- **AND** inspects whether tests assert the required outcome
- **AND** tries a plausible boundary, negative/error, alternate-state, or cross-component counterexample
- **AND** runs the smallest focused executable validation when practical
- **AND** classifies the claim as `FAILED`, `WEAK EVIDENCE`, `SUPPORTED`, or `UNVERIFIED`

#### Scenario: Failed important claim blocks readiness
- **WHEN** any important claim is `FAILED`
- **THEN** the adversarial final assessment is `Not ready`
- **AND** the result includes the artifact claim, contradicting evidence, and concrete failure mechanism

#### Scenario: Weak or unavailable evidence blocks readiness
- **WHEN** no important claim is `FAILED`
- **AND** any important claim is `WEAK EVIDENCE` or `UNVERIFIED`
- **THEN** the adversarial final assessment is `Partially verified — not ready`

#### Scenario: Important claim remains unchecked
- **WHEN** no important claim is `FAILED`, `WEAK EVIDENCE`, or `UNVERIFIED`
- **AND** an important claim is `UNCHECKED` because the adversarial budget was exhausted
- **THEN** the adversarial final assessment is `Partially verified — not ready`

#### Scenario: Important claims are supported
- **WHEN** every important claim is `SUPPORTED`
- **THEN** the adversarial final assessment is `Ready`
- **AND** any lower-priority `UNCHECKED` remainder is still reported explicitly
- **AND** the report does not claim exhaustive proof

### Requirement: Completeness Verification
The agent SHALL verify that all required work has been completed.

#### Scenario: Task completion check
- **WHEN** verifying completeness
- **THEN** the agent reads tasks.md
- **AND** counts tasks marked `- [x]` (complete) vs `- [ ]` (incomplete)
- **AND** reports completion status with specific incomplete tasks listed

#### Scenario: Spec coverage check
- **WHEN** verifying completeness
- **AND** delta specs exist in `openspec/changes/<name>/specs/`
- **THEN** the agent extracts all requirements from delta specs
- **AND** searches codebase for implementation of each requirement
- **AND** reports which requirements appear to have implementation vs which are missing

#### Scenario: All tasks complete
- **WHEN** all tasks are marked complete
- **THEN** report "Tasks: N/N complete"
- **AND** mark completeness dimension as passed

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
- **AND** note "No design.md to verify against"

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
- **THEN** check if new code follows existing project patterns
- **AND** flag any significant deviations as suggestions

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
- **WHEN** no issues found across all dimensions
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

#### Scenario: Only warnings/suggestions
- **WHEN** no CRITICAL issues but warnings exist
- **THEN** display:
  ```text
  No critical issues. Y warning(s) to consider.
  Ready for archive (with noted improvements).
  ```

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
