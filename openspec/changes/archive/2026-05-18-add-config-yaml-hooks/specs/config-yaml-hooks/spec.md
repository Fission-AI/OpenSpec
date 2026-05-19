# config-yaml-hooks Specification

## Purpose
Define the schema, parsing, and validation of the `hooks` field in `openspec/config.yaml`, enabling projects to declare pre/post lifecycle automation for the four core workflows: propose, explore, apply, and archive.

## ADDED Requirements

### Requirement: Support hooks field in openspec/config.yaml

The system SHALL parse a top-level `hooks` field from `openspec/config.yaml` using the same resilient field-by-field parsing applied to `schema`, `context`, and `rules`.

#### Scenario: Config has no hooks field
- **WHEN** `openspec/config.yaml` exists and contains no `hooks` key
- **THEN** the parsed config returns `hooks: undefined` with no warning

#### Scenario: Config has empty hooks object
- **WHEN** `openspec/config.yaml` contains `hooks: {}`
- **THEN** the parsed config returns an empty hooks object with no warning

#### Scenario: Config has valid pre/post hook entries
- **WHEN** `openspec/config.yaml` contains valid hook entries such as `post-archive` with `instruction` and `run` fields
- **THEN** the parsed config includes those hook entries with their values intact

#### Scenario: Hooks field is wrong type
- **WHEN** `openspec/config.yaml` contains `hooks: "string value"`
- **THEN** a warning is logged and the hooks field is excluded from the parsed config
- **AND** other valid config fields (schema, context, rules) are still returned

### Requirement: Accept eight valid hook event keys

The system SHALL accept exactly eight hook event keys: `pre-propose`, `post-propose`, `pre-explore`, `post-explore`, `pre-apply`, `post-apply`, `pre-archive`, `post-archive`.

#### Scenario: All eight valid hook keys are present
- **WHEN** `openspec/config.yaml` contains all eight hook event keys
- **THEN** all eight are parsed and returned without warnings

#### Scenario: Unknown hook key is present
- **WHEN** `openspec/config.yaml` contains a hook key not in the valid set (e.g., `pre-build`)
- **THEN** a warning is logged naming the unknown key
- **AND** the unknown key is excluded from the parsed hooks
- **AND** valid keys in the same hooks block are still returned

#### Scenario: Hook key uses wrong format
- **WHEN** `openspec/config.yaml` contains `preArchive` (camelCase) instead of `pre-archive`
- **THEN** a warning is logged and that key is excluded from parsed hooks

### Requirement: Hook entry supports optional instruction and run fields

Each hook entry SHALL be either null/empty or an object with optional `instruction` (string) and optional `run` (string) fields. Both fields are optional; an entry with neither is a valid no-op.

#### Scenario: Hook entry is null
- **WHEN** a hook key is present with a null or empty value (e.g., `pre-archive:`)
- **THEN** the hook entry is treated as a no-op (no instruction, no run command)
- **AND** no warning is logged

#### Scenario: Hook entry has only instruction
- **WHEN** a hook entry contains only an `instruction` field
- **THEN** `instruction` is returned as a string; `run` is undefined

#### Scenario: Hook entry has only run
- **WHEN** a hook entry contains only a `run` field
- **THEN** `run` is returned as a string; `instruction` is undefined

#### Scenario: Hook entry has both instruction and run
- **WHEN** a hook entry contains both `instruction` and `run`
- **THEN** both fields are returned with their string values

#### Scenario: Hook entry instruction is wrong type
- **WHEN** a hook entry contains `instruction: 123`
- **THEN** a warning is logged and the `instruction` field is excluded
- **AND** a valid `run` field in the same entry is still returned

#### Scenario: Hook entry run is wrong type
- **WHEN** a hook entry contains `run: true`
- **THEN** a warning is logged and the `run` field is excluded
- **AND** a valid `instruction` field in the same entry is still returned

### Requirement: Expose hook data via openspec hooks get command

The system SHALL provide a `openspec hooks get <event>` command that reads the project config and returns the resolved hook entry for the given event as JSON.

#### Scenario: Hook event has a configured entry
- **WHEN** `openspec hooks get post-archive --json` is called
- **AND** `openspec/config.yaml` has a `post-archive` hook with `instruction` and `run`
- **THEN** the command outputs JSON with `{ "event": "post-archive", "instruction": "...", "run": "...", "exists": true }`

#### Scenario: Hook event is not configured
- **WHEN** `openspec hooks get pre-propose --json` is called
- **AND** `openspec/config.yaml` has no `pre-propose` hook
- **THEN** the command outputs JSON with `{ "event": "pre-propose", "instruction": null, "run": null, "exists": false }`

#### Scenario: No config.yaml exists
- **WHEN** `openspec hooks get pre-apply --json` is called
- **AND** no `openspec/config.yaml` exists
- **THEN** the command outputs JSON with `{ "event": "pre-apply", "instruction": null, "run": null, "exists": false }`

#### Scenario: Invalid event name is passed
- **WHEN** `openspec hooks get invalid-event --json` is called
- **THEN** the command exits with a non-zero status code and an error message listing valid event names

#### Scenario: Command called without project root containing openspec directory
- **WHEN** `openspec hooks get post-apply --json` is called outside any project with an openspec directory
- **THEN** the command outputs JSON with `exists: false` and no error
