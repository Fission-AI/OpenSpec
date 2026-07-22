# atd-sdlc-lite-workflow Specification (delta)

## ADDED Requirements

### Requirement: Lite schema availability
The system SHALL provide a built-in schema named `atd-sdlc-lite` with the artifact pipeline `ticket → analysis → tasks` and an apply phase tracked by `tasks.md`, resolvable through the same three-tier schema resolution as other built-in schemas.

#### Scenario: Creating a lite change
- **WHEN** a change is created with `--schema atd-sdlc-lite`
- **THEN** `openspec status` lists exactly the artifacts `ticket`, `analysis`, `tasks` in dependency order

### Requirement: Compact lite ticket
The lite `ticket` artifact instructions SHALL require the Jira source link, problem statement, acceptance criteria with stable IDs, and an explicit confirmation that the change restores existing intended behavior rather than introducing new behavior.

#### Scenario: Lite ticket for a defect
- **WHEN** the agent creates the lite `ticket` artifact
- **THEN** `ticket.md` records the Jira link, problem statement, AC IDs, and the statement of which existing intended behavior is being restored

### Requirement: Lite impact assessment, full-schema compatible
The lite `analysis` artifact instructions SHALL require: root cause with commit SHA and file:line citation, target files, affected stacks from the explicit set {python, spring-boot, oracle-ebs, angular}, the existing acceptance criteria, specification, or test that covers the intended behavior, a risk assessment, and the reason the change qualifies for lite processing. Lite `ticket.md` and `analysis.md` SHALL satisfy the full schema's content contract (shorter content permitted) so escalation retains both artifacts without regeneration.

#### Scenario: Lite analysis content
- **WHEN** the agent creates the lite `analysis` artifact
- **THEN** `analysis.md` names the root cause with citation, target files, affected stacks, the covering spec/test, the risk assessment, and the lite-eligibility justification

#### Scenario: Escalated artifacts need no regeneration
- **WHEN** a lite change escalates to `atd-sdlc`
- **THEN** the retained `ticket.md` and `analysis.md` already satisfy the full schema's requirements, including affected stacks needed for standards mapping

### Requirement: Standard lite task shape
The lite `tasks` artifact instructions SHALL produce tasks covering, in order: implement the correction, add or update a regression test, run the relevant verification command, verify the applicable coding standards using the explicit stack mapping, record that no new solution document or durable functional/technical documentation set is required, apply any localized correction to existing documentation, and add an idempotent Jira closure comment. An existing-document update remains lite-compatible only while it does not reveal API, data, security, integration, dependency, deployment, or other full-workflow impact.

#### Scenario: Generated lite task list
- **WHEN** the agent creates `tasks.md` for a lite change
- **THEN** the checklist contains the correction, regression test, verification, standards check, documentation determination or localized update, and Jira closure tasks

### Requirement: One-way escalation to the full schema
The lite `analysis` and apply instructions SHALL require escalation to `atd-sdlc` whenever a full-workflow trigger is discovered. Before `tasks.md` exists, escalation updates `.openspec.yaml` to `schema: atd-sdlc`, appends the transition to `triage.md`, and retains the full-compatible ticket and analysis artifacts. After `tasks.md` exists or during apply, the agent SHALL stop lite implementation, leave further lite tasks unchecked, move `tasks.md` to `tasks.lite.md` for audit history so the full tasks artifact is not falsely complete, append the escalation to `triage.md`, update `ticket.md` and `analysis.md` for the wider scope, and update `.openspec.yaml` to `schema: atd-sdlc`. The full workflow SHALL then generate specs, design, solution-doc, and a new `tasks.md` that verifies, reconciles, or reverts any partial implementation. Downgrading a full change to lite after planning begins SHALL NOT be supported.

#### Scenario: Lite analysis uncovers wider impact
- **WHEN** lite analysis reveals an API contract change before `tasks.md` exists
- **THEN** the agent stops, informs the developer, updates `.openspec.yaml` to `schema: atd-sdlc`, retains ticket and analysis, and appends the trigger, previous schema, new schema, and reason to `triage.md`

#### Scenario: Lite apply uncovers wider impact
- **WHEN** implementation reveals an API contract, data, security, integration, dependency, deployment, or other full-workflow impact after `tasks.md` exists
- **THEN** the agent stops lite work, moves `tasks.md` to `tasks.lite.md`, appends the escalation record, updates ticket and analysis, switches to `atd-sdlc`, and does not resume implementation until the full planning artifacts and a new full task list exist

#### Scenario: Status after pre-tasks escalation
- **WHEN** a lite change is switched to `atd-sdlc` before `tasks.md` exists
- **THEN** status reports ticket and analysis as done, specs and design as ready, solution-doc and tasks as blocked, and apply as blocked

#### Scenario: Status after late escalation
- **WHEN** a lite change with `tasks.md` is escalated using the late-escalation procedure
- **THEN** `tasks.lite.md` preserves the old checklist, the tracked `tasks.md` path is absent, status reports specs and design as ready and solution-doc and tasks as blocked, and apply is blocked

#### Scenario: Partial implementation carried into full planning
- **WHEN** code was changed before the full-workflow trigger was discovered
- **THEN** the regenerated full task list includes explicit tasks to verify and reconcile that partial implementation with the approved full design, or revert it

#### Scenario: No downgrade
- **WHEN** a developer asks to convert an in-progress `atd-sdlc` change to lite after planning artifacts exist
- **THEN** the workflow declines and the change continues under the full schema
