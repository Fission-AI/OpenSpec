## ADDED Requirements

### Requirement: Plugin overlay injection during update

The update command SHALL load active plugins and apply skill overlays to generated skill and command content during `openspec update`.

#### Scenario: Updating skills with active plugin overlays
- **WHEN** `openspec update` runs and `config.yaml` lists plugins with `skill_overlays`
- **THEN** the update command loads plugins from the config whitelist
- **AND** for each workflow being generated, collects overlay content from all active plugins in whitelist order
- **AND** passes the composed overlay transformer to `generateSkillContent`
- **AND** the resulting skill files include overlay content appended after the base template

#### Scenario: Updating skills with no plugins configured
- **WHEN** `openspec update` runs and `config.yaml` has no `plugins` field
- **THEN** skill generation proceeds identically to the current behavior (no overlays applied)

#### Scenario: Updating skills when plugin loading fails
- **WHEN** `openspec update` runs and a configured plugin fails to load
- **THEN** a warning is logged for the failed plugin
- **AND** other plugins' overlays are still applied
- **AND** skill generation completes successfully

#### Scenario: Init command does not apply overlays
- **WHEN** `openspec init` generates initial skill files
- **THEN** no plugin overlays are applied (plugins may not be configured yet at init time)
- **AND** overlay injection only activates during `openspec update`
