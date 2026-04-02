## ADDED Requirements

### Requirement: Overlay content is appended to generated skill instructions

During `openspec update`, the system SHALL read overlay files from active plugins and append their content to the corresponding workflow's skill instructions before writing the skill file.

#### Scenario: Single plugin with one overlay
- **WHEN** plugin `my-plugin` declares `skill_overlays: { apply: { append: "overlays/apply.md" } }`
- **AND** `openspec update` generates the `apply` workflow skill
- **THEN** the generated SKILL.md contains the original template content followed by the overlay file content separated by a blank line

#### Scenario: Multiple plugins with overlays for the same workflow
- **WHEN** plugin `plugin-a` declares an `apply` overlay and plugin `plugin-b` also declares an `apply` overlay
- **AND** config.yaml lists plugins in order `[plugin-a, plugin-b]`
- **THEN** overlays are appended in plugin whitelist order: original → plugin-a overlay → plugin-b overlay

#### Scenario: Plugin with overlay for a workflow not in the active profile
- **WHEN** plugin declares an `apply` overlay but the active profile excludes the `apply` workflow
- **THEN** the overlay is silently ignored (no skill generated, no overlay applied)

#### Scenario: No plugins have overlays
- **WHEN** no active plugins declare `skill_overlays`
- **THEN** skill generation produces identical output to the current behavior

### Requirement: Overlay content is appended to generated command content

During `openspec update`, the system SHALL also apply overlays to command files (not just skills), because both delivery modes serve the same workflow instructions.

#### Scenario: Command generation with overlay
- **WHEN** plugin declares an `apply` overlay and delivery mode includes commands
- **THEN** the generated command file for `apply` includes the overlay content appended after the template body

### Requirement: Overlay file missing produces a warning, not a failure

The system SHALL warn but continue if a declared overlay file does not exist on disk.

#### Scenario: Overlay file exists
- **WHEN** the declared overlay file path resolves to an existing file
- **THEN** its content is read and appended

#### Scenario: Overlay file does not exist
- **WHEN** the declared overlay file path resolves to a non-existent file
- **THEN** a warning is logged with the plugin name and file path
- **AND** skill generation continues without the overlay

### Requirement: Overlay injection composes with existing transformers

The overlay injection SHALL compose with tool-specific transformers (e.g., OpenCode's hyphen-based command references) so both transformations apply.

#### Scenario: OpenCode tool with plugin overlay
- **WHEN** generating skills for OpenCode with an active plugin overlay
- **THEN** the overlay content is appended first, then the hyphen command reference transformer runs on the combined content
