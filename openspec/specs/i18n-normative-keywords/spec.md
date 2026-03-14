# i18n-normative-keywords Specification

## Purpose

Define how OpenSpec supports language-specific normative keywords for requirement validation, allowing teams to write specs in their working language while maintaining structured validation.

## Requirements

### Requirement: Language-aware normative keyword validation

The system SHALL validate requirement text against a set of normative keywords determined by the project's configured language.

#### Scenario: English project (default)
- **WHEN** no `language` is configured in config.yaml (or `language: en`)
- **THEN** the validator SHALL accept requirements containing `MUST` or `SHALL`
- **AND** reject requirements that contain neither

#### Scenario: Spanish project
- **WHEN** `language: es` is configured in config.yaml
- **THEN** the validator SHALL accept requirements containing any of: `DEBE`, `DEBERA`, `DEBERÁ`
- **AND** reject requirements that contain none of these keywords

#### Scenario: Unknown language code
- **WHEN** config.yaml contains a `language` value not present in the keyword registry
- **THEN** the system SHALL log a warning listing available language codes
- **AND** fall back to English (`en`) keywords

### Requirement: Interchangeable keyword lists per language

Each supported language SHALL define a list of equivalent normative keywords that are accepted interchangeably by the validator.

#### Scenario: English equivalents
- **WHEN** language is `en`
- **THEN** `MUST` and `SHALL` are interchangeable — a requirement using either one SHALL pass validation

#### Scenario: Spanish equivalents
- **WHEN** language is `es`
- **THEN** `DEBE`, `DEBERA`, and `DEBERÁ` are interchangeable — a requirement using any one of them SHALL pass validation

#### Scenario: Keyword matching is case-sensitive and whole-word
- **WHEN** validating requirement text
- **THEN** keywords SHALL be matched as whole words (not substrings)
- **AND** matching SHALL be case-sensitive (e.g., `debe` does not match, only `DEBE`)

### Requirement: Unicode-safe word boundary matching

The keyword matching logic SHALL correctly handle keywords containing non-ASCII characters (e.g., accented letters) without relying on JavaScript's `\b` word boundary anchor.

#### Scenario: Keyword with accented character
- **GIVEN** the configured keyword is `DEBERÁ`
- **WHEN** validating the text `El sistema DEBERÁ emitir un token`
- **THEN** the keyword SHALL be matched correctly

#### Scenario: No false substring match with accented keywords
- **GIVEN** the configured keyword is `DEBE`
- **WHEN** validating the text `El sistema DEBERÁ emitir un token`
- **THEN** `DEBE` SHALL NOT match as a standalone keyword (it is a substring of `DEBERÁ`)

#### Scenario: Keyword at end of sentence
- **GIVEN** the configured keyword is `DEBERÁ`
- **WHEN** validating the text `El sistema DEBERÁ.`
- **THEN** the keyword SHALL be matched (punctuation is not a letter)

### Requirement: Validation messages reference configured keywords

Error messages for missing normative keywords SHALL display the keywords from the configured language, quoted for emphasis.

#### Scenario: English validation error message
- **WHEN** language is `en` and a requirement lacks normative keywords
- **THEN** the error message SHALL read: `Requirement must contain "MUST" or "SHALL" keyword`

#### Scenario: Spanish validation error message
- **WHEN** language is `es` and a requirement lacks normative keywords
- **THEN** the error message SHALL read: `Requirement must contain "DEBE", "DEBERA", or "DEBERÁ" keyword`

### Requirement: Keyword registry is a hardcoded constant

The mapping of language codes to normative keyword lists SHALL be defined as a TypeScript constant, not an external file.

#### Scenario: Registry structure
- **WHEN** the keyword registry is defined
- **THEN** it SHALL map ISO 639-1 language codes (e.g., `en`, `es`) to arrays of uppercase keyword strings
- **AND** the default export SHALL include at least `en` and `es`

#### Scenario: Adding a new language
- **WHEN** a contributor adds a new language to the registry
- **THEN** they add a single entry to the constant with the language code and keyword list
- **AND** no other code changes are required for the validator to accept the new language
