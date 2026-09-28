## ADDED Requirements

### Requirement: Reference a co-located parent root

The system SHALL allow a project to declare a parent OpenSpec root with a
relative-path entry in `references:`.

#### Scenario: Package references the monorepo root

- **WHEN** a package config declares `references: [{ path: ../.. }]`
- **AND** that path resolves to a strict ancestor containing `openspec/`
- **THEN** instructions include an index of the parent root's specs
- **AND** the parent root is identified as read-only context

#### Scenario: Reference is not a parent

- **WHEN** a local reference is absolute, self-referential, a sibling, a descendant, or missing an OpenSpec root
- **THEN** OpenSpec reports the reference as unavailable
- **AND** it does not read from that location

### Requirement: Inherit parent configuration safely

The system SHALL make a declared parent's context and schemas available to the
child without inheriting writable behavior or unrelated settings.

#### Scenario: Parent supplies context and a schema

- **WHEN** a child references a parent with context and a project schema
- **THEN** parent context appears before child context in workflow instructions
- **AND** the parent schema is available after child-local schemas in precedence
- **AND** a child `schema:` value remains the default when present

#### Scenario: Combined context exceeds the prompt budget

- **WHEN** parent and child context together exceed 50KB
- **THEN** OpenSpec warns and uses only the child context

### Requirement: Keep the child root authoritative

The system SHALL NOT change root selection or write through a local reference.

#### Scenario: Create and archive from a package

- **WHEN** a user creates or archives a change inside a referenced package root
- **THEN** all change files, spec merges, and archive files stay under that package root
- **AND** the parent root remains unchanged

#### Scenario: Parent declares more references

- **WHEN** the declared parent has references of its own
- **THEN** the child does not follow them automatically
