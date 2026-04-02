## ADDED Requirements

### Requirement: Plugin manifest declares skill overlays

The plugin manifest schema SHALL support an optional `skill_overlays` field that maps workflow IDs to overlay operations.

#### Scenario: Plugin declares append overlay for a workflow
- **WHEN** plugin.yaml contains `skill_overlays: { apply: { append: "overlays/apply.md" } }`
- **THEN** the manifest parser validates the entry and stores it as a valid overlay declaration

#### Scenario: Plugin declares overlays for multiple workflows
- **WHEN** plugin.yaml contains overlays for both `apply` and `explore` workflows
- **THEN** each overlay declaration is parsed and stored independently

#### Scenario: Plugin declares no skill overlays
- **WHEN** plugin.yaml omits the `skill_overlays` field entirely
- **THEN** the manifest is valid and the plugin loads normally with no overlays

#### Scenario: Plugin declares overlay with invalid workflow ID
- **WHEN** plugin.yaml contains `skill_overlays: { nonexistent-workflow: { append: "file.md" } }`
- **THEN** the manifest is valid (workflow ID validation is deferred to update time when available workflows are known)

### Requirement: Overlay file path resolution uses platform-safe joins

The system SHALL resolve overlay file paths relative to the plugin directory using `path.join()`.

#### Scenario: Overlay file path on Unix
- **WHEN** plugin dir is `/project/openspec/plugins/my-plugin` and overlay path is `overlays/apply.md`
- **THEN** resolved path is `path.join(pluginDir, "overlays/apply.md")`

#### Scenario: Overlay file path on Windows
- **WHEN** plugin dir is `C:\project\openspec\plugins\my-plugin` and overlay path is `overlays\apply.md`
- **THEN** resolved path uses `path.join()` producing a valid Windows path

### Requirement: Overlay operation types

The initial release SHALL support `append` as the only overlay operation type. The schema SHALL be designed to accommodate future operation types (`prepend`, `replace_section`) without breaking changes.

#### Scenario: Append operation declared
- **WHEN** overlay declares `{ append: "overlays/apply.md" }`
- **THEN** the operation is recognized as valid

#### Scenario: Unknown operation type declared
- **WHEN** overlay declares `{ unknown_op: "file.md" }`
- **THEN** the manifest parser rejects the entry with a validation error

#### Scenario: Future prepend operation
- **WHEN** a future version adds `prepend` support
- **THEN** existing `append` declarations continue to work without migration
