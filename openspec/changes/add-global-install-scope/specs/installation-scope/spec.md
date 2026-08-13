## Purpose

Define how OpenSpec selects, resolves, reports, and safely transitions the installation scope of generated workflow skills and commands.

## ADDED Requirements

### Requirement: Install scope preference model
The system SHALL support a user-level preferred install scope with values `global` and `project` and a run-only override for commands that expose scope selection.

#### Scenario: New user default
- **WHEN** no global config file exists and no run-only override is provided
- **THEN** the preferred install scope SHALL be `project`
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
- **AND** its commands are explicitly declared to support only `project`
- **AND** the run prefers `global` with both surfaces enabled
- **THEN** skills SHALL use effective scope `global`
- **AND** commands SHALL use effective scope `project`
- **AND** command output SHALL identify the command-surface fallback

#### Scenario: Registered adapter accepts the requested scope
- **WHEN** a selected tool has a registered command adapter
- **AND** its command surface explicitly declares the requested scope
- **THEN** the command surface SHALL use the requested `global` or `project` scope
- **AND** the adapter SHALL return the concrete target for that install context
- **AND** the result SHALL NOT be reported as a fallback, unsupported surface, or unresolved convention

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

### Requirement: Explicit fallback and deterministic preflight
The system SHALL fall back only when the complete tool matrix explicitly declares that a desired surface does not support the requested scope, and SHALL validate every desired mutation and authorized cleanup-only target before performing filesystem mutations.

#### Scenario: Preferred scope is unsupported but alternate is supported
- **WHEN** an enabled surface is explicitly declared not to support the preferred scope
- **AND** it supports the alternate scope
- **THEN** the alternate scope SHALL become effective
- **AND** a fallback reason SHALL be included in user-facing output

#### Scenario: Unverified global layout is unsupported
- **WHEN** an existing skill integration or registered adapter has no officially verified user-level path
- **AND** the run requests global scope
- **THEN** that surface SHALL NOT construct a global target from its project-relative layout
- **AND** it SHALL fall back to its declared project target with an explicit reason when project is supported

#### Scenario: Declared target is unsafe
- **WHEN** an enabled surface's declared target cannot be resolved safely
- **THEN** the command SHALL fail before writing or removing files
- **AND** the error SHALL identify the tool, surface, requested scope, and remediation

#### Scenario: Mixed selection contains an incompatible surface
- **WHEN** any enabled surface in a multi-tool run cannot resolve a usable target
- **THEN** preflight SHALL fail the run before any selected tool is mutated

### Requirement: Effective scope reporting
The system SHALL make shared global mutations, explicit single-scope fallbacks, and split-scope results visible with concrete target paths.

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

### Requirement: Global target uses a single-mutating-invocation model
Each physical global target SHALL represent one user-level generated artifact set. The first version SHALL support one mutating OpenSpec invocation at a time for that target and SHALL treat simultaneous `init` or `update` mutation as outside the supported execution model without introducing a cross-process lock, global manifest, or downgrade prohibition.

#### Scenario: Later sequential update applies current user configuration
- **WHEN** two `init` or `update` invocations mutate the same global target sequentially
- **AND** each invocation completes successfully before the next begins
- **THEN** the later invocation SHALL reconcile the target to its running CLI and the current user-level profile, delivery, and workflow selection
- **AND** a legitimate later configuration change SHALL NOT be rejected as a version or ownership conflict

#### Scenario: Ordinary update recovers after unsupported competition stops
- **WHEN** an interruption or simultaneous mutation left a global target incomplete or internally inconsistent
- **AND** no competing OpenSpec process is still mutating that target
- **THEN** an ordinary `openspec update` with the intended CLI SHALL detect drift across the complete expected managed-artifact set
- **AND** SHALL reconcile the target without requiring `--force`

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

#### Scenario: Containment is revalidated at mutation time
- **WHEN** a target passed whole-run preflight
- **AND** an existing ancestor changes before a write, rename, marker update, or removal
- **THEN** the command SHALL repeat canonical containment validation immediately before that operation
- **AND** SHALL reject a dangling, replaced, or escaping symbolic link without mutating through it

#### Scenario: Verified global command path remains adapter-owned
- **WHEN** a command surface declares global support and resolves to effective scope `global`
- **THEN** the owning adapter SHALL receive that effective scope in install context
- **AND** SHALL return its matrix-recorded user-level installation root and command path
- **AND** the command path SHALL be contained within the returned installation root
- **AND** the installation root SHALL be contained within the documented platform-correct user root for that adapter
- **AND** callers SHALL NOT reconstruct the global command path or grant global support through explicit `--tools` selection

### Requirement: Cleanup safety and migration authority
Scope reconciliation SHALL establish and verify replacement artifacts before removing explicitly known OpenSpec-managed artifacts. Project cleanup requires explicit transition confirmation, and every global cleanup additionally requires `--allow-global-cleanup`.

#### Scenario: Durable transition previews cleanup in either direction
- **WHEN** a run without `--scope` plans a `project` to `global` or `global` to `project` transition
- **AND** managed artifacts at the previous scope would be removed
- **THEN** the command SHALL complete path preflight and display the transition direction, destination paths, and cleanup paths before mutation
- **AND** SHALL warn when a cleanup path is global and may be shared by other projects
- **AND** a global cleanup path SHALL remain preserved unless `--allow-global-cleanup` was supplied
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
- **THEN** the command SHALL treat authorized project cleanup as confirmed without prompting
- **AND** `--force` alone SHALL NOT authorize removal of a global target
- **AND** SHALL still report the transition direction and concrete paths

#### Scenario: Global cleanup receives additional authorization
- **WHEN** a durable transition or cleanup-only surface includes a global managed target
- **AND** `--allow-global-cleanup` is supplied
- **THEN** that exact global target MAY enter the cleanup plan
- **AND** interactive execution SHALL still require the default-No confirmation unless `--force` is also supplied
- **AND** non-interactive execution SHALL require both `--allow-global-cleanup` and `--force`

#### Scenario: Successful durable scope transition
- **WHEN** a run without `--scope` resolves an enabled surface to a different scope from existing managed artifacts
- **AND** cross-scope cleanup has been confirmed interactively or authorized with `--force`
- **AND** any global cleanup target has also been authorized with `--allow-global-cleanup`
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
- **THEN** exact managed project artifacts MAY be removed after whole-run preflight and explicit confirmation
- **AND** exact managed global artifacts SHALL be preserved unless global cleanup has the additional authorization described above

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

#### Scenario: Invalid config cannot authorize durable cleanup
- **WHEN** config storage is malformed, unreadable, or schema-invalid
- **AND** no run-only scope is supplied
- **THEN** the conservatively reported project scope SHALL NOT authorize migration or cleanup
- **AND** the command SHALL require repair before durable reconciliation
- **WHEN** an explicit run-only scope is supplied
- **THEN** the command MAY write that target while preserving all other-scope managed artifacts
