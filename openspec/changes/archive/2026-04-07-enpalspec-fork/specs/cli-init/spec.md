## MODIFIED Requirements

### Requirement: Directory Creation
The command SHALL create the OpenSpec directory structure with config file.

#### Scenario: Creating OpenSpec structure
- **WHEN** `enpalspec init` is executed
- **THEN** create the following directory structure:
```
openspec/
├── config.yaml
├── specs/
└── changes/
    └── archive/
```
- **AND** `config.yaml` SHALL contain `schema: enpal-spec-driven`

#### Scenario: Default schema is enpal-spec-driven
- **WHEN** `enpalspec init` completes successfully
- **THEN** `openspec/config.yaml` contains `schema: enpal-spec-driven`
- **AND** NOT `schema: spec-driven`
