## ADDED Requirements

### Requirement: Local Archive Date

The archive command SHALL derive the `YYYY-MM-DD` prefix of a new archive target from the calendar date in the effective local time zone of the Node.js process executing the CLI.

#### Scenario: Archive crosses a UTC date boundary

- **GIVEN** the CLI process's effective local time zone is `Asia/Shanghai`
- **AND** the current instant is `2026-07-14T16:30:00.000Z`
- **WHEN** the user archives a change named `add-auth`
- **THEN** the target archive name begins with `2026-07-15-add-auth`

#### Scenario: Non-interactive archive uses the local date

- **WHEN** an automation invokes `openspec archive <change-name> --yes`
- **THEN** the target archive name uses the CLI process's effective local calendar date
