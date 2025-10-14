# Delta for CLI Init Specification

## ADDED Requirements
### Requirement: Non-Interactive Mode
The command SHALL support non-interactive operation through command-line options for automation and CI/CD use cases.

#### Scenario: Select all tools non-interactively
- **WHEN** run with `--tools all`
- **THEN** automatically select every available AI tool without prompting
- **AND** proceed with initialization using the selected tools

#### Scenario: Select specific tools non-interactively
- **WHEN** run with `--tools claude,cursor`
- **THEN** parse the comma-separated tool IDs and validate against available tools
- **AND** proceed with initialization using only the specified valid tools

#### Scenario: Skip tool configuration non-interactively
- **WHEN** run with `--tools none`
- **THEN** skip AI tool configuration entirely
- **AND** only create the OpenSpec directory structure and template files

#### Scenario: Invalid tool specification
- **WHEN** run with `--tools` containing any IDs not present in the AI tool registry
- **THEN** exit with code 1 and display available values (`all`, `none`, or the supported tool IDs)

#### Scenario: Help text lists available tool IDs
- **WHEN** displaying CLI help for `openspec init`
- **THEN** show the `--tools` option description with the valid values derived from the AI tool registry

## MODIFIED Requirements
### Requirement: Interactive Mode
The command SHALL provide an interactive menu for AI tool selection with clear navigation instructions.

#### Scenario: Displaying interactive menu
- **WHEN** run in fresh or extend mode without non-interactive options
- **THEN** present a looping select menu that lets users toggle tools with Enter and finish via a "Done" option
- **AND** label already configured tools with "(already configured)" while keeping disabled options marked "coming soon"
- **AND** change the prompt copy in extend mode to "Which AI tools would you like to add or refresh?"
- **AND** display inline instructions clarifying that Enter toggles a tool and selecting "Done" confirms the list
