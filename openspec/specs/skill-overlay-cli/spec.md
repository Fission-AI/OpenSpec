## ADDED Requirements

### Requirement: Plugin info command shows overlay declarations

The `openspec plugin info` command SHALL display skill overlay registrations when a plugin declares them.

#### Scenario: Plugin with overlays
- **WHEN** user runs `openspec plugin info my-plugin`
- **AND** the plugin declares `skill_overlays` for `apply` and `explore`
- **THEN** the output includes a "Skill Overlays" section listing each workflow and its overlay file path

#### Scenario: Plugin without overlays
- **WHEN** user runs `openspec plugin info my-plugin`
- **AND** the plugin has no `skill_overlays`
- **THEN** no "Skill Overlays" section appears in the output

#### Scenario: JSON output includes overlays
- **WHEN** user runs `openspec plugin info my-plugin --json`
- **THEN** the JSON output includes a `skillOverlays` field (empty object if none declared)
