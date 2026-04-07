# enpalspec-binary Specification

## Purpose

TBD

## Requirements

### Requirement: enpalspec binary entry

The package SHALL declare `enpalspec` as its bin entry in `package.json`, pointing to the existing CLI entry point. The `openspec` bin entry SHALL be removed.

#### Scenario: CLI resolves as enpalspec

- **WHEN** the package is installed globally
- **THEN** `enpalspec --version` outputs the current version
- **AND** `openspec --version` is not provided by this package

#### Scenario: No dual-binary confusion

- **WHEN** only enpalspec is installed
- **THEN** running `openspec` produces a "command not found" error (not resolved by this package)

### Requirement: Package identity fields updated

The `package.json` SHALL be updated so that `name`, `description`, `homepage`, and `repository.url` reflect the enpalspec product identity rather than `@fission-ai/openspec`.

#### Scenario: Package name updated

- **WHEN** the package is published
- **THEN** `npm info <package>` shows the enpalspec package name, not `@fission-ai/openspec`
