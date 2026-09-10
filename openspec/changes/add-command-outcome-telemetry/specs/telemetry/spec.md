## ADDED Requirements

### Requirement: Bounded property contract
Every property in every telemetry event SHALL have a fixed, enumerable value set known before the event is built. A property value SHALL be one of: a member of a compile-time constant list, a boolean, a bucket label from a fixed bucket list, or a number whose meaning is a measurement (duration, count) rather than an identifier.

A property value SHALL NOT be derived from user-authored text. This includes, and is not limited to: change ids, spec ids, schema ids, artifact ids, store ids, store remotes, store branches, store local paths, `defaultStore`, `featureFlags` keys, `openers` content, file paths, project names, error messages, and command arguments.

Where a value comes from a set the user can extend, the system SHALL check membership against the compile-time list and SHALL substitute a fixed fallback label (or omit the property) when the value is not a member. The system SHALL NOT pass such a value through unchecked.

#### Scenario: Value from a closed constant list
- **WHEN** the system records the active install profile
- **THEN** the property value is one of the values declared by the `Profile` type (`core`, `custom`)

#### Scenario: Value from a user-extensible set
- **WHEN** a user has forked a schema into `openspec/schemas/acme-internal/`
- **AND** a command runs against that schema
- **THEN** no property carries the string `acme-internal`
- **AND** the schema is described only by where it was loaded from (`package`, `project`, or `user`)

#### Scenario: Tool id not in the registry
- **WHEN** a configured tool id is not a member of the `AI_TOOLS` registry
- **THEN** that id is dropped from the event rather than sent

#### Scenario: Counts are bucketed
- **WHEN** the system records how many active changes a project has
- **THEN** the property value is a bucket label from a fixed list, not the exact count

#### Scenario: New property without a closed value set
- **WHEN** a proposed property's value set cannot be enumerated at build time
- **THEN** the property SHALL NOT be added to any event

### Requirement: Command outcome tracking
The system SHALL send a `command_completed` event after every command finishes, whether it succeeded or failed, carrying `command`, `version`, `surface`, `session_id`, `outcome`, `error_class`, `exit_code`, and `duration_ms`.

`outcome` SHALL be one of: `success`, `user_error`, `internal_error`, `cancelled`.

`duration_ms` SHALL be the whole number of milliseconds between the start of the `preAction` hook and the start of the `postAction` hook. It SHALL NOT be a wall-clock timestamp.

#### Scenario: Successful command
- **WHEN** a command completes with exit code 0
- **THEN** the system sends `command_completed` with `outcome: "success"`, `error_class: "none"`, and `exit_code: 0`

#### Scenario: Failed command
- **WHEN** a command fails and sets a non-zero exit code
- **THEN** the system sends `command_completed` with a non-`success` outcome and a classified `error_class`

#### Scenario: Cancelled command
- **WHEN** a user presses Ctrl-C at an interactive prompt and the command exits 130
- **THEN** the system sends `command_completed` with `outcome: "cancelled"` and `error_class: "cancelled"`

#### Scenario: Correlation with the start event
- **WHEN** a single invocation sends both `command_executed` and `command_completed`
- **THEN** both events carry the same `session_id`

#### Scenario: No message content
- **WHEN** a command fails with the message `Change "acme-billing-rewrite" not found`
- **THEN** the event carries `error_class: "item_not_found"` and no part of the message

### Requirement: Bounded error classification
The system SHALL classify a failure into an `error_class` drawn from a compile-time allowlist. A failure whose class cannot be determined SHALL be recorded as `other`.

Where a failure carries a diagnostic `code` (as `StoreError` and `RootSelectionError` do), the system SHALL map that code through the allowlist and SHALL NOT send the code through unchecked, because a diagnostic code is not guaranteed to be free of user-authored text.

The allowlist SHALL cover at minimum: `none`, `no_project`, `item_not_found`, `ambiguous_item`, `unknown_subcommand`, `validation_failed`, `archive_blocked`, `store_error`, `schema_invalid`, `parse_error`, `metadata_invalid`, `prompt_non_interactive`, `cancelled`, `permission_denied`, `network_error`, `already_exists`, `other`.

