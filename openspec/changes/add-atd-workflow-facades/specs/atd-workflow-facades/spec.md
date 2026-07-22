# atd-workflow-facades Specification (delta)

## ADDED Requirements

### Requirement: Five-façade ATD journey vocabulary
The system SHALL provide five ATD-facing workflows forming the journey triage → continue → apply → verify → close, with workflow ids `atd-triage`, `atd-continue`, `atd-apply`, `atd-verify`, `atd-close`, skill directory names `atd-change-triage`, `atd-change-continue`, `atd-change-apply`, `atd-change-verify`, `atd-change-close`, and command ids `/opsx:atd-triage`, `/opsx:atd-continue`, `/opsx:atd-apply`, `/opsx:atd-verify`, `/opsx:atd-close`. Each workflow's instructions SHALL name its position in the journey and the next step. The existing `atd-triage` id and `atd-change-triage` directory SHALL be kept as-is (no rename or migration); its hand-off wording SHALL name `atd-change-continue` as the next step.

#### Scenario: Journey positions named
- **WHEN** any of the five ATD workflow templates is generated
- **THEN** its instructions state where the workflow sits in the triage → continue → apply → verify → close journey and name the next workflow in the sequence

#### Scenario: Triage hands off to continue
- **WHEN** the `atd-change-triage` skill completes change creation
- **THEN** its hand-off step names `atd-change-continue` as the next step, and the `atd-triage` id and `atd-change-triage` directory are unchanged

### Requirement: Façades compose existing machinery from one source
Each new ATD workflow SHALL compose the corresponding generic workflow from a shared parameterized instruction-body builder rather than copy its prompt or depend on invoking another installed skill. `atd-continue` SHALL create the next artifact through the shared continue status/instructions flow; `atd-apply` SHALL load the schema-provided ATD standards instructions and execute tracked tasks through the shared apply flow; `atd-verify` SHALL verify tests, acceptance criteria, standards conformance, documentation, and closure readiness through the shared verify flow; `atd-close` SHALL retain the shared archive flow subject to the stricter ATD completion gate below. Existing generic generated instructions SHALL remain byte-for-byte unchanged. Each deployed template SHALL include the shared store-selection guidance block (`STORE_SELECTION_GUIDANCE`).

#### Scenario: Continue façade delegates schema resolution
- **WHEN** `atd-change-continue` runs against a change created with `--schema atd-sdlc-lite`
- **THEN** the next artifact is determined by the lite schema's graph through the same `openspec` status/instructions commands the generic continue workflow uses, with no schema logic embedded in the façade

#### Scenario: Generic output remains stable
- **WHEN** the generic workflow getters are migrated to shared instruction-body builders
- **THEN** their generated skill and command content is byte-for-byte identical to the pre-change output

#### Scenario: Store-selection guidance present
- **WHEN** any of the four new workflow templates is deployed
- **THEN** its content includes the shared store-selection guidance block and the template parity test passes

### Requirement: Façades accept only ATD schemas
Every ATD façade SHALL read `schemaName` from `openspec status --json` before performing its workflow action and SHALL continue only for `atd-sdlc` or `atd-sdlc-lite`. For any other schema it SHALL stop without modifying artifacts, code, specs, tasks, or archive state and SHALL direct the developer to the corresponding generic workflow.

#### Scenario: Non-ATD change rejected
- **WHEN** `atd-change-apply` is invoked for a `spec-driven` change
- **THEN** it makes no change and directs the developer to `openspec-apply-change`

### Requirement: Close hard-gates tracked work and holds no closure logic
`atd-close` SHALL obtain the apply state from `openspec instructions apply --json` and require every tracked task to be complete, including standards conformance, documentation, and Jira closure tasks. It SHALL NOT rely on a particular task-group heading. When any artifact or task is incomplete, close SHALL surface the incomplete items, direct the developer to `atd-change-apply`, and stop without offering an override. Close SHALL NOT perform publication, Jira closure, or any other closure work itself.

#### Scenario: Any unchecked task blocks archive
- **WHEN** `atd-change-close` runs against a change with any unchecked tracked task (including a Jira closure task)
- **THEN** close lists the unchecked items, directs the developer to `atd-change-apply`, and does not archive or perform the closure work itself

