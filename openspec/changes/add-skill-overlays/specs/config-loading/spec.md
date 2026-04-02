## MODIFIED Requirements

### Requirement: Load project config from openspec/config.yaml

The system SHALL read and parse the project configuration file located at `openspec/config.yaml` relative to the project root. **Plugin loading SHALL parse overlay declarations from plugin manifests. File existence validation is deferred to injection time (during `openspec update`), not load time.**

#### Scenario: Plugin with valid overlay files loaded
- **WHEN** config lists plugin `odoo-lifecycle` and plugin.yaml declares `skill_overlays: { apply: { append: "overlays/apply.md" } }`
- **AND** the overlay file exists at `openspec/plugins/odoo-lifecycle/overlays/apply.md`
- **THEN** the plugin is loaded with its overlay declarations available for query

#### Scenario: Plugin with missing overlay file loaded
- **WHEN** config lists plugin `odoo-lifecycle` and plugin.yaml declares an overlay pointing to a non-existent file
- **THEN** the plugin loads successfully (file existence is checked at injection time, not load time)
