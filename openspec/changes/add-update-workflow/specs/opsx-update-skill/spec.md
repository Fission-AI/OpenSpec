## ADDED Requirements

### Requirement: Update Workflow Command

The system SHALL provide a `/opsx:update` workflow skill that revises a change's existing planning artifacts in place. It SHALL NOT advance the build frontier (it does not create a not-yet-started artifact) and SHALL edit planning artifacts only, never implementation code.

#### Scenario: Select the change to update

- **WHEN** the user invokes `/opsx:update` without a change name
- **THEN** the skill infers the change from conversation context if possible
- **AND** if it cannot, it lists available changes (most-recently-modified first) via `openspec list --json` and asks the user to choose, never auto-selecting

#### Scenario: Revise without advancing the frontier

- **WHEN** the user asks `/opsx:update` to revise an existing artifact
- **THEN** the skill updates that artifact and reconciles the change's other existing artifacts with it
- **AND** it does NOT create any artifact that does not yet exist (that remains the job of `/opsx:continue`/`/opsx:propose`)

#### Scenario: Missing artifacts are deferred to continue

- **WHEN** keeping the change coherent would require an artifact that has not been created yet
- **THEN** the skill revises only the artifacts that currently exist
- **AND** it notes the not-yet-created artifacts and points the user to `/opsx:continue` to create them

#### Scenario: Update stays within the plan

- **WHEN** revising artifacts would imply changes to implementation code
- **THEN** the skill updates the planning artifacts only
- **AND** it directs the user to `/opsx:apply` to carry the revised plan into code, rather than editing code itself

### Requirement: Schema-Driven Artifact Resolution

The `/opsx:update` skill SHALL learn which artifacts exist and where they live by reading the change's status from the CLI, and SHALL NOT rely on hardcoded artifact names or assumed path separators. This makes the skill correct for custom schemas and on every platform, not only the default `spec-driven` schema.

#### Scenario: Reads the artifact set from status

- **WHEN** the skill needs to know which artifacts a change has and where they are
- **THEN** it runs `openspec status --change <id> --json` and uses the reported artifact ids, statuses, and the `artifactPaths` map (`existingOutputPaths` for the files to edit)
- **AND** it does not assume the artifact ids or output paths

#### Scenario: Does not branch on hardcoded artifact names

- **WHEN** the skill decides which artifacts to read and revise
- **THEN** its control flow uses the ids reported by the CLI
- **AND** it does not branch on literal `proposal`/`specs`/`design`/`tasks` names

#### Scenario: Works for a custom schema

- **WHEN** the active change uses a custom schema whose artifact ids are not `proposal`/`specs`/`design`/`tasks`
- **THEN** the skill uses the artifact ids and paths reported by the CLI
- **AND** it works without any change to the skill

#### Scenario: Resolve artifact paths cross-platform

- **WHEN** the skill reads or writes an artifact on macOS, Linux, or Windows
- **THEN** it uses the `existingOutputPaths` provided by the CLI status output
- **AND** it does not assume forward-slash separators

#### Scenario: Edit the concrete files of a glob artifact

- **WHEN** an artifact's declared output path is a glob (for example `specs/**/*.md`)
- **THEN** the skill edits the concrete files reported in that artifact's `existingOutputPaths`
- **AND** it does not write to `resolvedOutputPath`, which for a glob artifact remains the glob pattern rather than a real file

#### Scenario: A new file under a glob artifact is deferred to continue

- **WHEN** keeping the change coherent would require a new file under a glob artifact that does not exist yet (for example a spec for a not-yet-captured capability)
- **THEN** the skill revises only the files already present in `existingOutputPaths`
- **AND** it points the user to `/opsx:continue`/`/opsx:propose` to create the new file rather than inventing a path from the glob

### Requirement: Bidirectional Coherence Review

The `/opsx:update` skill SHALL keep a change's existing planning artifacts coherent with one another after a revision, reviewing affected artifacts in any direction rather than assuming a fixed downstream flow.

#### Scenario: Reconcile related artifacts after an edit

- **WHEN** the user revises one artifact
- **THEN** the skill reviews the change's other existing artifacts against the revision
- **AND** it proposes follow-on edits to any artifact that is now inconsistent, whether that artifact is upstream or downstream of the edited one

#### Scenario: Upstream artifact may be revised

- **WHEN** an edit to a later artifact (for example design) contradicts an earlier one (for example the proposal)
- **THEN** the skill may propose revising the earlier artifact to restore coherence
- **AND** it does not treat propagation as downstream-only

#### Scenario: Coherence review with no specific edit

- **WHEN** the user invokes `/opsx:update` without a specific revision in mind ("make this change coherent")
- **THEN** the skill reads the change's existing artifacts and reviews them against each other for contradictions, gaps, and duplication
- **AND** it presents any findings for the user to confirm before editing

#### Scenario: Coherent change yields no changes

- **WHEN** the skill finds the change's artifacts already coherent
- **THEN** it reports the change as coherent and makes no edits

### Requirement: Next-Step Guidance

After applying confirmed revisions (or finding none needed), the `/opsx:update` skill SHALL report where the change stands and recommend the next command, without acting on the recommendation itself.

#### Scenario: Updating an already-implemented change

- **WHEN** the user updates a change whose implementation already happened (for example tasks are checked off or `/opsx:apply` was already run)
- **THEN** the skill still revises planning artifacts only
- **AND** it notes that the implementation may no longer match the revised plan and recommends `/opsx:apply` to carry the delta into code
- **AND** it does not implement anything itself

#### Scenario: Next step when artifacts are incomplete

- **WHEN** the update finishes and the change still has not-yet-created artifacts
- **THEN** the skill recommends `/opsx:continue` to create them

#### Scenario: Next step when the change is fully done

- **WHEN** the update finishes and the change's artifacts are complete and already implemented
- **THEN** the skill recommends `/opsx:archive`

### Requirement: User-Confirmed Incremental Application

The `/opsx:update` skill SHALL propose each artifact revision and apply it only after user confirmation.

#### Scenario: Confirm before writing

- **WHEN** the skill has a proposed revision for an artifact
- **THEN** it shows the user what it intends to change and why before writing
- **AND** it writes only after the user confirms

#### Scenario: Rejected revision is not written

- **WHEN** the user rejects a proposed revision for an artifact
- **THEN** the skill does not write that revision
- **AND** the artifact is left unchanged

#### Scenario: Intent change is redirected to a new change

- **WHEN** the requested revision changes the intent of the change rather than refining it (per the "Update vs. Start Fresh" heuristic)
- **THEN** the skill recommends starting a new change (`/opsx:new`) instead of mutating the existing proposal into different work
