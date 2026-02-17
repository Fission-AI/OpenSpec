## MODIFIED Requirements

### Requirement: Conditional command generation
The command generation system SHALL respect profile and delivery settings.

#### Scenario: Generate commands for profile workflows only
- **WHEN** generating commands with profile `core`
- **THEN** the system SHALL only generate commands for: `propose`, `explore`, `apply`, `archive`
- **THEN** the system SHALL NOT generate commands for workflows not in the profile

#### Scenario: Skip command generation when delivery is skills-only
- **WHEN** generating with delivery set to `skills`
- **THEN** the system SHALL NOT generate any command files
- **THEN** the system SHALL only generate skill files

#### Scenario: Generate commands when delivery is both or commands
- **WHEN** generating with delivery set to `both` or `commands`
- **THEN** the system SHALL generate command files for profile workflows

### Requirement: Include propose command template
The command generation system SHALL include the new `propose` workflow template.

#### Scenario: Propose command in templates
- **WHEN** getting command templates
- **THEN** the system SHALL include `propose` command template
- **THEN** the template SHALL generate command with id `propose`

### Requirement: Command file naming for propose
The propose command SHALL follow existing naming conventions.

#### Scenario: Propose command file path
- **WHEN** generating propose command for Claude Code
- **THEN** the file path SHALL be `.claude/commands/opsx/propose.md`