#### Scenario: Fully checked task list continues to archive
- **WHEN** `atd-change-close` runs and apply reports `state: "all_done"`
- **THEN** close continues into the shared archive flow

### Requirement: Close preserves delta-spec synchronization
For an ATD change with delta specs, `atd-close` SHALL retain the generic archive workflow's store-aware delta-spec comparison, sync choice, synchronous sync execution, and post-sync verification before moving the change to the archive. A failed or unverifiable sync SHALL stop archive.

#### Scenario: Unsynced full-schema deltas
- **WHEN** a completed `atd-sdlc` change has delta specs not reflected in main specs
- **THEN** close presents the sync assessment and does not archive until the selected sync completes and every delta is verified against the main specs

### Requirement: Core profile composition
CORE_WORKFLOWS SHALL be the five ATD workflows plus `explore` and `update`: `['atd-triage', 'atd-continue', 'atd-apply', 'atd-verify', 'atd-close', 'explore', 'update']`. The generic `propose`, `sync`, `archive`, `continue`, `apply`, and `verify` ids SHALL NOT be in the core profile.

#### Scenario: Default init installs the ATD journey
- **WHEN** `openspec init` runs with the core profile
- **THEN** the five `atd-change-*` skills plus explore and update are installed, and no generic propose/sync/archive/continue/apply/verify skill is installed

#### Scenario: Mid-journey revision available by default
- **WHEN** a developer on a default install needs to revise a planning artifact between apply and verify
- **THEN** the `update` workflow is already installed without profile selection

### Requirement: Generic workflows remain selectable
All generic workflow ids SHALL remain in ALL_WORKFLOWS and SHALL be installable through the custom profile for maintainers and non-ATD schemas. No generic workflow SHALL be renamed or removed by this change.

#### Scenario: Maintainer selects generic workflows
- **WHEN** a user configures the custom profile with `['propose', 'continue', 'apply', 'verify', 'archive']`
- **THEN** the generic `openspec-*` skills and `/opsx:*` commands for those ids are installed and functional

### Requirement: Registry completeness for every new workflow
Each new workflow SHALL be registered across every enumerating surface: a workflow template module in `src/core/templates/workflows/`, the `skill-templates.ts` façade export, both generation registries (`getSkillTemplates` and `getCommandTemplates`), ALL_WORKFLOWS, CORE_WORKFLOWS (where applicable), WORKFLOW_TO_SKILL_DIR, and SKILL_NAMES and COMMAND_IDS in `src/core/shared/tool-detection.ts`. A registry-parity test SHALL fail when any surface that enumerates workflows by id is inconsistent with ALL_WORKFLOWS.

#### Scenario: Registered in both generation registries
- **WHEN** the skill and command template registries are queried for each of the four new workflow ids
- **THEN** exactly one skill entry (with the `atd-change-<x>` directory name) and exactly one command entry exist per id

#### Scenario: Tool-detection surfaces extended
- **WHEN** SKILL_NAMES and COMMAND_IDS are inspected after this change
- **THEN** both contain the four new entries and their lengths match the generation registries (17)

#### Scenario: Registry omission fails CI
- **WHEN** a future workflow id is added to ALL_WORKFLOWS but omitted from WORKFLOW_TO_SKILL_DIR, SKILL_NAMES, or COMMAND_IDS
- **THEN** the registry-parity test fails

### Requirement: Distribution artifacts regenerated
The committed `skills/` distribution (via `scripts/generate-skillssh.mjs`) SHALL gain the four new `atd-change-*` skill directories and SHALL pass template parity tests. Project-local `.claude/` output SHALL remain ignored and uncommitted; init and update tests SHALL verify that skills-only, commands-only, and combined delivery generate the new core profile correctly.

#### Scenario: skills.sh distribution regenerated
- **WHEN** the skills.sh parity test runs after this change
- **THEN** `skills/atd-change-continue/`, `skills/atd-change-apply/`, `skills/atd-change-verify/`, and `skills/atd-change-close/` exist and match the generated templates

#### Scenario: Generated project command set reflects new core profile
- **WHEN** init or update generates commands for a temporary project using the core profile
- **THEN** it creates the five `atd-*` commands plus explore and update, and removes or omits generic propose/sync/archive/continue/apply/verify command files
