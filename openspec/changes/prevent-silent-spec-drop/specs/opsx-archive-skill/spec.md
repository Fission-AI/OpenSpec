## MODIFIED Requirements

### Requirement: OPSX Archive Skill

The system SHALL provide an `/opsx:archive` skill that archives completed changes in the experimental workflow by invoking the `openspec archive` CLI, rather than moving files or merging specs itself.

#### Scenario: Archive a change with all artifacts complete

- **WHEN** agent executes `/opsx:archive` with a change name
- **AND** all artifacts in the schema are complete
- **AND** all tasks are complete
- **THEN** the agent invokes `openspec archive` for the change
- **AND** the CLI validates, syncs delta specs, and moves the change to `openspec/changes/archive/YYYY-MM-DD-<name>/`
- **AND** displays a success message with the archived location

#### Scenario: Change selection prompt

- **WHEN** agent executes `/opsx:archive` without specifying a change
- **THEN** the agent prompts user to select from available changes
- **AND** shows only active changes (excludes archive/)

### Requirement: Skill Output

The skill SHALL provide clear feedback about the archive operation, derived from the `openspec archive` result rather than a separate agent-driven sync.

#### Scenario: Archive complete with sync

- **WHEN** archive completes after syncing specs
- **THEN** display summary:
  - Specs synced (from the `openspec archive` result — counts/`specsUpdated`)
  - Change archived to location
  - Schema that was used

#### Scenario: Archive complete without sync

- **WHEN** archive completes without syncing specs (e.g. `--skip-specs`, or a schema that produces no delta specs)
- **THEN** display summary:
  - Note that specs were not synced (if applicable)
  - Change archived to location
  - Schema that was used

#### Scenario: Archive complete with warnings

- **WHEN** archive completes with incomplete artifacts or tasks
- **THEN** include note about what was incomplete
- **AND** suggest reviewing if archive was intentional

### Requirement: Spec Sync Prompt

The skill SHALL delegate spec sync to the `openspec archive` CLI rather than deciding by agent judgment whether delta specs exist or need syncing. This applies to every `/opsx:archive` surface — the archive skill, the `/opsx:archive` command, and the bulk-archive flow — none of which may move the change or merge specs themselves. The skill SHALL NOT inspect the change to decide sync state, SHALL NOT self-certify that "specs look synced," and SHALL trust the CLI's exit status. The CLI deterministically validates the change, syncs delta specs into the main specs, and blocks when required specs are missing, partial, or not in delta format.

#### Scenario: Archive delegates sync to the CLI

- **WHEN** the skill archives a change
- **THEN** it invokes `openspec archive --json` (using `--yes` only to suppress interactive prompts)
- **AND** it does not separately assess whether delta specs exist
- **AND** the CLI performs spec validation and delta-spec sync

#### Scenario: CLI blocks on missing, partial, or non-delta specs

- **WHEN** `openspec archive` returns a blocked diagnostic — because no delta spec exists, a capability declared in the proposal has no delta spec (partial), or a `specs/<cap>/spec.md` exists but contains no delta sections (not in delta format)
- **THEN** the skill surfaces the diagnostic and guides the user to create or fix the delta spec
- **AND** it re-runs `openspec archive` after the fix and trusts its exit status
- **AND** it does NOT bypass the block with `--skip-specs` or `--no-validate`

#### Scenario: Spec-less change under an explicit opt-out

- **WHEN** a change legitimately has no specs and the user explicitly intends to skip them
- **THEN** the user (not the skill on its own judgment) may pass `--skip-specs`
- **AND** the CLI archives without sync

### Requirement: Archive Process

The skill SHALL archive the change by invoking the `openspec archive` CLI, which moves the change to the archive folder with a date prefix after validation and sync succeed. The skill SHALL NOT move the change directory itself.

#### Scenario: Successful archive

- **WHEN** archiving a change
- **THEN** the skill runs `openspec archive --json` for the change
- **AND** the CLI validates, syncs delta specs, and moves the change to `archive/<YYYY-MM-DD>-<change-name>/`
- **AND** `.openspec.yaml` is preserved in the archived change

#### Scenario: Archive already exists

- **WHEN** the target archive directory already exists
- **THEN** the CLI fails with an error and the skill surfaces it
- **AND** suggests renaming the existing archive or using a different date

#### Scenario: Validation or sync blocks the archive

- **WHEN** the CLI reports a validation or sync block
- **THEN** the skill does not move any files
- **AND** reports the diagnostic and remediation instead of archiving
