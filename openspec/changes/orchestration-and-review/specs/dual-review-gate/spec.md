## ADDED Requirements

### Requirement: Dual Review Plugin Manifest
The `dual-review` plugin SHALL declare two gates (`claude-review`, `codex-review`) with `orchestration.parallel_with` linking them bidirectionally.

#### Scenario: Plugin manifest valid
- **WHEN** the `dual-review/plugin.yaml` is loaded
- **THEN** Zod validation passes and two gates are registered with `parallel_with` referencing each other

#### Scenario: Plugin config defaults
- **WHEN** no `plugin_config.dual-review` section exists in `config.yaml`
- **THEN** defaults apply: `max_loops: 3`, `synthesis: "require-both-pass"`

### Requirement: Claude Review Gate
The `claude-review` gate SHALL provide a prompt file that instructs the AI harness to run `/code-review` and report findings in a structured format.

#### Scenario: Gate prompt generated
- **WHEN** the `claude-review` gate is triggered at `apply.post`
- **THEN** the prompt file is rendered with `{{change_name}}`, `{{change_dir}}`, and `{{changed_files}}` variables

#### Scenario: Gate result format
- **WHEN** Claude review completes
- **THEN** the AI harness writes `.gates/claude-review.json` with `status`, `findings` (array of `{file, line, severity, message}`), and `verdict`

### Requirement: Codex Review Gate
The `codex-review` gate SHALL provide a prompt file that instructs the AI harness to delegate review to Codex CLI (GPT-5.4) and report findings.

#### Scenario: Gate prompt generated
- **WHEN** the `codex-review` gate is triggered at `apply.post`
- **THEN** the prompt instructs spawning a Codex review agent with the diff of all changed files

#### Scenario: Gate result format
- **WHEN** Codex review completes
- **THEN** the AI harness writes `.gates/codex-review.json` with same structure as claude-review

### Requirement: Review Synthesis
The dual-review plugin SHALL define synthesis logic that combines results from both review engines.

#### Scenario: Both pass
- **WHEN** both `claude-review` and `codex-review` have `status: "pass"`
- **THEN** synthesis result is `"pass"` and the apply post gate succeeds

#### Scenario: One fails with require-both-pass
- **WHEN** `claude-review` passes but `codex-review` has P0/P1 findings, and synthesis is `"require-both-pass"`
- **THEN** synthesis result is `"fail"` with merged findings from both engines

#### Scenario: Findings deduplication
- **WHEN** both engines report the same finding (same file + line range + category)
- **THEN** synthesis merges them into one finding with `sources: ["claude", "codex"]` and takes the higher severity

#### Scenario: Max loop enforcement
- **WHEN** review-fix cycle reaches `max_loops` (default 3) without all P0/P1 resolved
- **THEN** the gate outputs a "NEED HUMAN" status and stops looping

### Requirement: Apply Post Hook Trigger
The dual-review plugin SHALL register an `apply.post` hook that triggers the dual review process automatically when all tasks are complete.

#### Scenario: Auto-trigger on apply completion
- **WHEN** `openspec instructions apply` returns `state: "all_done"`
- **THEN** the `apply.post` hook's prompt instructs the AI harness to run both review gates in parallel
