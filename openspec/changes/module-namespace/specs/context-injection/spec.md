# context-injection Specification — Delta

## ADDED Requirements

### Requirement: Module-scoped context injection

The system SHALL support injecting context from module-level config files in addition to the project-level config, with project context taking precedence.

#### Scenario: Module has its own config with context

- **WHEN** a module at `./packages/payments` has its own `openspec/config.yaml` with a `context` field
- **AND** the project root also has a context field
- **THEN** instruction output includes both contexts: project context first, then module context
- **AND** module context is wrapped in `<module-context module="payments">\n{content}\n</module-context>` tags

#### Scenario: Module has context but project does not

- **WHEN** only the module config has a context field
- **THEN** instruction output includes only the module context in `<module-context>` tags

#### Scenario: Neither project nor module has context

- **WHEN** neither config has a context field
- **THEN** instruction output does not include any context tags

#### Scenario: Context injection for cross-module changes

- **WHEN** generating instructions for a change that spans modules `payments` and `auth`
- **THEN** instruction output includes the project context
- **AND** includes module context for each relevant module, identified by module name in the tag
