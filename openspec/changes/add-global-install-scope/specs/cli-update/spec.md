## ADDED Requirements

### Requirement: Update install scope selection
The update command SHALL choose a preferred install scope from its run-only option or the source-aware global preference.

#### Scenario: Configured scope is used
- **WHEN** the user runs `openspec update` without `--scope`
- **AND** global config explicitly contains `installScope`
- **THEN** update SHALL use that value as preferred scope

#### Scenario: Legacy scope is used
- **WHEN** the user runs `openspec update` without `--scope`
- **AND** an existing config lacks `installScope`
- **THEN** update SHALL prefer `project`

#### Scenario: Scope override via flag
- **WHEN** the user runs `openspec update --scope global`
- **THEN** update SHALL prefer `global` for that run
- **AND** SHALL NOT change persisted global config
- **AND** SHALL preserve managed artifacts that exist in other scopes

#### Scenario: Invalid scope flag
- **WHEN** the user provides a scope other than `global` or `project`
- **THEN** update SHALL fail with a usage error before filesystem mutation

#### Scenario: Self-upgrade reruns update
- **WHEN** update upgrades the OpenSpec CLI and reruns itself
- **THEN** the rerun SHALL preserve the original path, force option, and scope override

### Requirement: Scope-aware detection and drift
Update SHALL detect configured tools and configuration drift across exact managed targets in every supported scope using the same resolved install context as generation.

#### Scenario: Tool is configured only globally
- **WHEN** a known OpenSpec-managed artifact exists only at a tool's resolved global target
- **THEN** update SHALL recognize that tool as configured
- **AND** SHALL evaluate it against the effective global target

#### Scenario: Preferred scope changes
- **WHEN** a run without `--scope` resolves a desired effective scope that differs from the location of existing managed artifacts
- **THEN** update SHALL treat the tool surface as needing synchronization

#### Scenario: Both scopes contain managed copies
- **WHEN** exact managed artifacts exist at project and global targets
- **AND** update runs without `--scope`
- **THEN** update SHALL refresh and verify the desired effective target
- **AND** SHALL plan cleanup of the non-effective managed copy

#### Scenario: Both scopes contain managed copies during an override
- **WHEN** exact managed artifacts exist at project and global targets
- **AND** update runs with `--scope`
- **THEN** update SHALL refresh and verify only the override's effective target
- **AND** SHALL preserve and report managed copies in other scopes

#### Scenario: Command content equality uses scoped paths
- **WHEN** a commands-only installation is checked for freshness
- **THEN** generated command comparison SHALL use the adapter path resolved for the effective install context

#### Scenario: Shared skill ownership is scoped
- **WHEN** Codex or `agents` uses a shared `.agents/skills` root
- **THEN** configured-tool detection SHALL use the marker and managed files at that physical effective root
- **AND** SHALL NOT use the marker from the other scope as ownership of the effective root

### Requirement: Scope-aware update preflight and synchronization
Update SHALL validate all desired surfaces and every authorized cleanup-only target before mutation and SHALL synchronize each desired surface using its independently resolved effective scope.

#### Scenario: Durable scope transition requires confirmation
- **WHEN** update runs without `--scope`
- **AND** its preflighted plan would remove managed artifacts from the previous project or global scope
- **THEN** update SHALL show the transition direction and concrete destination and cleanup paths before mutation
- **AND** SHALL warn when global cleanup may affect other projects
- **AND** SHALL require interactive confirmation unless `--force` is present

#### Scenario: Durable scope transition is declined
- **WHEN** the user declines update's cross-scope cleanup confirmation
- **THEN** update SHALL exit without writing or removing scoped artifacts

#### Scenario: Non-interactive durable scope transition
- **WHEN** non-interactive update would perform cross-scope cleanup without `--force`
- **THEN** update SHALL fail before mutation with an actionable authorization error
- **AND** rerunning with `--force` SHALL authorize the displayed transition without prompting

#### Scenario: Surface falls back
- **WHEN** a configured enabled surface does not support preferred scope but supports the alternate
- **THEN** update SHALL synchronize the alternate target
- **AND** SHALL report requested scope, effective scope, reason, and path

#### Scenario: Any configured surface is incompatible
- **WHEN** any configured enabled surface cannot resolve a safe supported target
- **THEN** update SHALL fail before writing or removing files for all configured tools
- **AND** SHALL list each incompatible tool surface with remediation

#### Scenario: Cleanup-only target is unsafe
- **WHEN** a disabled surface is classified as cleanup-only
- **AND** an existing managed cleanup target cannot pass containment or path-safety checks
- **THEN** update SHALL fail before writing or removing files for all configured tools
- **AND** SHALL identify the unsafe cleanup target

#### Scenario: Replacement verification fails
- **WHEN** update cannot write and verify all desired artifacts at a new effective target
- **THEN** it SHALL preserve managed artifacts at the previous target
- **AND** SHALL report both incomplete new and preserved old paths

#### Scenario: Cleanup fails after verified synchronization
- **WHEN** desired artifacts were verified at the effective target
- **AND** cleanup of a non-effective managed target fails
- **THEN** update SHALL retain the effective-target artifacts
- **AND** SHALL return an actionable failure listing leftovers

### Requirement: Scope behavior preserves current command-surface migrations
Install scope behavior SHALL preserve Codex skills-only behavior and keep legacy global Codex prompt cleanup separate from ordinary scope reconciliation.

#### Scenario: Codex updates globally
- **WHEN** Codex skills resolve to global scope
- **THEN** update SHALL refresh the global `.agents/skills` OpenSpec tree
- **AND** SHALL NOT create or refresh Codex files under `$CODEX_HOME/prompts` or the default Codex prompt directory

#### Scenario: Legacy Codex prompts are detected
- **WHEN** allowlisted managed legacy Codex prompts exist
- **THEN** their existing replacement-gated cleanup rules SHALL apply
- **AND** they SHALL NOT be treated as the previous scope of a generated command surface

#### Scenario: Global-only skills under commands delivery
- **WHEN** a configured global-only skills tool has no command surface
- **AND** current delivery behavior preserves its shared global skills
- **THEN** scope reconciliation SHALL NOT remove those skills because one project's delivery setting excludes them
