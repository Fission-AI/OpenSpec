## ADDED Requirements

### Requirement: getSpecStructureConfig supports project-level overrides

`getSpecStructureConfig()` SHALL accept an optional `projectOverrides` parameter of type `Partial<SpecStructureConfig>`. When provided, project override values take precedence over global config values, which take precedence over defaults. Each field is resolved independently.

The precedence chain for each field:
```
project override → global config → default
```

Defaults: `structure: 'auto'`, `maxDepth: 4`, `allowMixed: true`, `validatePaths: true`.

#### Scenario: Project overrides specific fields

- **WHEN** calling `getSpecStructureConfig({ structure: 'flat' })`
- **AND** global config has `{ maxDepth: 6 }`
- **THEN** the result SHALL be `{ structure: 'flat', maxDepth: 6, allowMixed: true, validatePaths: true }`

#### Scenario: Project overrides all fields

- **WHEN** calling `getSpecStructureConfig({ structure: 'hierarchical', maxDepth: 3, allowMixed: false, validatePaths: false })`
- **THEN** the result SHALL use all project values regardless of global config

#### Scenario: No project overrides (backward compatible)

- **WHEN** calling `getSpecStructureConfig()` without arguments
- **THEN** the result SHALL be identical to the previous behavior (global config merged with defaults)

#### Scenario: Project override with false boolean values

- **WHEN** calling `getSpecStructureConfig({ allowMixed: false })`
- **AND** global config has `{ allowMixed: true }`
- **THEN** the result SHALL have `allowMixed: false`
- **AND** the system SHALL use nullish coalescing (`??`) for boolean and number fields to preserve `false` and `0` values

#### Scenario: Project override with undefined fields

- **WHEN** calling `getSpecStructureConfig({ structure: 'flat', maxDepth: undefined })`
- **AND** global config has `{ maxDepth: 6 }`
- **THEN** `maxDepth` SHALL resolve to `6` from global config (undefined does not override)
