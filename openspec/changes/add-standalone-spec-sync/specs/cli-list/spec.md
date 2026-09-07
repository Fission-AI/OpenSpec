## ADDED Requirements

### Requirement: Lifecycle Status Filtering
The command SHALL be able to filter changes by their declared lifecycle state, and
SHALL surface that state without changing the output of a project that has never
declared one.

#### Scenario: Filtering by state
- **WHEN** `openspec list --status shipped` is executed
- **THEN** only changes declaring `status: shipped` SHALL be listed
- **AND** `--status proposed` SHALL list every change that declares `proposed` or
  declares no status at all

#### Scenario: An unknown state is rejected
- **WHEN** `--status` is given a value other than `proposed` or `shipped`
- **THEN** the command SHALL exit 1 naming the accepted values
- **AND** SHALL NOT list every change as though the filter matched nothing

#### Scenario: No lifecycle output without a declaration
- **WHEN** no change in the root declares a `status`
- **THEN** the human listing SHALL render no lifecycle column
- **AND** the JSON output SHALL carry no lifecycle key

#### Scenario: The lifecycle appears once any change declares one
- **WHEN** at least one change declares a `status`
- **THEN** the human listing SHALL render a lifecycle column, showing `proposed`
  for changes that declare nothing
- **AND** the JSON output SHALL carry a `lifecycle` key for the declaring changes
  only, leaving the existing `status` key meaning task progress
