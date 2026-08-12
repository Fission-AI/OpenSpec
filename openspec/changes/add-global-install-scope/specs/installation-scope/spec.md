## Purpose

Define how OpenSpec selects, resolves, reports, and safely transitions the installation scope of generated workflow skills and commands.

## ADDED Requirements

### Requirement: Install scope preference model
The system SHALL support a user-level preferred install scope with values `global` and `project` and a run-only override for commands that expose scope selection.

#### Scenario: New user default
- **WHEN** no global config file exists and no run-only override is provided
- **THEN** the preferred install scope SHALL be `global`
- **AND** the source SHALL be reported as `new-default`

#### Scenario: Legacy user default
- **WHEN** a global config file exists without `installScope`
- **AND** no run-only override is provided
- **THEN** the preferred install scope SHALL be `project`
- **AND** the source SHALL be reported as `legacy-default`

#### Scenario: Explicit preference
- **WHEN** the global config contains `installScope: project`
- **AND** no run-only override is provided
- **THEN** the preferred install scope SHALL be `project`
- **AND** the source SHALL be reported as `explicit`

#### Scenario: Run-only override
- **WHEN** the persisted preference is `global`
- **AND** a command run explicitly requests `project`
- **THEN** that run SHALL prefer `project`
- **AND** the persisted preference SHALL remain unchanged
- **AND** managed artifacts in other scopes SHALL be preserved

### Requirement: Effective scope resolution by enabled tool surface
The system SHALL resolve effective scope independently for each enabled skills or commands surface after applying profile, delivery, and command-surface capability behavior.

#### Scenario: Preferred scope is supported
- **WHEN** an enabled tool surface supports the preferred scope
- **THEN** that surface SHALL use the preferred scope as its effective scope

#### Scenario: Different surfaces resolve differently
- **WHEN** a tool's skills support `global` and `project`
- **AND** its commands support only `project`
- **AND** the run prefers `global` with both surfaces enabled
- **THEN** skills SHALL use effective scope `global`
- **AND** commands SHALL use effective scope `project`
- **AND** command output SHALL identify the command-surface fallback

#### Scenario: Surface disabled for generation
- **WHEN** delivery or command-surface capability disables a tool surface
- **THEN** that surface SHALL NOT become a desired generation surface or cause a generation compatibility failure
- **AND** existing managed artifacts SHALL be classified deterministically as cleanup-only or preserved according to delivery and command-surface behavior

#### Scenario: Cleanup-only surface is preflighted
- **WHEN** a disabled surface is classified as cleanup-only
- **AND** an exact managed artifact exists at a target authorized for cleanup
- **THEN** that target SHALL be included in whole-run path preflight before any mutation
- **AND** an unsafe cleanup target SHALL fail the run before other selected tools are mutated

#### Scenario: Preserved surface is excluded from cleanup
- **WHEN** current delivery and command-surface behavior preserves a shared surface
- **THEN** its managed artifacts SHALL NOT enter the cleanup plan

#### Scenario: Skills-invocable command surface
- **WHEN** delivery is `commands`
- **AND** the selected tool exposes commands through invocable skills
- **THEN** its enabled skills surface SHALL be resolved using skills scope support
- **AND** no command-file scope SHALL be invented

### Requirement: Deterministic fallback and preflight
The system SHALL fall back to an alternate supported scope for desired surfaces and SHALL validate every desired mutation and authorized cleanup-only target before performing filesystem mutations.

#### Scenario: Preferred scope is unsupported but alternate is supported
- **WHEN** an enabled surface does not support the preferred scope
- **AND** it supports the alternate scope
- **THEN** the alternate scope SHALL become effective
- **AND** a fallback reason SHALL be included in user-facing output

#### Scenario: Neither scope is usable
- **WHEN** an enabled surface supports neither available scope or its declared target cannot be resolved safely
- **THEN** the command SHALL fail before writing or removing files
- **AND** the error SHALL identify the tool, surface, requested scope, and remediation

#### Scenario: Mixed selection contains an incompatible surface
- **WHEN** any enabled surface in a multi-tool run cannot resolve a usable target
- **THEN** preflight SHALL fail the run before any selected tool is mutated

### Requirement: Effective scope reporting
The system SHALL make shared global mutations, fallbacks, and split-scope results visible with concrete target paths.

#### Scenario: Global target is used
- **WHEN** an enabled surface resolves to `global`
- **THEN** the summary SHALL identify that its artifacts are shared across projects
- **AND** SHALL display the resolved global target path

#### Scenario: Fallback occurs
- **WHEN** any surface falls back from the preferred scope
- **THEN** the summary SHALL display requested and effective scope for that surface
- **AND** SHALL display the effective target path