#### Scenario: Known diagnostic code
- **WHEN** a command fails with diagnostic code `unknown_item`
- **THEN** the event carries the mapped `error_class: "item_not_found"`

#### Scenario: Unrecognized diagnostic code
- **WHEN** a command fails with a diagnostic code that is not in the allowlist
- **THEN** the event carries `error_class: "other"`
- **AND** the raw code is not sent

#### Scenario: Unclassified error
- **WHEN** a command fails with a plain `Error` carrying no diagnostic
- **THEN** the event carries `error_class: "other"`

### Requirement: Outcome coverage across exit paths
Every command exit path that a user can reach SHALL produce exactly one `command_completed` event before the process exits.

A command that fails SHALL set `process.exitCode` and return rather than calling `process.exit()`, so that commander's `postAction` hook runs. Where a call site genuinely cannot return, it SHALL flush telemetry explicitly before exiting.

#### Scenario: Failing command reaches the completion hook
- **WHEN** a command fails
- **THEN** the process does not call `process.exit()` before the `postAction` hook has run
- **AND** exactly one `command_completed` event is sent

#### Scenario: Exit code preserved
- **WHEN** a failing command sets `process.exitCode` instead of calling `process.exit()`
- **THEN** the process still exits with the same code it exited with before this change

#### Scenario: Unavoidable early exit
- **WHEN** a call site must call `process.exit()` and cannot return
- **THEN** it awaits the telemetry flush before exiting

#### Scenario: No duplicate events
- **WHEN** a command both sets an exit code and returns normally
- **THEN** exactly one `command_completed` event is sent for that invocation

### Requirement: Session correlation identifier
The system SHALL generate a random UUID per CLI invocation and include it as `session_id` on every event from that invocation. The `session_id` SHALL NOT be persisted to disk and SHALL NOT be derived from the anonymous id, the process id, the working directory, or the clock.

#### Scenario: Same id across one invocation's events
- **WHEN** one invocation sends multiple events
- **THEN** every event carries the same `session_id`

#### Scenario: Different id across invocations
- **WHEN** the same user runs two commands in sequence
- **THEN** the two invocations carry different `session_id` values
- **AND** both carry the same `anonymousId` as `distinct_id`

#### Scenario: Not persisted
- **WHEN** an invocation ends
- **THEN** no `session_id` is written to the global config file

### Requirement: Bounded run context
The system SHALL attach run context to `command_completed`. Every context property SHALL satisfy the bounded property contract.

The context SHALL be limited to: `platform` (`darwin`, `linux`, `win32`, `other`), `node_major` (integer), `install_kind` (`global`, `npx`, `source`, `other`), `stdout_tty` (boolean), `json_mode` (boolean), `profile`, `delivery`, `tools` (ids checked against the `AI_TOOLS` registry), `workflows_installed` (bucket), `schema_source` (`package`, `project`, `user`), `schema_is_default` (boolean), `store_in_use` (boolean), `changes` (bucket), `specs` (bucket), and `first_run` (boolean).

Count buckets SHALL use the fixed labels `0`, `1-3`, `4-10`, `11-30`, `31+`.

Collecting run context SHALL NOT add filesystem traversal beyond a single non-recursive directory read per counted collection. Any context value that cannot be read cheaply or throws SHALL be omitted, and the event SHALL still be sent.

#### Scenario: Context collection failure
- **WHEN** reading the changes directory throws
- **THEN** the `changes` property is omitted
- **AND** the `command_completed` event is still sent with its remaining properties

#### Scenario: Store in use
- **WHEN** a command resolves its root through a registered store
- **THEN** the event carries `store_in_use: true`
- **AND** carries no store id, remote, branch, or path

#### Scenario: Agent-driven run
- **WHEN** a command is run with `--json` and stdout is not a terminal
- **THEN** the event carries `json_mode: true` and `stdout_tty: false`

#### Scenario: No traversal for counts
- **WHEN** the system counts active changes
- **THEN** it performs a single non-recursive directory read and discards the entry names, keeping only the bucketed count

### Requirement: Activation milestone events
The system SHALL send a `milestone_reached` event the first time a user completes each of `init`, `propose`, `apply`, and `archive` successfully, carrying `milestone`, `session_id`, and `days_since_install` as a bucket label.

