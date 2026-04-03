## ADDED Requirements

### Requirement: Alignment Check Plugin Manifest
The `alignment-check` plugin SHALL declare two gates (`structural-alignment`, `semantic-alignment`) with configurable coverage thresholds.

#### Scenario: Plugin manifest valid
- **WHEN** the `alignment-check/plugin.yaml` is loaded
- **THEN** Zod validation passes with config defaults: `goal_coverage: 100`, `requirement_task_ratio: 80`, `scenario_test_ratio: 80`

#### Scenario: Threshold override via config
- **WHEN** `config.yaml` sets `plugin_config.alignment-check.thresholds.goal_coverage: 90`
- **THEN** the structural gate uses 90% instead of 100% as the goal coverage threshold

#### Scenario: Gates are sequential by design
- **WHEN** the `alignment-check/plugin.yaml` is loaded
- **THEN** neither gate declares `orchestration.parallel_with` because the structural gate's output is required as input for the semantic gate via `{{command_output}}`

### Requirement: Structural Alignment Gate
The `structural-alignment` gate SHALL run a deterministic Node.js script that parses proposal, specs, and tasks to compute cross-reference coverage metrics.

#### Scenario: Goal-to-spec coverage
- **WHEN** proposal lists 3 capabilities in "New Capabilities" and only 2 have matching `specs/<name>/spec.md` files
- **THEN** the gate reports `goal_coverage: 66.7%` and lists the uncovered capability

#### Scenario: Requirement-to-task coverage
- **WHEN** specs contain 10 `### Requirement:` blocks and tasks.md references only 7 of them
- **THEN** the gate reports `requirement_task_ratio: 70%` and lists the 3 uncovered requirements

#### Scenario: Scenario-to-test coverage
- **WHEN** specs contain 15 `#### Scenario:` blocks and tasks.md has 10 tasks with "test" or "驗證" keywords
- **THEN** the gate reports `scenario_test_ratio: 66.7%`

#### Scenario: Orphan task detection
- **WHEN** tasks.md contains a task that cannot be traced to any spec requirement
- **THEN** the gate reports it in `orphan_tasks` array

#### Scenario: All thresholds met
- **WHEN** all coverage metrics meet or exceed configured thresholds
- **THEN** the gate exits with code 0 (pass) and outputs a JSON summary

#### Scenario: Threshold not met
- **WHEN** any coverage metric falls below its configured threshold
- **THEN** the gate exits with code 1 (fail) and outputs the gap details

#### Scenario: Cross-platform script execution
- **WHEN** the structural gate script runs on Windows
- **THEN** file paths use `path.join()` and the script is invoked via `node` (not a shell script)

### Requirement: Semantic Alignment Gate
The `semantic-alignment` gate SHALL use `handler.type: "both"` — running the structural script first, then providing a prompt with the structural results for LLM-based semantic judgment.

#### Scenario: Structural results fed to semantic prompt
- **WHEN** the structural script completes
- **THEN** the prompt template receives `{{command_output}}` containing the structural coverage JSON

#### Scenario: LLM semantic checks
- **WHEN** the AI harness processes the semantic alignment prompt
- **THEN** it evaluates: (1) do specs truly define the behavior described in proposal goals? (2) can the design technically satisfy all spec scenarios? (3) are tasks granular enough for the specs' complexity?

#### Scenario: Semantic alignment score
- **WHEN** the AI harness completes semantic evaluation
- **THEN** it writes `.gates/semantic-alignment.json` with `alignment_score` (0-1), `gaps` (array), and `risks` (array)

### Requirement: Propose Post Hook Trigger
The alignment-check plugin SHALL register a `propose.post` hook that triggers alignment validation automatically after all proposal artifacts are created.

#### Scenario: Auto-trigger on propose completion
- **WHEN** all proposal artifacts (proposal.md, specs, tasks.md) are created
- **THEN** the `propose.post` hook triggers alignment checking

#### Scenario: Structural before semantic sequencing
- **WHEN** the alignment-check plugin is configured and schema does NOT override to parallel
- **THEN** structural alignment runs first (command), then semantic (prompt with structural output)
