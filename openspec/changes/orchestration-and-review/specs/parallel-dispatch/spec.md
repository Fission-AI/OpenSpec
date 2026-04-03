## ADDED Requirements

### Requirement: Parallel Hook Dispatch
The hook dispatcher SHALL support parallel execution of hooks within the same hook point when they are in a resolved parallel group.

#### Scenario: Command-type hooks run in parallel
- **WHEN** two hooks at `apply.post` are in a parallel group and both have `handler.type: "command"`
- **THEN** both commands execute concurrently via `Promise.all()` and results are collected

#### Scenario: Prompt-type hooks returned as pending
- **WHEN** two hooks at `apply.post` are in a parallel group and both have `handler.type: "prompt"`
- **THEN** both are returned in `HookResult.pending` array with `parallel_group` metadata for the AI harness

#### Scenario: Mixed command+prompt in parallel group
- **WHEN** a parallel group contains one `command` hook and one `prompt` hook
- **THEN** the command executes immediately, the prompt is returned as pending, both carry `parallel_group` metadata

#### Scenario: Sequential fallback when no parallel groups
- **WHEN** hooks at a hook point have no parallel group declarations
- **THEN** hooks execute sequentially in plugin whitelist order (existing behavior preserved)

#### Scenario: Hook failure in parallel group
- **WHEN** one command hook in a parallel group fails (non-zero exit code) and `ignore_failure` is false
- **THEN** the other parallel hooks are NOT cancelled (already running), but the overall group result is `failed`

### Requirement: Parallel Gate Execution
The gate checker SHALL support parallel execution of gates within a resolved parallel group.

#### Scenario: Command gates run in parallel
- **WHEN** two gates in a parallel group both have `handler.type: "command"`
- **THEN** both commands execute concurrently via `Promise.all()` and `GateCheckReport` includes results for both

#### Scenario: Prompt gates returned as pending
- **WHEN** two gates in a parallel group have `handler.type: "prompt"`
- **THEN** `GateCheckReport` includes them in a `pending` array with their prompt content and `parallel_group` metadata

#### Scenario: Both-type gates split execution
- **WHEN** a gate has `handler.type: "both"` in a parallel group
- **THEN** the command part runs in parallel with other commands, the prompt part (with `{{command_output}}`) is returned as pending

### Requirement: Gate Result Persistence
Gate execution results SHALL be persisted to `.gates/` directory within the change directory.

#### Scenario: Gate result file created
- **WHEN** a gate completes (pass or fail)
- **THEN** a JSON file is written to `<changeDir>/.gates/<gate-id>.json` with `gate_id`, `status`, `timestamp`, `findings`, `metadata`

#### Scenario: Cross-platform gate result path
- **WHEN** gate results are written on any platform
- **THEN** file paths use `path.join(changeDir, '.gates', `${gateId}.json`)` — no hardcoded separators

#### Scenario: Synthesis result file
- **WHEN** a parallel gate group completes with synthesis strategy
- **THEN** a `<changeDir>/.gates/synthesis.json` file is written with combined status, individual gate results, and the synthesis strategy used

### Requirement: HookResult Extended with Parallel Metadata
The `HookResult` interface SHALL include parallel group information for pending prompt hooks.

#### Scenario: Pending hook includes parallel group
- **WHEN** a prompt hook is part of a parallel group
- **THEN** `HookPendingResult` includes `parallel_group: string[]` listing all hook/gate IDs in the group

#### Scenario: Non-parallel pending hook has no group
- **WHEN** a prompt hook is NOT part of a parallel group
- **THEN** `HookPendingResult.parallel_group` is `undefined`
