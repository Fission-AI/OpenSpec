## ADDED Requirements

### Requirement: Spec structure validation reads project-level config

When performing spec structure validation during bulk validation (`--all` or `--specs`), the validate command SHALL read `specStructure` from the project-level config (`openspec/config.yaml`) and pass it as overrides to `getSpecStructureConfig()`.

#### Scenario: Project config specStructure overrides global for validation

- **WHEN** executing `openspec validate --specs`
- **AND** `openspec/config.yaml` contains `specStructure: { structure: 'flat' }`
- **AND** global config has `specStructure: { structure: 'auto' }`
- **THEN** spec structure validation SHALL use `structure: 'flat'`

#### Scenario: No project config specStructure falls back to global

- **WHEN** executing `openspec validate --specs`
- **AND** `openspec/config.yaml` exists but has no `specStructure` field
- **THEN** spec structure validation SHALL use global config values (unchanged behavior)

#### Scenario: No project config file falls back to global

- **WHEN** executing `openspec validate --specs`
- **AND** no `openspec/config.yaml` exists
- **THEN** spec structure validation SHALL use global config values (unchanged behavior)

### Requirement: Project config specStructure uses resilient sub-field parsing

The project config parser SHALL validate each `specStructure` sub-field independently. Invalid sub-fields are warned and skipped; valid sub-fields are kept.

#### Scenario: Partial validity in specStructure

- **WHEN** `openspec/config.yaml` contains:
  ```yaml
  specStructure:
    structure: flat
    maxDepth: "invalid"
    validatePaths: false
  ```
- **THEN** the parser SHALL keep `structure: 'flat'` and `validatePaths: false`
- **AND** warn about the invalid `maxDepth` value
- **AND** `maxDepth` SHALL fall through to global config or default

#### Scenario: Entirely invalid specStructure value

- **WHEN** `openspec/config.yaml` contains `specStructure: 42`
- **THEN** the parser SHALL warn that specStructure must be an object
- **AND** specStructure SHALL be treated as undefined (fall through to global/default)

#### Scenario: Valid complete specStructure

- **WHEN** `openspec/config.yaml` contains:
  ```yaml
  specStructure:
    structure: hierarchical
    maxDepth: 3
    allowMixed: false
    validatePaths: true
  ```
- **THEN** all four fields SHALL be parsed and available as project overrides

#### Scenario: Unknown sub-fields in specStructure

- **WHEN** `openspec/config.yaml` contains `specStructure: { structure: 'flat', unknownField: true }`
- **THEN** the parser SHALL ignore `unknownField` without warning
- **AND** `structure: 'flat'` SHALL be parsed normally
