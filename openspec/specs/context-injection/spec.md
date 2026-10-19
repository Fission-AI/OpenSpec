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

### Requirement: Expose current context to operation instruction surfaces

The system SHALL expose project context to apply and archive instruction output by reading the current config from the selected planning root at execution time.

#### Scenario: Apply requests current context

- **WHEN** a user requests apply instructions and config contains project context
- **THEN** apply output includes that context as a structured optional field

#### Scenario: Archive requests current context

- **WHEN** a user requests archive instructions and config contains project context
- **THEN** archive output includes that context as a structured optional field

#### Scenario: Selected store supplies context

- **WHEN** apply or archive instructions target a selected store
- **THEN** context is read from that store's resolved config rather than the current repository config

#### Scenario: Context changes between operations

- **WHEN** project context changes after one instruction call
- **THEN** the next apply or archive instruction call receives the updated context

#### Scenario: Context is absent

- **WHEN** project config has no non-empty context
- **THEN** apply and archive structured outputs omit the context field

### Requirement: Consume operation context as required agent instruction

The system SHALL identify returned operation context as a required agent instruction input with the same prompt-level consumption expectation as the built-in instruction. Context supplies applicable project facts, conventions, and constraints without becoming output content or replacing CLI-controlled workflow state.

#### Scenario: Skill applies project context

- **WHEN** an apply or archive skill receives project context
- **THEN** the skill tells the agent to read and consider the context
- **AND** apply its relevant project facts, conventions, and constraints while performing the operation
- **AND** the workflow does not automatically insert the context into an output file

#### Scenario: Context conflicts with controlling workflow input

- **WHEN** project context conflicts with a built-in workflow step, explicit user choice, resolved path, CLI-controlled state, or command contract
- **THEN** the skill reports the conflict
- **AND** does not use context to replace or bypass the controlling workflow input
- **AND** does not claim that prompt text can enforce agent compliance
