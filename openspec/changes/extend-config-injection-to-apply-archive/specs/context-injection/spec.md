## MODIFIED Requirements

### Requirement: Inject context into all artifact instructions

The system SHALL inject the context field from project config into instructions for all artifacts and workflow instruction surfaces, wrapped in XML-style `<project_context>` tags.

#### Scenario: Config has context field

- **WHEN** config contains `context: "Tech stack: TypeScript, React"`
- **THEN** instruction output includes `<project_context>\nTech stack: TypeScript, React\n</project_context>`

#### Scenario: Config has no context field

- **WHEN** config omits the context field or context is undefined
- **THEN** instruction output does not include `<project_context>` tags

#### Scenario: Context is multi-line string

- **WHEN** config contains context with multiple lines
- **THEN** instruction output preserves line breaks within `<project_context>` tags

#### Scenario: Context applied to all artifacts

- **WHEN** instructions are loaded for any artifact (proposal, specs, design, tasks)
- **THEN** context section appears in all instruction outputs

#### Scenario: Context applied to apply instruction surface

- **WHEN** user runs `openspec instructions apply --change <id>`
- **AND** config contains a `context` field
- **THEN** apply instruction output includes the context in a `<project_context>` section

#### Scenario: Context applied to archive instruction surface

- **WHEN** user runs `openspec instructions archive`
- **AND** config contains a `context` field
- **THEN** archive instruction output includes the context in a `<project_context>` section
