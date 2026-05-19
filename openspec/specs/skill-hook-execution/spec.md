# skill-hook-execution Specification

## Purpose
Define how OpenSpec skills (propose, explore, apply, archive and their opsx:* aliases) discover, evaluate, and enforce hooks declared in `openspec/config.yaml` before and after workflow execution.

## Requirements

### Requirement: Skills check pre-hook before starting workflow

Each skill SHALL call `openspec hooks get pre-<workflow> --json` as its first action after identifying the project root, before performing any workflow work.

#### Scenario: No pre-hook configured
- **WHEN** the skill calls `openspec hooks get pre-<workflow> --json`
- **AND** the result has `exists: false`
- **THEN** the skill proceeds with the workflow without interruption

#### Scenario: Pre-hook has only instruction
- **WHEN** the pre-hook result has `exists: true` and `instruction` is set but `run` is null
- **THEN** the skill incorporates the instruction text into its active reasoning context for the workflow
- **AND** the skill proceeds with the workflow

#### Scenario: Pre-hook has only run command
- **WHEN** the pre-hook result has `exists: true` and `run` is set but `instruction` is null
- **THEN** the skill executes the `run` command as a shell command
- **AND** if the command exits with code 0, the skill proceeds with the workflow
- **AND** if the command exits with a non-zero code, the skill halts and reports the failure

#### Scenario: Pre-hook has both instruction and run
- **WHEN** the pre-hook result has both `instruction` and `run` set
- **THEN** the skill executes the `run` command first
- **AND** if the command succeeds, the skill incorporates the `instruction` into its reasoning context and proceeds
- **AND** if the command fails, the skill halts without incorporating the instruction

### Requirement: Pre-hook run failure blocks workflow execution

When a pre-hook `run` command exits with a non-zero code, the skill SHALL halt workflow execution and surface the failure to the user.

#### Scenario: Pre-hook run command fails
- **WHEN** the pre-hook `run` command exits with code 1
- **THEN** the skill does NOT proceed with any workflow actions
- **AND** the skill reports the command's exit code and stderr output to the user
- **AND** the skill informs the user which hook event failed (e.g., "pre-archive hook failed")

#### Scenario: Pre-hook run command is not found
- **WHEN** the pre-hook `run` command references a script that does not exist
- **THEN** the skill treats this as a command failure (non-zero exit)
- **AND** the error is surfaced to the user with the original command string

### Requirement: Skills check post-hook after completing workflow

Each skill SHALL call `openspec hooks get post-<workflow> --json` after the workflow is complete, before reporting success to the user.

#### Scenario: No post-hook configured
- **WHEN** the skill calls `openspec hooks get post-<workflow> --json`
- **AND** the result has `exists: false`
- **THEN** the skill reports workflow success normally with no additional actions

#### Scenario: Post-hook has only instruction
- **WHEN** the post-hook result has `exists: true` and `instruction` is set but `run` is null
- **THEN** the skill follows the instruction as a post-workflow action (e.g., reviewing output, writing a summary)
- **AND** the skill reports workflow success

#### Scenario: Post-hook has only run command
- **WHEN** the post-hook result has `exists: true` and `run` is set
- **THEN** the skill executes the `run` command after the workflow completes
- **AND** the skill reports workflow success regardless of the command's exit code
- **AND** if the command exits with a non-zero code, the skill surfaces a warning with the exit code and stderr

#### Scenario: Post-hook has both instruction and run
- **WHEN** the post-hook result has both `instruction` and `run` set
- **THEN** the skill follows the instruction first (as a post-workflow action)
- **AND** then executes the `run` command
- **AND** reports workflow success with any run failures surfaced as warnings

### Requirement: Post-hook run failure surfaces as warning, not error

When a post-hook `run` command exits with a non-zero code, the skill SHALL surface a warning but SHALL NOT retroactively report the workflow as failed.

#### Scenario: Post-hook run fails after successful archive
- **WHEN** the archive workflow completes successfully
- **AND** the post-archive `run` command fails
- **THEN** the user sees the archive success message
- **AND** the user also sees a warning: "post-archive hook exited with code <N>: <stderr>"

### Requirement: Hook instruction is injected into skill reasoning context

When a hook entry contains an `instruction` field, the skill SHALL treat the instruction text as a binding directive during (pre) or after (post) workflow execution, equivalent to a user instruction.

#### Scenario: Pre-hook instruction modifies workflow behavior
- **WHEN** `pre-archive` hook has `instruction: "Before archiving, verify all tasks are marked done"`
- **THEN** the skill checks that all tasks are marked done before proceeding with archive
- **AND** if the check fails, the skill halts and reports which tasks are incomplete

#### Scenario: Post-hook instruction triggers follow-up action
- **WHEN** `post-archive` hook has `instruction: "Review the archived change and consolidate the error log"`
- **THEN** after archiving, the skill reads the archived change and produces an error log summary

### Requirement: All four skill families enforce hooks

The hook enforcement pattern SHALL be applied to all four skill families and their aliases.

#### Scenario: openspec-propose skill checks pre-propose and post-propose hooks
- **WHEN** the openspec-propose (or opsx:propose) skill runs
- **THEN** it checks `pre-propose` before starting and `post-propose` after completing

#### Scenario: openspec-explore skill checks pre-explore and post-explore hooks
- **WHEN** the openspec-explore (or opsx:explore) skill runs
- **THEN** it checks `pre-explore` before starting and `post-explore` after completing

#### Scenario: openspec-apply-change skill checks pre-apply and post-apply hooks
- **WHEN** the openspec-apply-change (or opsx:apply) skill runs
- **THEN** it checks `pre-apply` before starting and `post-apply` after completing

#### Scenario: openspec-archive-change skill checks pre-archive and post-archive hooks
- **WHEN** the openspec-archive-change (or opsx:archive) skill runs
- **THEN** it checks `pre-archive` before starting and `post-archive` after completing
