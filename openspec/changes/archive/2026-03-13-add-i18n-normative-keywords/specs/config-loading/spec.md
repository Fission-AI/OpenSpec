# config-loading Delta

## ADDED Requirements

### Requirement: Parse language field from config

The system SHALL parse an optional `language` field from `openspec/config.yaml` as an ISO 639-1 language code string.

#### Scenario: Language field is valid
- **WHEN** config contains `language: "es"`
- **THEN** the language field is included in the returned ProjectConfig

#### Scenario: Language field is missing
- **WHEN** config lacks the `language` field
- **THEN** no warning is logged and language is not included in returned config (callers default to `en`)

#### Scenario: Language field is invalid type
- **WHEN** config contains `language: 123` (number instead of string)
- **THEN** warning is logged and language field is not included in returned config

#### Scenario: Language field is empty string
- **WHEN** config contains `language: ""`
- **THEN** warning is logged and language field is not included in returned config
