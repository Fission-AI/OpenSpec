## MODIFIED Requirements
### Requirement: Safety Checks
The command SHALL perform safety checks to prevent overwriting existing structures and ensure proper permissions.

#### Scenario: Detecting existing initialization
- **WHEN** the `pastelsdd/` directory already exists
- **THEN** inform the user that Pastelsdd is already initialized, skip recreating the base structure, and enter an extend mode
- **AND** continue to the AI tool selection step so additional tools can be configured
- **AND** display the existing-initialization error message only when the user declines to add any AI tools

### Requirement: Interactive Mode
The command SHALL provide an interactive menu for AI tool selection with clear navigation instructions.

#### Scenario: Displaying interactive menu
- **WHEN** run in fresh or extend mode
- **THEN** present a looping select menu that lets users toggle tools with Enter and finish via a "Done" option
- **AND** label already configured tools with "(already configured)" while keeping disabled options marked "coming soon"
- **AND** change the prompt copy in extend mode to "Which AI tools would you like to add or refresh?"
- **AND** display inline instructions clarifying that Enter toggles a tool and selecting "Done" confirms the list

## ADDED Requirements
### Requirement: Additional AI Tool Initialization
`pastelsdd init` SHALL allow users to add configuration files for new AI coding assistants after the initial setup.

#### Scenario: Configuring an extra tool after initial setup
- **GIVEN** an `pastelsdd/` directory already exists and at least one AI tool file is present
- **WHEN** the user runs `pastelsdd init` and selects a different supported AI tool
- **THEN** generate that tool's configuration files with Pastelsdd markers the same way as during first-time initialization
- **AND** leave existing tool configuration files unchanged except for managed sections that need refreshing
- **AND** exit with code 0 and display a success summary highlighting the newly added tool files

### Requirement: Success Output Enhancements
`pastelsdd init` SHALL summarize tool actions when initialization or extend mode completes.

#### Scenario: Showing tool summary
- **WHEN** the command completes successfully
- **THEN** display a categorized summary of tools that were created, refreshed, or skipped (including already-configured skips)
- **AND** personalize the "Next steps" header using the names of the selected tools, defaulting to a generic label when none remain

### Requirement: Exit Code Adjustments
`pastelsdd init` SHALL treat extend mode with no selected tools as a guarded error.

#### Scenario: Preventing empty extend runs
- **WHEN** Pastelsdd is already initialized and the user selects no additional tools
- **THEN** exit with code 1 after showing the existing-initialization guidance message
