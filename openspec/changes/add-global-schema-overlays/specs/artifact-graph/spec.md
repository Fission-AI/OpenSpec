## ADDED Requirements

### Requirement: Schema overlays use explicit field operations

The system SHALL apply a valid user overlay to existing artifacts in a packaged schema using explicit, deterministic operations before validating the effective schema.

#### Scenario: Append artifact instruction

- **GIVEN** an overlay specifies `artifacts.tasks.instruction.append`
- **WHEN** the overlay is composed with the packaged schema
- **THEN** the effective tasks instruction SHALL contain the packaged instruction followed by one blank line and the appended text

#### Scenario: Prepend artifact instruction

- **GIVEN** an overlay specifies `artifacts.tasks.instruction.prepend`
- **WHEN** the overlay is composed with the packaged schema
- **THEN** the effective tasks instruction SHALL contain the prepended text followed by one blank line and the packaged instruction

#### Scenario: Prepend and append together

- **GIVEN** an overlay specifies both `prepend` and `append` for an instruction
- **WHEN** the overlay is composed
- **THEN** the effective instruction SHALL order the non-empty segments as prepend, packaged, append
- **AND** it SHALL separate adjacent segments with one blank line

#### Scenario: Replace artifact instruction

- **GIVEN** an overlay specifies `artifacts.tasks.instruction.replace`
- **WHEN** the overlay is composed
- **THEN** the effective tasks instruction SHALL equal the replacement text
- **AND** it SHALL NOT include the packaged instruction

#### Scenario: Replace conflicts with additive text operations

- **WHEN** one instruction patch specifies `replace` together with `prepend` or `append`
- **THEN** overlay validation SHALL fail with the conflicting operation path

#### Scenario: Scalar artifact field replacement

- **GIVEN** an overlay supplies `description`, `generates`, or `template` for an existing artifact
- **WHEN** the overlay is composed
- **THEN** each supplied scalar SHALL replace the corresponding packaged value
- **AND** omitted fields SHALL retain their packaged values

### Requirement: Overlay dependency operations preserve deterministic order

The system SHALL update `requires` arrays using either replacement or ordered remove/add operations.

#### Scenario: Remove and add dependencies

- **GIVEN** an artifact dependency patch removes an existing ID and adds another existing artifact ID
- **WHEN** the overlay is composed
- **THEN** removal SHALL preserve the relative order of remaining dependencies
- **AND** additions SHALL be appended in overlay declaration order

#### Scenario: Replace dependencies

- **GIVEN** an artifact dependency patch specifies `replace`
- **WHEN** the overlay is composed
- **THEN** the effective dependency list SHALL exactly match the replacement list

#### Scenario: Replace conflicts with add or remove

- **WHEN** one dependency patch specifies `replace` together with `add` or `remove`
- **THEN** overlay validation SHALL fail with the conflicting operation path

#### Scenario: Invalid dependency operation is rejected

- **WHEN** a dependency patch contains duplicates, adds and removes the same ID, or removes an ID absent from the base list
- **THEN** overlay validation SHALL fail with an actionable diagnostic

### Requirement: Overlay scope is limited to existing artifacts

The system SHALL reject structural artifact changes that are outside the layered override contract.

#### Scenario: Unknown artifact ID is rejected

- **WHEN** an overlay contains an artifact ID absent from the packaged schema
- **THEN** composition SHALL fail and identify the unknown artifact ID

#### Scenario: Schema identity cannot be overridden

- **WHEN** an overlay attempts to set schema `name`, schema `version`, or an artifact `id`
- **THEN** overlay validation SHALL reject the unsupported field

#### Scenario: Effective graph is invalid

- **WHEN** otherwise valid overlay operations produce an unknown dependency or cycle
- **THEN** the existing complete-schema validation SHALL reject the effective schema
- **AND** the error SHALL identify the overlay as the source of the invalid effective result

### Requirement: Composed schemas use layered template resolution

For a packaged schema with a user overlay, the system SHALL resolve each template from the optional user template directory before falling back to the packaged template directory.

#### Scenario: User template overrides packaged template

- **GIVEN** the effective schema references `tasks.md`
- **AND** both user and packaged template directories contain `tasks.md`
- **WHEN** task instructions are loaded
- **THEN** the user template SHALL be used
- **AND** its source path SHALL be reported

#### Scenario: Missing user template falls back to package

- **GIVEN** the effective schema references `proposal.md`
- **AND** no user `proposal.md` template exists
- **AND** the packaged template exists
- **WHEN** proposal instructions are loaded
- **THEN** the packaged template SHALL be used

#### Scenario: Missing template in all roots fails

- **WHEN** an effective schema references a template absent from every allowed template root
- **THEN** template loading and schema validation SHALL fail with all checked roots identified

#### Scenario: Complete replacement stays self-contained

- **GIVEN** a project or complete user schema references a template missing from its own directory
- **AND** a same-named packaged template exists
- **WHEN** the template is loaded or validated
- **THEN** the operation SHALL fail
- **AND** it SHALL NOT fall back to the packaged template

#### Scenario: Template path cannot escape either root

- **WHEN** an overlay template path or symlink escapes its candidate user or package template root
- **THEN** the system SHALL reject the path using the existing containment policy
