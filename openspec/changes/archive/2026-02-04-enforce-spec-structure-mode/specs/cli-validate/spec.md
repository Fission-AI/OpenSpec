## ADDED Requirements

### Requirement: Spec structure validation enforces structure mode

When `specStructure.structure` is set to `'flat'` or `'hierarchical'`, `validateSpecStructure()` SHALL enforce that all specs conform to the chosen mode.

#### Scenario: Flat mode rejects hierarchical specs

- **WHEN** config has `structure: 'flat'`
- **AND** a spec has depth > 1 (e.g., `_global/testing`)
- **THEN** an ERROR SHALL be emitted: spec violates flat structure constraint

#### Scenario: Flat mode accepts flat specs

- **WHEN** config has `structure: 'flat'`
- **AND** all specs have depth 1 (e.g., `auth`, `payments`)
- **THEN** no structure enforcement errors SHALL be emitted

#### Scenario: Hierarchical mode rejects flat specs

- **WHEN** config has `structure: 'hierarchical'`
- **AND** a spec has depth 1 (e.g., `auth`)
- **THEN** an ERROR SHALL be emitted: spec violates hierarchical structure constraint

#### Scenario: Hierarchical mode accepts hierarchical specs

- **WHEN** config has `structure: 'hierarchical'`
- **AND** all specs have depth > 1 (e.g., `_global/testing`, `platform/api`)
- **THEN** no structure enforcement errors SHALL be emitted

#### Scenario: Auto mode does not enforce structure

- **WHEN** config has `structure: 'auto'`
- **THEN** no structure enforcement errors SHALL be emitted regardless of spec depths

### Requirement: Spec structure validation enforces allowMixed

When `specStructure.structure` is `'auto'` and `specStructure.allowMixed` is `false`, `validateSpecStructure()` SHALL detect mixing of flat and hierarchical specs.

#### Scenario: Mixed specs rejected when allowMixed is false

- **WHEN** config has `structure: 'auto'` and `allowMixed: false`
- **AND** specs contain both flat (depth 1) and hierarchical (depth > 1) specs
- **THEN** an ERROR SHALL be emitted indicating mixed structure is not allowed

#### Scenario: Uniform flat specs pass when allowMixed is false

- **WHEN** config has `structure: 'auto'` and `allowMixed: false`
- **AND** all specs have depth 1
- **THEN** no mixed-structure errors SHALL be emitted

#### Scenario: Uniform hierarchical specs pass when allowMixed is false

- **WHEN** config has `structure: 'auto'` and `allowMixed: false`
- **AND** all specs have depth > 1
- **THEN** no mixed-structure errors SHALL be emitted

#### Scenario: allowMixed is ignored when structure is explicit

- **WHEN** config has `structure: 'flat'` and `allowMixed: false`
- **THEN** the `allowMixed` check SHALL NOT run (structure mode already enforces uniformity)
