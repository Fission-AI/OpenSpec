## Purpose

Skill generation SHALL create skill files for workflows based on profile and delivery settings, supporting both the streamlined core profile and custom user configurations.

## MODIFIED Requirements

### Requirement: Conditional skill generation
The skill generation system SHALL respect profile and delivery settings.

#### Scenario: Generate skills for profile workflows only
- **WHEN** generating skills with profile `core`
- **THEN** the system SHALL only generate skills for: `propose`, `explore`, `apply`, `archive`
- **THEN** the system SHALL NOT generate skills for workflows not in the profile

#### Scenario: Skip skill generation when delivery is commands-only
- **WHEN** generating with delivery set to `commands`
- **THEN** the system SHALL NOT generate any skill files

#### Scenario: Generate skills when delivery is both or skills
- **WHEN** generating with delivery set to `both` or `skills`
- **THEN** the system SHALL generate skill files for profile workflows

### Requirement: Include propose skill template
The skill generation system SHALL include the new `propose` workflow template.

#### Scenario: Propose skill in templates
- **WHEN** getting skill templates
- **THEN** the system SHALL include `openspec-propose` template
- **THEN** the template SHALL be in addition to templates listed in SKILL_NAMES constant

### Requirement: Skill names constant update
The `SKILL_NAMES` constant SHALL include the propose workflow.

#### Scenario: Updated skill names
- **WHEN** referencing `SKILL_NAMES` constant
- **THEN** it SHALL include `openspec-propose` in addition to existing names