A milestone SHALL be recorded at most once per anonymous id. The set of milestones already reached SHALL be persisted in the global config under the telemetry section.

`days_since_install` SHALL use the fixed labels `0`, `1`, `2-7`, `8-30`, `31+`, computed from a date recorded when the anonymous id is first generated.

#### Scenario: First successful archive
- **WHEN** a user archives a change successfully for the first time
- **THEN** the system sends `milestone_reached` with `milestone: "archive"`

#### Scenario: Subsequent archive
- **WHEN** the same user archives another change later
- **THEN** no further `archive` milestone event is sent

#### Scenario: Failed command reaches no milestone
- **WHEN** a command fails
- **THEN** no milestone is recorded for it

#### Scenario: Milestones respect opt-out
- **WHEN** telemetry is disabled
- **THEN** no milestone is sent and no milestone state is written to config

### Requirement: Local telemetry inspection
The system SHALL print every event it would send to stderr and send nothing when `OPENSPEC_TELEMETRY_DEBUG` is set to `1`. The printed form SHALL be the exact payload, so a user can verify what is collected without trusting the documentation.

#### Scenario: Debug mode prints and does not send
- **WHEN** `OPENSPEC_TELEMETRY_DEBUG=1` is set
- **THEN** each event payload is printed to stderr
- **AND** no network request is made

#### Scenario: Debug mode does not pollute stdout
- **WHEN** `OPENSPEC_TELEMETRY_DEBUG=1` is set and a command runs with `--json`
- **THEN** stdout still contains exactly one valid JSON document

#### Scenario: Debug mode respects opt-out
- **WHEN** `OPENSPEC_TELEMETRY_DEBUG=1` is set and telemetry is disabled
- **THEN** nothing is printed and nothing is sent

### Requirement: Public disclosure parity
The public telemetry disclosure SHALL enumerate every property the system sends. A change that adds, removes, or renames a property SHALL update the disclosure in the same change.

The disclosure lives in `README.md`, `SECURITY.md`, and the environment-variable reference. Each SHALL state the full property list, the opt-out mechanisms, and `OPENSPEC_TELEMETRY_DEBUG=1` as the way to verify the list locally.

#### Scenario: Disclosure matches the code
- **WHEN** the event property allowlist changes
- **THEN** the disclosure documents are updated in the same change

#### Scenario: Disclosure names the verification path
- **WHEN** a user reads the telemetry disclosure
- **THEN** it tells them how to print the events locally rather than asking them to take the list on trust

## MODIFIED Requirements

### Requirement: Privacy-preserving event design
The system SHALL NOT include command arguments, file paths, project names, spec content, error messages, or IP addresses in telemetry events.

The system SHALL additionally exclude: change ids, spec ids, schema ids, artifact ids, store ids, store remotes, store branches, store local paths, `defaultStore`, `featureFlags` keys, `openers` content, environment variable values, hostnames, usernames, and git remotes.

Every property SHALL satisfy the bounded property contract.

#### Scenario: Command with arguments
- **WHEN** a user runs `openspec init my-project --force`
- **THEN** the telemetry event contains only allowlisted properties and no argument values

#### Scenario: IP address exclusion
- **WHEN** the system sends a telemetry event
- **THEN** the event explicitly sets `$ip: null` to prevent IP tracking

#### Scenario: Named item in a command
- **WHEN** a user runs `openspec archive acme-billing-rewrite`
- **THEN** no event property contains `acme-billing-rewrite`

#### Scenario: Store-backed run
- **WHEN** a command runs against a store whose remote is a private git URL
- **THEN** no event property contains the store id, the remote, or any path

### Requirement: Command execution tracking
The system SHALL send a `command_executed` event to PostHog when any CLI command executes, including the command name, OpenSpec version, surface, and `session_id` as properties.

#### Scenario: Standard command execution
- **WHEN** a user runs any openspec command
- **THEN** the system sends a `command_executed` event with `command`, `version`, `surface`, and `session_id` properties

#### Scenario: Subcommand execution
- **WHEN** a user runs a nested command like `openspec change apply`
- **THEN** the system sends a `command_executed` event with the full command path (e.g., `change:apply`)
