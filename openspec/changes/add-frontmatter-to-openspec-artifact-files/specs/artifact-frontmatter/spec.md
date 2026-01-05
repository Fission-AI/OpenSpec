## ADDED Requirements

### Requirement: Frontmatter Schema
The system SHALL define a frontmatter schema for artifact files with an `artifact` field.

#### Scenario: Valid frontmatter format
- **WHEN** an artifact file contains YAML frontmatter delimited by `---`
- **AND** the frontmatter includes `artifact: <type>` field
- **THEN** the frontmatter is considered valid

#### Scenario: Artifact type values
- **WHEN** parsing frontmatter
- **THEN** valid `artifact` values are: `proposal`, `design`, `specs`, `tasks`

### Requirement: Frontmatter Parsing
The system SHALL parse YAML frontmatter from markdown files using `gray-matter`.

#### Scenario: Parse file with frontmatter
- **WHEN** `parseFrontmatter(content)` is called on content with frontmatter
- **THEN** the system returns an object with `data` (parsed YAML) and `content` (markdown body)

#### Scenario: Parse file without frontmatter
- **WHEN** `parseFrontmatter(content)` is called on content without frontmatter
- **THEN** the system returns empty `data` object and full content as body

#### Scenario: Malformed frontmatter
- **WHEN** frontmatter contains invalid YAML
- **THEN** the system throws a descriptive error

### Requirement: Template Frontmatter
The system SHALL include frontmatter in artifact templates.

#### Scenario: Proposal template frontmatter
- **WHEN** the proposal template is loaded
- **THEN** it begins with `---\nartifact: proposal\n---`

#### Scenario: Design template frontmatter
- **WHEN** the design template is loaded
- **THEN** it begins with `---\nartifact: design\n---`

#### Scenario: Spec template frontmatter
- **WHEN** the spec template is loaded
- **THEN** it begins with `---\nartifact: specs\n---`

#### Scenario: Tasks template frontmatter
- **WHEN** the tasks template is loaded
- **THEN** it begins with `---\nartifact: tasks\n---`

### Requirement: Backward Compatibility
The system SHALL treat frontmatter as optional for artifact detection.

#### Scenario: Artifact file without frontmatter
- **WHEN** an artifact file exists without frontmatter
- **THEN** the artifact is still detected as complete based on file existence

#### Scenario: Artifact file with frontmatter
- **WHEN** an artifact file exists with frontmatter
- **THEN** the artifact is detected as complete based on file existence
