## Purpose

The propose workflow SHALL combine change creation and artifact generation into a single command, reducing friction for new users while teaching them the OpenSpec workflow through embedded guidance.

## ADDED Requirements

### Requirement: Propose workflow creation
The system SHALL provide a `propose` workflow that creates a change and generates all artifacts in one step.

#### Scenario: Basic propose invocation
- **WHEN** user invokes `/opsx:propose "add user authentication"`
- **THEN** the system SHALL create a change directory with kebab-case name
- **THEN** the system SHALL create `.openspec.yaml` in the change directory (via `openspec new change`)
- **THEN** the system SHALL generate all artifacts needed for implementation: proposal.md, design.md, specs/, tasks.md

#### Scenario: Propose with existing change name
- **WHEN** user invokes `/opsx:propose` with a name that already exists
- **THEN** the system SHALL ask if user wants to continue existing change or create new
- **THEN** if "continue": the system SHALL resume artifact generation from last completed state
- **THEN** if "create new": the system SHALL prompt for a new name
- **THEN** in non-interactive mode: the system SHALL fail with error suggesting to use a different name

### Requirement: Propose workflow onboarding UX
The `propose` workflow SHALL include explanatory output to help new users understand the process.

#### Scenario: First-time user guidance
- **WHEN** user invokes `/opsx:propose`
- **THEN** the system SHALL explain what artifacts will be created (proposal.md, design.md, specs/, tasks.md)
- **THEN** the system SHALL indicate next step (`/opsx:apply` to implement)

#### Scenario: Artifact creation progress
- **WHEN** the system creates each artifact
- **THEN** the system SHALL show progress (e.g., "✓ Created proposal.md")

### Requirement: Propose workflow combines new and ff
The `propose` workflow SHALL perform the same operations as running `new` followed by `ff`.

#### Scenario: Equivalent to new + ff
- **WHEN** user invokes `/opsx:propose "feature name"`
- **THEN** the result SHALL be functionally equivalent to invoking `/opsx:new "feature-name"` followed by `/opsx:ff feature-name`
- **THEN** the same directory structure and artifacts SHALL be created
- **THEN** console output MAY differ (propose includes onboarding explanations)
