## ADDED Requirements

### Requirement: Workspace Setup Commands
The CLI artifact workflow SHALL expose workspace setup commands before change creation.

#### Scenario: Preparing workspace planning before a change
- **WHEN** a user needs to prepare workspace planning across repos or folders
- **THEN** the CLI SHALL provide commands to set up, list, link, relink, and doctor workspaces
- **AND** those commands SHALL not require an active workspace change

#### Scenario: Listing workspaces with a short command
- **WHEN** a user wants a concise workspace list command
- **THEN** the CLI SHALL support `openspec workspace ls`
- **AND** it SHALL behave the same as `openspec workspace list`

#### Scenario: Keeping setup separate from agent launch
- **WHEN** a user completes workspace setup
- **THEN** the setup workflow SHALL leave agent launch and workspace open behavior to a later workflow
- **AND** setup SHALL not require a preferred agent choice

#### Scenario: Avoiding public direct creation
- **WHEN** users create a workspace in the first workspace setup flow
- **THEN** the CLI SHALL use `openspec workspace setup`
- **AND** it SHALL not expose `openspec workspace create` as the public creation path