#### Scenario: Run-only override preserves another scope
- **WHEN** a run-only override writes or refreshes an effective target
- **AND** managed copies also exist in another scope
- **THEN** the summary SHALL identify the preserved other-scope paths
- **AND** SHALL explain that persisting the preference and running without `--scope` performs a durable migration

#### Scenario: All surfaces use the unremarkable project preference
- **WHEN** every enabled surface uses requested scope `project` without fallback
- **THEN** output MAY use a compact project-scope summary without repeating every surface

### Requirement: Cross-platform and contained path behavior
Install scope resolution and mutation SHALL use platform-correct paths and keep every target within its declared project or user directory.

#### Scenario: Global path on Windows
- **WHEN** effective scope is `global`
- **AND** the command runs on Windows
- **THEN** the target SHALL be resolved from the Windows user home and tool metadata
- **AND** SHALL use Windows path joining and separators
- **AND** SHALL NOT embed a POSIX home-relative path in the result

#### Scenario: Project path on every platform
- **WHEN** effective scope is `project`
- **THEN** the target SHALL remain within the resolved project root after canonical path checks

#### Scenario: Global path escapes through a symbolic link
- **WHEN** a global target or an existing parent resolves outside its allowed user directory
- **THEN** the command SHALL fail before writing or removing artifacts through that path

### Requirement: Cleanup safety and migration authority
Scope reconciliation SHALL establish and verify replacement artifacts before removing explicitly known OpenSpec-managed artifacts, and SHALL allow cross-scope cleanup only when the run uses the persisted or migration-aware default rather than a run-only override and has explicit migration confirmation.

#### Scenario: Durable transition previews cleanup in either direction
- **WHEN** a run without `--scope` plans a `project` to `global` or `global` to `project` transition
- **AND** managed artifacts at the previous scope would be removed
- **THEN** the command SHALL complete path preflight and display the transition direction, destination paths, and cleanup paths before mutation
- **AND** SHALL warn when a cleanup path is global and may be shared by other projects
- **AND** an interactive run SHALL request confirmation with a default of No

#### Scenario: User declines durable transition cleanup
- **WHEN** an interactive user declines the cross-scope cleanup confirmation
- **THEN** the command SHALL exit without writing or removing scoped artifacts
- **AND** SHALL leave the persisted install-scope preference unchanged

#### Scenario: Non-interactive transition lacks authorization
- **WHEN** a non-interactive run would perform cross-scope cleanup
- **AND** `--force` is absent
- **THEN** the command SHALL fail before filesystem mutation
- **AND** SHALL identify the planned cleanup paths and explain how to rerun with explicit authorization

#### Scenario: Force authorizes durable transition cleanup
- **WHEN** a durable transition is run with `--force`
- **THEN** the command SHALL treat the transition cleanup as confirmed without prompting
- **AND** SHALL still report the transition direction and concrete paths

#### Scenario: Successful durable scope transition
- **WHEN** a run without `--scope` resolves an enabled surface to a different scope from existing managed artifacts
- **AND** cross-scope cleanup has been confirmed interactively or authorized with `--force`
- **THEN** the system SHALL write all desired artifacts at the new target
- **AND** SHALL verify the expected managed artifact list there
- **AND** only then SHALL remove managed artifacts from the previous target

#### Scenario: Run-only target override
- **WHEN** a run supplies `--scope`
- **THEN** the system SHALL write or refresh artifacts at the override's effective target
- **AND** SHALL NOT remove managed artifacts solely because they exist in another scope

#### Scenario: Cleanup-only surface without a run-only override
- **WHEN** ordinary delivery behavior classifies a surface as cleanup-only
- **AND** the run does not supply `--scope`
- **THEN** exact managed artifacts SHALL be removed from every declared scope authorized by that delivery cleanup after whole-run preflight

#### Scenario: Cleanup-only surface with a run-only override
- **WHEN** ordinary delivery behavior classifies a surface as cleanup-only
- **AND** the run supplies `--scope`
- **THEN** cleanup SHALL be limited to the scope that would be effective for that surface under the override
- **AND** managed copies in other scopes SHALL be preserved

#### Scenario: Cleanup uses explicit managed names
- **WHEN** previous-scope cleanup runs
- **THEN** skills SHALL be selected through the known OpenSpec skill directory list
- **AND** commands SHALL be selected through known workflow IDs and adapter path lookup
- **AND** unrelated user files SHALL remain untouched

#### Scenario: Replacement write or verification fails
- **WHEN** any replacement artifact is incomplete or cannot be verified
- **THEN** previous-scope cleanup SHALL be skipped
- **AND** the command SHALL report incomplete new paths and preserved old paths

#### Scenario: Cleanup fails after replacement succeeds
- **WHEN** replacement artifacts were verified
- **AND** cleanup of an old managed target fails
- **THEN** the command SHALL retain the new artifacts
- **AND** SHALL return an actionable failure listing leftover old paths
