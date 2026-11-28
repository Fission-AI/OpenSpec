## ADDED Requirements

### Requirement: Ignore Apply lifecycle actions

The `/opsx:verify` skill and command SHALL ignore the `lifecycle` and `lifecycleError` fields of the `openspec instructions apply --json` response it reads for planning context. Verify SHALL NOT run Apply lifecycle actions.

#### Scenario: Apply read includes lifecycle actions

- **WHEN** Verify's apply read includes `lifecycle` or `lifecycleError`
- **THEN** Verify neither offers nor runs those actions and does not report the lifecycle error
- **AND** the verification report is unchanged by those fields
