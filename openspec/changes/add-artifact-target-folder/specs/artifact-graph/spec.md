## ADDED Requirements

### Requirement: External Folder Field on Artifacts

The artifact graph schema SHALL accept an optional string field `folder` on each artifact definition. When present, this field re-parents the artifact's outputs to a path relative to the project root rather than the change directory.

The field SHALL be surfaced on the in-memory `Artifact` model so the resolution helper and the schema validator can read it. Downstream consumers (instruction renderer, completion detector) inherit `folder:` support through the helper without reading the field directly.

#### Scenario: Schema with folder field parses successfully
- **WHEN** an artifact definition contains `folder: "ADR"` and `generates: "*.md"`
- **THEN** the system parses the schema without error
- **AND** the loaded `Artifact` exposes `folder` as `"ADR"`

#### Scenario: Schema without folder field parses unchanged
- **WHEN** an artifact definition omits `folder`
- **THEN** the system parses the schema without error
- **AND** the loaded `Artifact` exposes `folder` as `undefined`
- **AND** completion detection, instruction rendering, and archive behavior are identical to pre-existing behavior

#### Scenario: Folder field with empty string rejected
- **WHEN** a schema sets `folder: ""` (empty after trim)
- **THEN** the system throws a Zod validation error identifying the artifact and the empty value

### Requirement: Artifact Base Directory Resolution

The system SHALL provide a single resolution helper, `resolveArtifactBaseDir(artifact, changeDir)`, that returns the absolute base directory for an artifact. The helper SHALL derive the project root from `changeDir` internally (using the invariant that `changeDir` is `<projectRoot>/openspec/changes/<name>/`), so callers do not need to thread `projectRoot` through the call stack.

The existing `resolveArtifactOutputs()` function SHALL be the single production call site that uses this helper. Because `state.ts` (via `artifactOutputExists`) and `instructions.ts` already funnel through `resolveArtifactOutputs()`, completion detection and instruction rendering inherit `folder:` support transitively without changes of their own.

When the artifact's `folder` is unset, the helper SHALL return `changeDir` unchanged. When `folder` is set, the helper SHALL return `path.resolve(projectRoot, folder)` where `projectRoot` is `path.resolve(changeDir, '../../..')`.

The helper SHALL use `path.resolve` and `path.join` exclusively — no string concatenation of separators — so resolution is correct on Windows, macOS, and Linux.

#### Scenario: Default artifact resolves to change directory
- **WHEN** an artifact has no `folder` field
- **AND** the change directory is `<projectRoot>/openspec/changes/my-change`
- **THEN** the helper returns `<projectRoot>/openspec/changes/my-change`

#### Scenario: External artifact resolves to project-root-relative path
- **WHEN** an artifact has `folder: "ADR"`
- **AND** the project root is `/repo`
- **THEN** the helper returns `/repo/ADR` (joined with the OS path separator)

#### Scenario: External artifact resolves on Windows
- **WHEN** an artifact has `folder: "ADR"`
- **AND** the project root is `C:\\repo`
- **THEN** the helper returns `C:\\repo\\ADR` using the platform path separator
- **AND** subsequent file operations succeed without normalization errors

#### Scenario: Nested folder path resolves correctly
- **WHEN** an artifact has `folder: "docs/decisions"`
- **AND** the project root is `<projectRoot>`
- **THEN** the helper returns `<projectRoot>/docs/decisions` using the OS path separator

### Requirement: External Artifact Completion Detection

The completion-state logic SHALL treat artifacts with a `folder` field identically to in-change artifacts for the purpose of `done` / `ready` / `blocked` classification. The only difference SHALL be where the helper looks: the resolved external folder rather than the change directory.

The system SHALL use the existing glob-matching helper (`fast-glob`-based) for both cases — invoked with the resolved base directory plus the artifact's `generates` pattern.

The system SHALL NOT add a separate counting category, status indicator, or completion semantics for external artifacts.

#### Scenario: External artifact with matching file marked done
- **WHEN** an artifact has `folder: "ADR"` and `generates: "*.md"`
- **AND** at least one `.md` file exists in `<projectRoot>/ADR/`
- **THEN** the artifact is reported as `done`

#### Scenario: External artifact with no matching files marked ready
- **WHEN** an artifact has `folder: "ADR"` and `generates: "*.md"`
- **AND** no `.md` files exist in `<projectRoot>/ADR/` (folder absent or empty)
- **AND** the artifact's dependencies are all complete
- **THEN** the artifact is reported as `ready`

#### Scenario: External artifact respects dependency blocking
- **WHEN** an artifact has `folder: "ADR"` and depends on `proposal`
- **AND** `proposal.md` does not exist in the change directory
- **THEN** the artifact is reported as `blocked` regardless of the contents of `<projectRoot>/ADR/`

#### Scenario: External artifact counts identically in completion summary
- **WHEN** a schema has 4 artifacts, one of which has `folder: "ADR"` and is `done`
- **AND** 2 other artifacts are `done`
- **THEN** the completion summary reports `3/4 artifacts complete`
- **AND** no separate count or category is reported for the external artifact
