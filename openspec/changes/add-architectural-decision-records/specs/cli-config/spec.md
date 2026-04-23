## ADDED Requirements

### Requirement: ADR Template Configuration

The `openspec/config.yaml` SHALL support configuring custom templates for both decision.md and adr.md files.

#### Scenario: Configuring custom ADR template paths

- **WHEN** a project wants to use custom ADR templates
- **THEN** add template configuration to `openspec/config.yaml`:
  ```yaml
  templates:
    decision: ./templates/decision.md  # Optional
    adr: ./templates/adr.md           # Optional
  ```
- **AND** the specified paths SHALL be relative to the openspec directory
- **AND** the system SHALL use these templates when scaffolding new ADRs

#### Scenario: Template resolution with configuration

- **WHEN** the system needs ADR templates
- **THEN** for decision.md it SHALL resolve in this order:
  1. Check `config.yaml` for `templates.decision` path
  2. Check for `openspec/templates/decision.md` (default location)
  3. Use built-in default template
- **AND** for adr.md it SHALL resolve in this order:
  1. Check `config.yaml` for `templates.adr` path
  2. Check for `openspec/templates/adr.md` (default location)
  3. Use built-in default template
- **AND** use the first template found for each file type

#### Scenario: Invalid template path in configuration

- **WHEN** `config.yaml` specifies a template path that doesn't exist
- **THEN** the system SHALL display a warning
- **AND** fall back to checking default template location
- **AND** ultimately use built-in default if no valid template found

#### Scenario: Validating template configuration

- **WHEN** running `openspec validate --config`
- **THEN** the command SHALL check if configured template paths exist
- **AND** warn about missing or inaccessible template files
- **AND** suggest corrections for invalid paths

#### Scenario: Template configuration for future extensibility

- **WHEN** template configuration is added
- **THEN** it SHALL use a `templates` section in config.yaml
- **AND** support both `decision` and `adr` template types
- **AND** support future template types (e.g., `spec`, `proposal`, `design`)
- **AND** maintain backward compatibility if templates section is absent
