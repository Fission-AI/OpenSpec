# config-loading Delta Specification

## Purpose
Extend `openspec/specs/config-loading/spec.md` to add the `hooks` field to the project config parsing contract.

## ADDED Requirements

### Requirement: Parse hooks field from openspec/config.yaml

The system SHALL parse the `hooks` top-level field from `openspec/config.yaml` using the same resilient field-by-field parsing pattern applied to `schema`, `context`, and `rules`.

#### Scenario: Hooks field is valid object
- **WHEN** config contains a valid `hooks` object with recognized event keys
- **THEN** the parsed config includes the hooks object with all valid entries

#### Scenario: Hooks field is present but wrong type
- **WHEN** config contains `hooks: "some string"`
- **THEN** a warning is logged and the hooks field is excluded from the returned config
- **AND** all other valid fields are still returned

#### Scenario: Hooks field is absent
- **WHEN** config does not contain a `hooks` key
- **THEN** the parsed config is returned with `hooks` as undefined and no warning

#### Scenario: Mix of valid and invalid hook entries
- **WHEN** the hooks object contains some valid entries and some entries with unrecognized keys
- **THEN** valid entries are included in the returned config
- **AND** warnings are logged for unrecognized entries
- **AND** parsing continues to completion

### Requirement: Expose hooks on ProjectConfig type

The `ProjectConfig` TypeScript type SHALL include an optional `hooks` field typed as `HooksConfig`.

#### Scenario: TypeScript callers access hooks
- **WHEN** code calls `readProjectConfig(projectRoot)` and hooks are configured
- **THEN** `config.hooks` is typed as `HooksConfig | undefined` and accessible without a cast
