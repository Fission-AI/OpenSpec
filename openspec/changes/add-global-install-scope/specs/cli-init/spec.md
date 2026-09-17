## ADDED Requirements

### Requirement: Init install scope selection
The init command SHALL choose a preferred install scope from its run-only option or the source-aware global preference.

#### Scenario: New-config project default
- **WHEN** the user runs `openspec init` without `--scope`
- **AND** no global config file exists
- **THEN** init SHALL prefer `project`

#### Scenario: Legacy-config project default
- **WHEN** the user runs `openspec init` without `--scope`
- **AND** an existing global config lacks `installScope`
- **THEN** init SHALL prefer `project`

#### Scenario: Scope override via flag
- **WHEN** the user runs `openspec init --scope project`
- **THEN** init SHALL prefer `project` for that run
- **AND** SHALL NOT change persisted global config
- **AND** SHALL preserve managed artifacts that exist in other scopes

#### Scenario: Invalid scope flag
- **WHEN** the user provides a scope other than `global` or `project`
- **THEN** init SHALL fail with a usage error before filesystem mutation

### Requirement: Init composes enabled surfaces with effective scope
The init command SHALL resolve scope only for surfaces enabled by the selected tools, profile, delivery, and command-surface capabilities, and SHALL complete preflight before mutation.

#### Scenario: GitHub Copilot uses split global and project scopes
- **WHEN** GitHub Copilot is selected
- **AND** both skills and commands are enabled
- **AND** preferred scope is `global`
- **THEN** Copilot skills SHALL be installed in its documented user-level skills target
- **AND** Copilot prompt files SHALL be installed at the existing project path returned by its adapter
- **AND** init SHALL report requested global command scope, effective project command scope, the fallback reason, and both concrete targets

#### Scenario: Unverified adapter falls back to project
- **WHEN** a selected tool has a registered adapter whose user-level convention remains unverified
- **AND** preferred scope is `global`
- **THEN** init SHALL NOT invent a user-level command path
- **AND** SHALL use the declared project target when project is supported
- **AND** SHALL report the fallback reason and concrete project path

#### Scenario: Global-only MiniMax with project preference
- **WHEN** MiniMax Code is selected
- **AND** preferred scope is `project`
- **THEN** its skills SHALL fall back to its global target
- **AND** init SHALL report the fallback

#### Scenario: Incompatible mixed selection
- **WHEN** any enabled selected surface cannot resolve a safe supported target
- **THEN** init SHALL fail before creating the OpenSpec-managed tool artifacts for any selected tool

#### Scenario: Cleanup-only surface is deterministic
- **WHEN** delivery behavior disables generation for an existing managed surface and classifies it as cleanup-only
- **THEN** init SHALL preflight the exact cleanup targets authorized for that run
- **AND** SHALL remove only those exact managed artifacts after desired writes are verified

#### Scenario: Run-only override limits cleanup-only scope
- **WHEN** init uses `--scope`
- **AND** a surface is cleanup-only
- **THEN** init SHALL limit that cleanup to the scope that would be effective under the override
- **AND** SHALL preserve managed copies in other scopes

#### Scenario: Durable scope transition requires confirmation
- **WHEN** init runs without `--scope`
- **AND** its preflighted plan would remove managed artifacts from the previous project or global scope
- **THEN** init SHALL show the transition direction and concrete destination and cleanup paths before mutation
- **AND** SHALL warn when global cleanup may affect other projects
- **AND** SHALL require interactive confirmation unless `--force` is present
- **AND** SHALL preserve every global cleanup target unless `--allow-global-cleanup` is also present

#### Scenario: Durable scope transition is declined
- **WHEN** the user declines init's cross-scope cleanup confirmation
- **THEN** init SHALL exit without writing or removing scoped artifacts

#### Scenario: Non-interactive durable scope transition
- **WHEN** non-interactive init would perform cross-scope cleanup without `--force`
- **THEN** init SHALL fail before mutation with an actionable authorization error
- **AND** rerunning with `--force` SHALL authorize the displayed transition without prompting
- **AND** removal of any displayed global target SHALL additionally require `--allow-global-cleanup`

#### Scenario: Invalid config blocks durable init reconciliation
- **WHEN** init reads malformed, unreadable, or schema-invalid global config
- **AND** no run-only scope is supplied
- **THEN** init SHALL NOT treat the conservative project value as cleanup authority
- **AND** SHALL require repair before durable migration
- **WHEN** a run-only scope is supplied
- **THEN** init MAY write that target and SHALL preserve every other scope

### Requirement: Init manages shared scoped skill roots
Init SHALL maintain one OpenSpec writer for Codex and the vendor-neutral `agents` target at each resolved `.agents/skills` root.

#### Scenario: Codex global skills
- **WHEN** Codex is selected with effective skills scope `global`
- **THEN** skills SHALL be written under the user's `.agents/skills` root
- **AND** the ownership marker SHALL be written in that global physical root

#### Scenario: Codex and agents selected globally
- **WHEN** Codex and `agents` are both selected with effective skills scope `global`
- **THEN** init SHALL write one compatible OpenSpec skill tree
- **AND** SHALL record one active writer for that global root

#### Scenario: Project and global roots both exist
- **WHEN** the selected writer already owns a project `.agents/skills` root
- **AND** init resolves the new effective skills scope to `global`
- **AND** init is using the persisted or migration-aware default without `--scope`
- **AND** the user confirms cleanup or supplies `--force`
- **THEN** the global root SHALL be written and verified before managed project-scope copies are cleaned
- **AND** unrelated project files SHALL be preserved

### Requirement: Init reports scoped outcomes
Init SHALL report effective scope and concrete paths when global installation, fallback, split scopes, or migration cleanup affects the result.

#### Scenario: Global artifacts are created
- **WHEN** init successfully creates or refreshes a global surface
- **THEN** the success summary SHALL identify the tool and global target
- **AND** SHALL explain that the artifact is shared across projects

#### Scenario: Scope transition cannot clean an old target
- **WHEN** new-target artifacts were verified
- **AND** old-target cleanup fails
- **THEN** init SHALL retain the new artifacts
- **AND** SHALL fail with the exact leftover old paths

#### Scenario: Run-only override preserves another scope
- **WHEN** init succeeds with a run-only scope override
- **AND** managed artifacts exist in another scope
- **THEN** init SHALL report the preserved paths
- **AND** SHALL direct the user to persist the preference and run without `--scope` for a durable migration
