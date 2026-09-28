## ADDED Requirements

### Requirement: Report the installed version

The system SHALL provide an `openspec version` command that reports the running OpenSpec version and install context without requiring an OpenSpec project or contacting the network.

#### Scenario: Human-readable version report

- **WHEN** a user runs `openspec version`
- **THEN** the command reports the running OpenSpec version
- **AND** identifies the install's package manager and scope when they can be determined
- **AND** exits successfully without contacting a registry

#### Scenario: Machine-readable version report

- **WHEN** a user runs `openspec version --json`
- **THEN** stdout contains one valid JSON document
- **AND** the document contains `schemaVersion: 1`, `version`, and `install`
- **AND** `install` contains `location`, `packageManager`, and `scope`
- **AND** `scope` is one of `global`, `project`, `temporary`, or `source`
- **AND** values that cannot be determined are represented as `null`

#### Scenario: Source checkout

- **WHEN** the running CLI is a source checkout
- **THEN** the command reports `scope` as `source`
- **AND** it does not claim that a package manager owns the checkout

#### Scenario: Existing version flag remains compatible

- **WHEN** a user runs `openspec --version`
- **THEN** the command prints the same bare version string as before this capability was added
- **AND** no JSON or install metadata is added to that output

### Requirement: Check for an available update on request

The system SHALL contact the configured package registry only when `openspec version` receives `--check`, and SHALL report the outcome without making command success depend on registry availability.

#### Scenario: Update is available

- **WHEN** a user runs `openspec version --check`
- **AND** the registry reports a safe newer version
- **THEN** the command reports the latest version and the appropriate update command for this install
- **AND** reports whether the existing self-upgrade path can safely update this copy
- **AND** exits successfully

#### Scenario: Installed version is current

- **WHEN** a user runs `openspec version --check`
- **AND** the registry reports no version newer than the running version
- **THEN** the command reports the update status as `current`
- **AND** exits successfully

#### Scenario: Update check is disabled

- **WHEN** a user runs `openspec version --check`
- **AND** an existing OpenSpec privacy or update-check opt-out disables registry access
- **THEN** the command does not contact the registry
- **AND** reports the update status as `disabled`
- **AND** reports no latest version
- **AND** exits successfully

#### Scenario: Registry is unavailable

- **WHEN** a user runs `openspec version --check`
- **AND** the registry cannot be reached or returns an unusable response
- **THEN** the command reports the update status as `offline`
- **AND** reports no latest version
- **AND** exits successfully

#### Scenario: Machine-readable update result

- **WHEN** a user runs `openspec version --check --json`
- **THEN** the base version and install fields remain present
- **AND** the document contains an `update` object with `status`, `latest`, `command`, and `canSelfUpgrade`
- **AND** `status` is one of `available`, `current`, `disabled`, or `offline`
- **AND** unavailable values are represented as `null`
- **AND** stdout contains no text outside the JSON document

### Requirement: Preserve update-check safeguards

The version command SHALL use the same privacy, registry, timeout, response-size, redirect, and version-validation safeguards as OpenSpec's existing update check.

#### Scenario: Explicit privacy opt-out

- **WHEN** telemetry is disabled or `DO_NOT_TRACK`, `OPENSPEC_TELEMETRY`, or `OPENSPEC_NO_UPDATE_CHECK` disables outbound checks
- **AND** a user runs `openspec version --check`
- **THEN** the command performs no update-check request
- **AND** reports the update status as `disabled`

#### Scenario: Unsafe configured registry

- **WHEN** the configured registry is rejected by the existing registry safeguards
- **AND** a user runs `openspec version --check`
- **THEN** the command does not fall back to the public registry
- **AND** reports the update status as `disabled`

#### Scenario: Untrusted version response

- **WHEN** the registry response does not contain a version accepted by OpenSpec's existing version validator
- **THEN** the command does not print the untrusted value
- **AND** reports the update status as `offline`

### Requirement: Version reporting is read-only

The version command SHALL NOT install, upgrade, or modify OpenSpec, project files, or user configuration.

#### Scenario: Update is available

- **WHEN** `openspec version --check` reports an available update
- **THEN** it reports guidance only
- **AND** does not run a package manager or alter the installed copy

#### Scenario: Upgrade option is rejected

- **WHEN** a user runs `openspec version --upgrade`
- **THEN** the command reports that `--upgrade` is not supported
- **AND** does not attempt an upgrade
