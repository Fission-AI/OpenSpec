# workspace-change-planning Specification

## Purpose
Define how OpenSpec creates, tracks, and guides workspace-level changes whose planning artifacts coordinate multiple linked repos or folders before implementation ownership is finalized.

## Requirements
### Requirement: Workspace change planning home
OpenSpec SHALL support workspace-level changes whose shared plan lives in the workspace planning home.

#### Scenario: Creating a workspace change
- **GIVEN** the command runs from an OpenSpec workspace
- **WHEN** the user creates a change for workspace planning
- **THEN** OpenSpec SHALL create the change under the workspace planning path
- **AND** it SHALL treat the workspace as the planning home for that change
- **AND** it SHALL use the workspace planning schema when no explicit schema is provided

#### Scenario: Workspace planning artifact structure
- **GIVEN** a workspace change uses the workspace planning schema
- **WHEN** OpenSpec reports or creates planning artifacts for that change
- **THEN** it SHALL use workspace-level artifacts for proposal, specs, cross-area design, and coordination tasks
- **AND** those artifacts SHALL live under the workspace change root
- **AND** it SHALL not require an additional area manifest outside those normal planning artifacts

#### Scenario: Capturing the shared goal once
- **WHEN** a workspace change is proposed
- **THEN** OpenSpec SHALL capture the product goal at the workspace change level
- **AND** it SHALL avoid requiring separate repo-local proposals before the affected areas are understood

#### Scenario: Preserving linked repos during change creation
- **WHEN** OpenSpec creates a workspace-level change
- **THEN** it SHALL not create repo-local OpenSpec change directories inside linked repos or folders
- **AND** it SHALL not edit implementation files in linked repos or folders

### Requirement: Workspace affected areas
OpenSpec SHALL represent ownership or implementation boundaries in a workspace change as affected areas.

#### Scenario: Using registered workspace links as areas
- **GIVEN** a workspace has linked repos or folders
- **WHEN** a workspace change identifies affected areas by registered link name
- **THEN** OpenSpec SHALL validate those area names against the workspace links
- **AND** it SHALL report invalid area names clearly

#### Scenario: Planning before all areas are known
- **WHEN** a user is still exploring a workspace change
- **THEN** OpenSpec SHALL allow the shared plan to exist before all affected areas are finalized
- **AND** it SHALL keep unresolved affected area questions visible in the normal planning artifacts and status output

#### Scenario: Organizing requirements by area
- **GIVEN** a workspace change has requirements owned by one or more affected areas
- **WHEN** OpenSpec reports or creates workspace-scoped specs
- **THEN** it SHALL allow area-specific requirements to be organized under `specs/<area-or-repo>/<capability>/spec.md`
- **AND** it SHALL not require separate area folders outside the normal `specs/` artifact tree
- **AND** it SHALL preserve the area-or-repo path segment as workspace planning context rather than flattening it into a repo-local capability name

#### Scenario: Separating areas from delivery slices
- **WHEN** a workspace change reports affected areas
- **THEN** OpenSpec SHALL distinguish affected areas from delivery slices or phases
- **AND** it SHALL not require users to define delivery slices for a small cross-area change

### Requirement: Workspace planning source of truth
OpenSpec SHALL keep the workspace change plan as the source of truth until implementation begins for a selected affected area.

#### Scenario: Exploring before implementation
- **WHEN** an agent explores a workspace change
- **THEN** it SHALL use workspace-level planning artifacts as the shared planning source
- **AND** it SHALL treat linked repos and folders as available context rather than committed implementation targets

#### Scenario: Deferring repo-local implementation
- **WHEN** repo-local implementation work is needed for a workspace change
- **THEN** OpenSpec SHALL require an explicit implementation workflow with a selected affected area
- **AND** it SHALL expose the allowed edit root for that selected area before implementation edits begin
