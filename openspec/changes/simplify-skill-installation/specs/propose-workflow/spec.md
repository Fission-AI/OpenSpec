## ADDED Requirements

### Requirement: Propose workflow creation
The system SHALL provide a `propose` workflow that creates a change and generates all artifacts in one step.

#### Scenario: Basic propose invocation
- **WHEN** user invokes `/opsx:propose "add user authentication"`
- **THEN** the system SHALL create a change directory with kebab-case name
- **THEN** the system SHALL generate all artifacts needed for implementation

#### Scenario: Propose with existing change name
- **WHEN** user invokes `/opsx:propose` with a name that already exists
- **THEN** the system SHALL ask if user wants to continue existing change or create new

### Requirement: Propose workflow onboarding UX
The `propose` workflow SHALL include explanatory output to help new users understand the process.

#### Scenario: First-time user guidance
- **WHEN** user invokes `/opsx:propose`
- **THEN** the system SHALL explain what artifacts will be created (proposal.md, design.md, tasks.md)
- **THEN** the system SHALL indicate next step (`/opsx:apply` to implement)

#### Scenario: Artifact creation progress
- **WHEN** the system creates each artifact
- **THEN** the system SHALL show progress (e.g., "✓ Created proposal.md")

### Requirement: Propose workflow combines new and ff
The `propose` workflow SHALL perform the same operations as running `new` followed by `ff`.

#### Scenario: Equivalent to new + ff
- **WHEN** user invokes `/opsx:propose "feature name"`
- **THEN** the result SHALL be identical to running `openspec new change "feature-name"` followed by `/opsx:ff feature-name`
