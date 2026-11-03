# ai-tool-paths Delta Specification

## ADDED Requirements

### Requirement: Shared .agents skills target

OpenSpec SHALL provide a vendor-neutral `agents` tool target rooted at the shared `.agents` directory, for assistants that read skills from the shared location rather than a vendor-specific one.

#### Scenario: Shared agents target paths defined

- **WHEN** looking up the `agents` tool
- **THEN** `skillsDir` SHALL be `.agents`

#### Scenario: Detection keys off the shared skills subtree

- **WHEN** a project contains a `.agents/skills` path
- **THEN** OpenSpec SHALL detect `agents` as an available target

#### Scenario: A bare shared root does not select the target

- **GIVEN** a project contains `.agents` but no `.agents/skills` path
- **WHEN** OpenSpec detects available tools
- **THEN** `agents` SHALL NOT be reported as available
