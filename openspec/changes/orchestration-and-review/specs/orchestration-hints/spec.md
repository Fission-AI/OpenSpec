## ADDED Requirements

### Requirement: CLI Orchestration Flags
The CLI SHALL accept `--subagents` and `--teams` flags on all `openspec instructions <phase>` commands (propose, apply, verify, archive).

#### Scenario: Flag accepted on instructions apply
- **WHEN** user runs `openspec instructions apply --change my-change --subagents --json`
- **THEN** the output JSON includes `orchestration.mode` set to `"subagents"`

#### Scenario: Flag accepted on instructions propose
- **WHEN** user runs `openspec instructions propose --change my-change --teams --json`
- **THEN** the output JSON includes `orchestration.mode` set to `"teams"`

#### Scenario: No flag defaults to null
- **WHEN** user runs `openspec instructions apply --change my-change --json` without orchestration flags
- **THEN** the output JSON includes `orchestration.mode` set to `null`

#### Scenario: Mutual exclusion of flags
- **WHEN** user runs `openspec instructions apply --subagents --teams`
- **THEN** the CLI exits with error: flags `--subagents` and `--teams` are mutually exclusive

### Requirement: OrchestrationHints in Instructions JSON
The `openspec instructions <phase>` commands SHALL include an `orchestration` object in their JSON output containing mode, task groups, gate groups, hook groups, and warnings.

#### Scenario: Full orchestration output structure
- **WHEN** user runs `openspec instructions apply --change my-change --teams --json`
- **THEN** the output JSON includes `orchestration` with fields: `mode`, `source`, `task_groups`, `gate_groups`, `hook_groups`, `warnings`

#### Scenario: Source tracking
- **WHEN** orchestration hints are resolved
- **THEN** `orchestration.source` includes `mode_from` (one of `"user_flag"`, `"schema"`, `"plugin"`, `"default"`) and `groups_from` (one of `"schema"`, `"plugin"`, `"schema+plugin_merge"`, `"default"`)

### Requirement: Task Group Analysis
The CLI SHALL analyze `tasks.md` section headers (`## N.`) to identify parallel task groups and parse `[domain: X]` tags for team assignment.

#### Scenario: Section-based grouping — intra-group parallelism
- **WHEN** tasks.md contains sections `## 1. Data Layer` and `## 2. UI Layer` each with tasks
- **THEN** `orchestration.task_groups` contains two groups, each with `parallel: true` (tasks WITHIN the same group can run in parallel)
- **AND** group 2 has `depends_on: [1]` (groups are sequential by default — group N depends on group N-1)

#### Scenario: Explicit inter-group parallelism via comment
- **WHEN** a section header contains `<!-- parallel-with: 1 -->` (e.g., `## 2. UI Layer <!-- parallel-with: 1 -->`)
- **THEN** group 2 has `depends_on: []` instead of the default `depends_on: [1]`, allowing it to run in parallel with group 1

#### Scenario: Domain tag parsing
- **WHEN** a task line contains `[domain: backend]`
- **THEN** the task appears under `domains.backend` in its group

#### Scenario: No section headers fallback
- **WHEN** tasks.md has no `## N.` section headers
- **THEN** all tasks fall into a single group with `parallel: false`

#### Scenario: Cross-platform task file reading
- **WHEN** tasks.md is read on Windows
- **THEN** the file path uses `path.join()` and line endings are handled correctly (both `\n` and `\r\n`)

### Requirement: Two-Layer Orchestration Resolution
The CLI SHALL merge plugin orchestration declarations with schema orchestration overrides using a deterministic resolution algorithm where schema always takes precedence.

#### Scenario: Plugin capability used as default
- **WHEN** plugin gate declares `orchestration.parallel_with: ["other-gate"]` and schema has no orchestration section
- **THEN** the resolver outputs a parallel group containing both gates

#### Scenario: Schema overrides plugin to sequential
- **WHEN** plugin gate declares `orchestration.parallel_with: ["other-gate"]` and schema sets `parallel: false` for the same group
- **THEN** the resolver outputs sequential execution and no warning

#### Scenario: Schema forces parallel over plugin silence
- **WHEN** plugin gate has no `orchestration` field and schema sets `parallel: true`
- **THEN** the resolver outputs parallel execution with a warning: "Schema forces parallel for gate that didn't declare parallel_with"

#### Scenario: Bidirectional parallel_with required
- **WHEN** gate A declares `parallel_with: ["B"]` but gate B does not declare `parallel_with: ["A"]`
- **THEN** the resolver treats them as sequential (both must declare) and emits a warning

### Requirement: Plugin Orchestration Declaration
The plugin manifest (`plugin.yaml`) SHALL support an `orchestration` field on gate and hook definitions with `parallel_with` (array of IDs) and `preferred_mode` (enum).

#### Scenario: Valid orchestration in gate definition
- **WHEN** a plugin.yaml gate includes `orchestration: { parallel_with: ["other"], preferred_mode: "teams" }`
- **THEN** the manifest passes Zod validation

#### Scenario: Invalid preferred_mode rejected
- **WHEN** a plugin.yaml gate includes `orchestration: { preferred_mode: "invalid" }`
- **THEN** Zod validation fails with a descriptive error

### Requirement: Schema Orchestration Section
Schema YAML files SHALL support an `orchestration` section within phase definitions (apply, propose, verify, archive) to declare parallel groups and synthesis strategies.

#### Scenario: Schema parallel group with synthesis
- **WHEN** schema.yaml contains `apply.orchestration.parallel_groups[0]` with `gates: ["a", "b"], parallel: true, synthesis: "require-both-pass"`
- **THEN** the instructions JSON reflects this configuration in `orchestration.gate_groups`

#### Scenario: Schema synthesis strategies
- **WHEN** schema defines `synthesis` as one of `"require-both-pass"`, `"any-pass"`, `"majority"`
- **THEN** the value is included in the gate group output for the AI harness to interpret

## MODIFIED Requirements

### Requirement: Schema Loading
The system SHALL load artifact graph definitions from YAML schema files within schema directories, including the new `orchestration` section within phase definitions.

#### Scenario: Valid schema loaded
- **WHEN** a schema directory contains a valid `schema.yaml` file with optional `orchestration` sections in phase definitions
- **THEN** the system returns an ArtifactGraph with all artifacts, dependencies, and orchestration configuration

#### Scenario: Schema with invalid orchestration rejected
- **WHEN** a schema YAML file contains an `orchestration` section with unknown fields
- **THEN** the system throws an error with a descriptive message
