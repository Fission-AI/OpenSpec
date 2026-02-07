## MODIFIED Requirements

### Requirement: Agent Instruction File References
The AGENTS.md template (inside lightspec) and slash command templates SHALL NOT reference `lightspec/project.md`.

#### Scenario: AGENTS.md context checklist
- **WHEN** AGENTS.md is generated or updated
- **THEN** the "Before Any Task" context checklist does NOT include "Read lightspec/project.md for conventions"

#### Scenario: Workflow instructions
- **WHEN** AGENTS.md workflow instructions are rendered
- **THEN** they do NOT include "Review lightspec/project.md" in any step

#### Scenario: Proposal slash command
- **WHEN** `/lightspec:proposal` skill is invoked
- **THEN** the instructions do NOT reference `lightspec/project.md` in the review step

#### Scenario: Apply slash command
- **WHEN** `/lightspec:apply` skill is invoked
- **THEN** the instructions do NOT reference `lightspec/project.md` for context

### Requirement: Directory Structure Documentation
The AGENTS.md template SHALL accurately represent the lightspec directory structure without project.md.

#### Scenario: Directory structure diagram
- **WHEN** AGENTS.md is generated
- **THEN** the directory structure section does NOT list `project.md` under `lightspec/`

### Requirement: Error Recovery Guidance
The AGENTS.md template SHALL provide context troubleshooting guidance without referencing project.md.

#### Scenario: Missing context error recovery
- **WHEN** "Missing Context" error recovery section is shown
- **THEN** it does NOT include "Read project.md first" as a step
- **AND** it MAY suggest running `/lightspec:context-check` instead
