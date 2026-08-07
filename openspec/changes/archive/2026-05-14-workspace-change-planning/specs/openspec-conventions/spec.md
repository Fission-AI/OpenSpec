## ADDED Requirements

### Requirement: Workspace planning vocabulary
OpenSpec conventions SHALL distinguish workspace planning concepts using user-facing product language.

#### Scenario: Naming affected areas
- **WHEN** documentation or generated guidance refers to repos, folders, packages, services, apps, or docs sites touched by a workspace change
- **THEN** it SHALL call them affected areas
- **AND** it SHALL avoid using "target repo" or "repo slice" as the primary user-facing term

#### Scenario: Naming delivery slices
- **WHEN** documentation or generated guidance refers to delivery increments inside a larger change
- **THEN** it SHALL call them slices or phases only when delivery sequencing is the subject
- **AND** it SHALL not use slice as a synonym for repo, folder, or affected area

### Requirement: Workspace planning and implementation boundary
OpenSpec conventions SHALL distinguish workspace-level planning from repo-local implementation ownership.

#### Scenario: Workspace as shared planning home
- **WHEN** a change spans linked repos or folders
- **THEN** conventions SHALL describe the workspace as the shared planning home
- **AND** repo-local implementation homes SHALL retain ownership of their code and canonical behavior

#### Scenario: Avoiding materialization-first language
- **WHEN** documentation explains workspace change creation
- **THEN** it SHALL describe the user outcome in terms of shared planning and affected areas
- **AND** it SHALL avoid making users understand implementation terms such as materialization before they can plan

#### Scenario: Preserving familiar workflow verbs
- **WHEN** workspace guidance describes OpenSpec workflows
- **THEN** it SHALL keep the familiar verbs explore, propose, apply, verify, and archive
- **AND** it SHALL explain that workspace context changes paths, scope, and allowed edit roots rather than creating a separate workflow family
