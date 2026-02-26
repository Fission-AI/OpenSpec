# context-injection Specification

## Purpose
Define how project context from `openspec/config.yaml` is injected into workflow instructions while preserving source text and formatting.

## Requirements
### Requirement: Inject context into all artifact instructions

The system SHALL inject the context field from project config into instructions for all artifacts, wrapped in XML-style `<context>` tags.

#### Scenario: Config has context field
- **WHEN** config contains `context: "Tech stack: TypeScript, React"`
- **THEN** instruction output includes `<context>\nTech stack: TypeScript, React\n</context>`

#### Scenario: Config has no context field
- **WHEN** config omits the context field or context is undefined
- **THEN** instruction output does not include `<context>` tags

#### Scenario: Context is multi-line string
- **WHEN** config contains context with multiple lines
- **THEN** instruction output preserves line breaks within `<context>` tags

#### Scenario: Context applied to all artifacts
- **WHEN** instructions are loaded for any artifact (proposal, specs, design, tasks)
- **THEN** context section appears in all instruction outputs

### Requirement: Format context with XML-style tags

The system SHALL wrap context content in `<context>` opening and `</context>` closing tags with content on separate lines.

#### Scenario: Context tag structure
- **WHEN** context is injected into instructions
- **THEN** format is exactly `<context>\n{content}\n</context>\n\n`

#### Scenario: Context appears before template
- **WHEN** instructions are generated with context
- **THEN** `<context>` section appears before the `<template>` section

### Requirement: Preserve context content exactly as provided

The system SHALL inject context content without modification, escaping, or interpretation.

#### Scenario: Context contains special characters
- **WHEN** context includes characters like `<`, `>`, `&`, quotes
- **THEN** characters are preserved exactly as written in the config

#### Scenario: Context contains URLs
- **WHEN** context includes URLs like "docs at https://example.com"
- **THEN** URLs are preserved exactly in the injected content

#### Scenario: Context contains Markdown
- **WHEN** context includes Markdown formatting like `**bold**` or `[links](url)`
- **THEN** Markdown is preserved without rendering or escaping
