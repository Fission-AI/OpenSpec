## ADDED Requirements

### Requirement: Agent File Detection
The context-check skill SHALL detect which agent instruction file exists at the project root.

#### Scenario: memory files (CLAUDE.md OR AGENTS.md) exist
- **WHEN** user runs `/lightspec:context-check` 
- **THEN** the skill validates context currently available by the agent without exploring additional files

#### Scenario: No agent file exists
- **WHEN** user runs `/lightspec:context-check` and neither CLAUDE.md nor AGENTS.md exist at project root
- **THEN** the skill reports an error with guidance to create one

### Requirement: Context Property Validation
The context-check skill SHALL validate required context properties in the detected agent file.

#### Scenario: All properties present
- **WHEN** agent file contains all required properties with meaningful content
- **THEN** the skill reports success with a summary of validated properties

#### Scenario: Missing properties
- **WHEN** agent file is missing one or more required properties
- **THEN** the skill lists which properties are missing and explains what each should contain

#### Scenario: Sub-optimal properties
- **WHEN** agent file has properties that are too brief or contain only placeholder text
- **THEN** the skill identifies which properties are sub-optimal and suggests improvements

### Requirement: Required Context Properties
The context-check skill SHALL validate the following required properties:
- Purpose (project goals and objectives)
- Domain Context (domain-specific knowledge)
- Tech Stack (technologies and frameworks)
- Project Non-Obvious Conventions (with all of these subsections: "Code Style", "Architecture Patterns", "Testing Strategy" - and optionally "Git Workflow")
- Important Constraints
- External Dependencies

#### Scenario: Checking property completeness
- **WHEN** a property section contains only placeholder text like `[...]` or `[Describe...]`
- **THEN** the skill classifies it as "missing"

#### Scenario: Checking property depth
- **WHEN** a property section has fewer than 20 words of content
- **THEN** the skill classifies it as "sub-optimal"

### Requirement: Exploration and Population Offer
The context-check skill SHALL offer to explore the codebase and populate missing context when validation finds issues.

#### Scenario: Offering exploration
- **WHEN** validation finds missing or sub-optimal properties
- **THEN** the skill asks "Would you like me to explore your codebase to gather this context and propose updates to [filename]?" (filename being CLAUDE.md or AGENTS.md depending on which exists)

#### Scenario: User accepts exploration
- **WHEN** user confirms the exploration offer
- **THEN** the skill explores the codebase, drafts content for missing properties, and presents it for review before writing

#### Scenario: User declines exploration
- **WHEN** user declines the exploration offer
- **THEN** the skill provides manual guidance on how to populate each missing property

### Requirement: Exploration Approach
The context-check skill SHALL explore the codebase systematically to gather context.

#### Scenario: Gathering tech stack
- **WHEN** exploring for Tech Stack property
- **THEN** the skill examines package.json, requirements.txt, go.mod, or similar dependency files

#### Scenario: Gathering architecture patterns
- **WHEN** exploring for Architecture Patterns property
- **THEN** the skill examines project structure, common patterns in code, and framework usage

#### Scenario: Gathering testing strategy
- **WHEN** exploring for Testing Strategy property
- **THEN** the skill examines test files, test frameworks, and testing conventions

### Requirement: Content Review Before Writing
The context-check skill SHALL present proposed content for user review before modifying the agent file.

#### Scenario: Presenting proposed updates
- **WHEN** exploration completes and content is drafted
- **THEN** the skill shows the proposed additions and asks for confirmation before writing

#### Scenario: User edits proposed content
- **WHEN** user requests changes to proposed content
- **THEN** the skill incorporates feedback and presents updated content

#### Scenario: Writing confirmed content
- **WHEN** user confirms proposed content
- **THEN** the skill writes or updates the relevant sections in the agent file
