## ADDED Requirements

### Requirement: Unified Check Command

The system SHALL provide an `openspec check` command — the deterministic spec linter — that runs the repository's deterministic gates (format canonical-form, sync delta↔spec consistency and conflicts, and spec validation) in one invocation and exits non-zero if any gate fails. It SHALL run in pure code without AI inference.

#### Scenario: Run all deterministic gates

- **WHEN** the user runs `openspec check`
- **THEN** the command runs `format --check`, `sync --check`, and `validate` across the repository's specs and active changes
- **AND** it exits zero only if every gate passes, and non-zero (naming the failing gate and files) otherwise

#### Scenario: Check all active changes

- **WHEN** the user runs `openspec check --all`
- **THEN** it includes cross-change checks (e.g. two active changes targeting the same requirement) in addition to per-change checks

#### Scenario: No inference

- **WHEN** `openspec check` runs
- **THEN** it computes every result in code
- **AND** it does not call a language model — it is safe to run with no API keys

### Requirement: Same Gate For Pre-Commit And CI

The check command SHALL be invocable identically as a local pre-commit hook and as a post-commit CI job, with the only difference being where it is invoked — the same binary, flags, and exit-code contract in both.

#### Scenario: Pre-commit usage

- **WHEN** `openspec check` runs from a pre-commit hook
- **THEN** a passing check allows the commit to proceed
- **AND** a failing check blocks the commit with a non-zero exit and a report of what to fix

#### Scenario: CI usage

- **WHEN** `openspec check` runs as a CI step on a pull request
- **THEN** a passing check allows the job to succeed
- **AND** a failing check fails the job with the same non-zero exit and report as the pre-commit run

#### Scenario: Identical verdict in both contexts

- **WHEN** the same repository state is checked locally and in CI
- **THEN** both reach the same pass or fail verdict (the gate is deterministic and environment-independent)

### Requirement: Auto-Fix Mode

The check command SHALL support a `--fix` mode that applies the deterministic auto-fixes (format and sync regeneration) so a pre-commit hook can remediate drift in place before the commit proceeds, leaving specs canonical and in sync.

#### Scenario: Fix remediates drift

- **WHEN** the user runs `openspec check --fix`
- **THEN** the command runs `format --fix` and `sync --fix` to regenerate canonical, in-sync specs
- **AND** a subsequent `openspec check` passes

#### Scenario: Fix does not mask non-mechanical failures

- **WHEN** `--fix` runs and a failure cannot be resolved deterministically (for example, a delta that does not cleanly apply, or a cross-change conflict)
- **THEN** the command applies what it safely can, leaves the unfixable issue reported, and still exits non-zero
- **AND** it does not invent a resolution

### Requirement: Incremental Checking

The check command MAY use recorded content digests to skip specs and files whose content is unchanged since they were last checked, re-checking only what changed. A skip SHALL be permitted only when it cannot change the verdict versus a full check.

#### Scenario: Unchanged inputs skipped

- **WHEN** `openspec check` runs and an input's digest matches its recorded digest
- **THEN** the command may skip re-checking it
- **AND** the overall verdict is identical to a full check

#### Scenario: Changed or unknown inputs fully checked

- **WHEN** an input's digest does not match, is missing, or uses an unrecognized scheme
- **THEN** the command performs the full check for it

### Requirement: Hook Installation

The system SHALL provide a runner-agnostic way to install `openspec check` as a git pre-commit hook, and SHALL NOT modify the user's git configuration or hooks without explicit action.

#### Scenario: Install on request

- **WHEN** the user opts in to installing the hook (for example, `openspec check --install-hook`)
- **THEN** the command installs a pre-commit hook that runs `openspec check`
- **AND** it composes with an existing hook rather than silently overwriting it

#### Scenario: Never automatic

- **WHEN** the user has not opted in
- **THEN** OpenSpec installs no hook and changes no git configuration

### Requirement: CI Template

The system SHALL document and provide a copy-paste CI configuration that runs `openspec check` as a drift gate, requiring no model and no API keys.

#### Scenario: Documented CI gate

- **WHEN** a maintainer wants a CI drift gate
- **THEN** the project provides a ready CI step that runs `openspec check`
- **AND** the step fails the build when committed specs are not canonical, not in sync with deltas, or otherwise invalid

### Requirement: JSON Output

The check command SHALL support `--json`, emitting a machine-readable summary of which gates ran, which passed or failed, and the offending files.

#### Scenario: JSON summary

- **WHEN** the user runs `openspec check --json`
- **THEN** it emits a structured result per gate (format, sync, validate) with pass/fail and the files involved
- **AND** the process exit code reflects the overall verdict
