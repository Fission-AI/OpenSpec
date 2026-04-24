# config-loading Specification — Delta

## ADDED Requirements

### Requirement: Parse module field from config

The system SHALL parse an optional `module` field from `openspec/config.yaml` that declares the current project's module name.

#### Scenario: Valid module name

- **WHEN** config contains `module: "gateway"`
- **THEN** the `module` field is included in returned config with value `"gateway"`

#### Scenario: Module name is invalid format

- **WHEN** config contains `module: "My Gateway"` (not kebab-case)
- **THEN** warning is logged and module field is not included in returned config

#### Scenario: Module field is missing

- **WHEN** config lacks the `module` field
- **THEN** no warning is logged (field is optional)
- **AND** the system operates in single-module mode

### Requirement: Parse modules registry from config

The system SHALL parse an optional `modules` field from `openspec/config.yaml` that maps module names to their locations.

#### Scenario: Modules with simple path values

- **WHEN** config contains:
  ```yaml
  modules:
    payments: ./packages/payments
    users: ./packages/users
  ```
- **THEN** the `modules` field is included in returned config as a record mapping names to path strings

#### Scenario: Modules with object values (git references)

- **WHEN** config contains:
  ```yaml
  modules:
    auth:
      git: github.com/org/auth-service
      ref: main
  ```
- **THEN** the `modules` field is included with the `auth` entry as an object containing `git` and `ref` fields

#### Scenario: Modules field has invalid module name

- **WHEN** config contains a module key that is not valid kebab-case
- **THEN** warning is logged for the invalid module name
- **AND** other valid modules are still included in returned config

#### Scenario: Modules field is missing

- **WHEN** config lacks the `modules` field
- **THEN** no warning is logged (field is optional)
- **AND** the system operates in single-module mode

#### Scenario: Resilient parsing of modules field

- **WHEN** config contains a mix of valid and invalid module entries
- **THEN** valid entries are included in returned config
- **AND** invalid entries log warnings and are excluded
- **AND** config loading does not fail entirely

### Requirement: Parse registry field from config

The system SHALL parse an optional `registry` field from `openspec/config.yaml` that points to an external module registry manifest.

#### Scenario: Registry as local path

- **WHEN** config contains `registry: ./shared/modules.yaml`
- **THEN** the `registry` field is included in returned config as a path string

#### Scenario: Registry as git reference

- **WHEN** config contains:
  ```yaml
  registry:
    git: github.com/org/openspec-registry
    ref: main
    path: modules.yaml
  ```
- **THEN** the `registry` field is included with git, ref, and path fields

#### Scenario: Registry field is missing

- **WHEN** config lacks the `registry` field
- **THEN** no warning is logged (field is optional)
