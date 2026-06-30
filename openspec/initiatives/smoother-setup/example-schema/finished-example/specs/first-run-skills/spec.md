# First-run skills

## ADDED Requirements

### Requirement: Small default skill set

The system SHALL install a small default set of skills on first run.

#### Scenario: New project is set up

- **WHEN** a user runs init on a new project
- **THEN** only the default skill set is installed

### Requirement: Full set available on request

The system SHALL let users install the full skill set when they choose to.

#### Scenario: User asks for the full set

- **WHEN** a user opts into the full set
- **THEN** all skills are installed
