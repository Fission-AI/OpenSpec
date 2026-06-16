## MODIFIED Requirements

### Requirement: Config Set
The config command SHALL set configuration values with automatic type coercion, including supported structured values for known structured config keys.

#### Scenario: Set string value
- **WHEN** user executes `openspec config set <key> <value>`
- **AND** value does not match boolean, number, or supported structured value patterns for that key
- **THEN** store value as a string
- **AND** display confirmation message

#### Scenario: Set boolean value
- **WHEN** user executes `openspec config set <key> true` or `openspec config set <key> false`
- **THEN** store value as boolean (not string)
- **AND** display confirmation message

#### Scenario: Set numeric value
- **WHEN** user executes `openspec config set <key> <value>`
- **AND** value is a valid number (integer or float)
- **THEN** store value as number (not string)

#### Scenario: Set workflows array value
- **WHEN** user executes `openspec config set workflows '["new","ff","apply","archive"]'`
- **THEN** store `workflows` as an array of strings
- **AND** subsequent `openspec config get workflows` output SHALL be valid JSON for that array
- **AND** display confirmation message

#### Scenario: Reject invalid workflows array value
- **WHEN** user executes `openspec config set workflows not-json`
- **THEN** display a descriptive schema validation error
- **AND** do not modify the config file
- **AND** exit with code 1

#### Scenario: Force string with --string flag
- **WHEN** user executes `openspec config set <key> <value> --string`
- **THEN** store value as string regardless of content
- **AND** this allows storing literal "true" or "123" as strings when allowed by the target config key

#### Scenario: Set nested key
- **WHEN** user executes `openspec config set featureFlags.newFlag true`
- **THEN** create intermediate objects if they don't exist
- **AND** set the value at the nested path
