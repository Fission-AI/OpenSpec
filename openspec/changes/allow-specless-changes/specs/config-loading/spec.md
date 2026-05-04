## MODIFIED Requirements

### Requirement: Use resilient field-by-field parsing

The system SHALL parse each config field independently, collecting valid fields and warning about invalid ones without rejecting the entire config.

#### Scenario: Schema field is valid
- **WHEN** config contains `schema: "spec-driven"`
- **THEN** schema field is included in returned config

#### Scenario: Schema field is missing
- **WHEN** config lacks the `schema` field
- **THEN** no warning is logged (field is optional at parse level)

#### Scenario: Schema field is empty string
- **WHEN** config contains `schema: ""`
- **THEN** warning is logged and schema field is not included in returned config

#### Scenario: Schema field is invalid type
- **WHEN** config contains `schema: 123` (number instead of string)
- **THEN** warning is logged and schema field is not included in returned config

#### Scenario: Context field is valid
- **WHEN** config contains `context: "Tech stack: TypeScript"`
- **THEN** context field is included in returned config

#### Scenario: Context field is invalid type
- **WHEN** config contains `context: 123` (number instead of string)
- **THEN** warning is logged and context field is not included in returned config

#### Scenario: Rules field has valid structure
- **WHEN** config contains `rules: { proposal: ["Rule 1"], specs: ["Rule 2"] }`
- **THEN** rules field is included in returned config with valid rules

#### Scenario: Rules field has non-array value for artifact
- **WHEN** config contains `rules: { proposal: "not an array", specs: ["Valid"] }`
- **THEN** warning is logged for proposal, but specs rules are still included in returned config

#### Scenario: Rules array contains non-string elements
- **WHEN** config contains `rules: { proposal: ["Valid rule", 123, ""] }`
- **THEN** only "Valid rule" is included, warning logged about invalid elements

#### Scenario: Mix of valid and invalid fields
- **WHEN** config contains valid schema, invalid context type, valid rules
- **THEN** config is returned with schema and rules fields, warning logged about context

#### Scenario: requireSpecDeltas set to "error"
- **WHEN** config contains `requireSpecDeltas: "error"`
- **THEN** requireSpecDeltas SHALL be `"error"` in returned config

#### Scenario: requireSpecDeltas set to "warn"
- **WHEN** config contains `requireSpecDeltas: "warn"`
- **THEN** requireSpecDeltas SHALL be `"warn"` in returned config

#### Scenario: requireSpecDeltas set to false
- **WHEN** config contains `requireSpecDeltas: false`
- **THEN** requireSpecDeltas SHALL be `false` in returned config

#### Scenario: requireSpecDeltas omitted
- **WHEN** config does not contain a `requireSpecDeltas` key
- **THEN** requireSpecDeltas SHALL default to `undefined` in returned config (callers treat missing as `"error"`)

#### Scenario: requireSpecDeltas with invalid value
- **WHEN** config contains `requireSpecDeltas: "invalid"`
- **THEN** warning SHALL be logged and requireSpecDeltas SHALL not be included in returned config

#### Scenario: requireSpecDeltas with invalid type
- **WHEN** config contains `requireSpecDeltas: 123`
- **THEN** warning SHALL be logged and requireSpecDeltas SHALL not be included in returned config
