# Capability: Machine Readable Output

## Purpose

Allow automated tools and AI agents to consume OpenSpec CLI output without stream corruption from UI elements.

## Requirements

### 1. Spinner Suppression
The `ora` spinner must not be started if the `--json` flag is provided.

#### Scenario: Status with JSON
- **Given** an OpenSpec project with active changes
- **When** running `openspec status --change my-change --json`
- **Then** the `stdout` contains only the JSON object
- **And** no spinner characters are present in the output stream

### 2. Telemetry Notice Suppression
The "Note: OpenSpec collects anonymous usage stats" message must not be printed if the `--json` flag is provided.

#### Scenario: First run with JSON
- **Given** a new environment where the telemetry notice hasn't been shown
- **When** running `openspec list --json`
- **Then** the telemetry notice is NOT printed to stdout
- **And** only the JSON change list is printed

### 3. Error Handling
Errors should be printed to `stderr` and not pollute the `stdout` JSON stream.

#### Scenario: Command failure with JSON
- **Given** an invalid change name
- **When** running `openspec status --change invalid --json`
- **Then** the exit code is non-zero
- **And** the error message is printed to `stderr`
