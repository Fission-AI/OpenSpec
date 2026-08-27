# telemetry Specification

## Purpose

This spec defines how OpenSpec collects anonymous usage telemetry to help improve the tool. It governs the `src/telemetry/` module, which handles PostHog integration, privacy-preserving event design, user opt-out mechanisms, and first-run notice display. The spec ensures telemetry is minimal, transparent, and respects user privacy.

## Requirements

### Requirement: Command execution tracking
The system SHALL send a `command_executed` event to PostHog when any CLI command executes, including only the command name and OpenSpec version as properties.

#### Scenario: Standard command execution
- **WHEN** a user runs any openspec command
- **THEN** the system sends a `command_executed` event with `command` and `version` properties

#### Scenario: Subcommand execution
- **WHEN** a user runs a nested command like `openspec change apply`
- **THEN** the system sends a `command_executed` event with the full command path (e.g., `change:apply`)

### Requirement: Privacy-preserving event design
The system SHALL NOT include command arguments, file paths, project names, spec content, error messages, or IP addresses in telemetry events.

#### Scenario: Command with arguments
- **WHEN** a user runs `openspec init my-project --force`
- **THEN** the telemetry event contains only `command: "init"` and `version: "<version>"` without arguments

#### Scenario: IP address exclusion
- **WHEN** the system sends a telemetry event
- **THEN** the event explicitly sets `$ip: null` to prevent IP tracking

### Requirement: Environment variable opt-out
The system SHALL disable telemetry when `OPENSPEC_TELEMETRY=0` or `DO_NOT_TRACK=1` environment variables are set.

#### Scenario: OPENSPEC_TELEMETRY opt-out
- **WHEN** `OPENSPEC_TELEMETRY=0` is set in the environment
- **THEN** the system sends no telemetry events

#### Scenario: DO_NOT_TRACK opt-out
- **WHEN** `DO_NOT_TRACK=1` is set in the environment
- **THEN** the system sends no telemetry events

#### Scenario: Environment variable takes precedence
- **WHEN** the user has previously used the CLI (config exists)
- **AND** the user sets `OPENSPEC_TELEMETRY=0`
- **THEN** telemetry is disabled regardless of config state

### Requirement: CI environment auto-disable
The system SHALL automatically disable telemetry when `CI=true` environment variable is detected.

#### Scenario: CI environment detection
- **WHEN** `CI=true` is set in the environment
- **THEN** the system sends no telemetry events

#### Scenario: CI with explicit enable
- **WHEN** `CI=true` is set
- **AND** `OPENSPEC_TELEMETRY=1` is explicitly set
- **THEN** telemetry remains disabled (CI takes precedence for privacy)

### Requirement: First-run telemetry notice
The system SHALL display a one-line telemetry disclosure notice on the first command execution, before any telemetry is sent.

#### Scenario: First command execution
- **WHEN** a user runs their first openspec command
- **AND** telemetry is enabled
- **THEN** the system displays: "Note: OpenSpec collects anonymous usage stats. Opt out: OPENSPEC_TELEMETRY=0"

#### Scenario: Subsequent command execution
- **WHEN** a user has already seen the notice (noticeSeen: true in config)
- **THEN** the system does not display the notice

#### Scenario: Notice before telemetry
- **WHEN** displaying the first-run notice
- **THEN** the notice appears before any telemetry event is sent

### Requirement: Anonymous user identification
The system SHALL generate a random UUID as an anonymous identifier on first telemetry send, stored in global config.

#### Scenario: First telemetry event
- **WHEN** the first telemetry event is sent
- **AND** no anonymousId exists in config
- **THEN** the system generates a random UUID v4 and stores it in config

#### Scenario: Persistent identity
- **WHEN** a user runs multiple commands across sessions
- **THEN** the same anonymousId is used for all events

#### Scenario: Lazy generation with opt-out
- **WHEN** a user opts out before running any command
- **THEN** no anonymousId is ever generated or stored

### Requirement: Immediate event sending
The system SHALL send telemetry events immediately without batching, using `flushAt: 1` and `flushInterval: 0` configuration.

#### Scenario: Event transmission timing
- **WHEN** a command executes
- **THEN** the telemetry event is sent immediately, not queued for batch transmission

### Requirement: Graceful shutdown
The system SHALL call `posthog.shutdown()` before CLI exit to ensure pending events are flushed.

#### Scenario: Normal exit
- **WHEN** a command completes successfully
- **THEN** the system awaits `shutdown()` before exiting

#### Scenario: Error exit
- **WHEN** a command fails with an error
- **THEN** the system still awaits `shutdown()` before exiting

### Requirement: Silent failure handling
The system SHALL silently ignore telemetry failures without affecting CLI functionality.

#### Scenario: Network failure
- **WHEN** the telemetry request fails due to network error
- **THEN** the CLI command completes normally without error message

#### Scenario: PostHog outage
- **WHEN** PostHog service is unavailable
- **THEN** the CLI command completes normally without error message

#### Scenario: Shutdown failure
- **WHEN** `shutdown()` fails or times out
- **THEN** the CLI exits normally without error message
