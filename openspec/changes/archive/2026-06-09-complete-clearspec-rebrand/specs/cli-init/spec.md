## MODIFIED Requirements

### Requirement: Directory Creation

The command SHALL create the ClearSpec directory structure with config file.

#### Scenario: Creating ClearSpec structure

- **WHEN** `clearspec init` is executed
- **THEN** create the following directory structure:
```
clearspec/
├── config.yaml
├── specs/
└── changes/
    └── archive/
```

### Requirement: AI Tool Configuration

The command SHALL configure AI coding assistants with skills and slash commands using a searchable multi-select experience.

#### Scenario: Prompting for AI tool selection

- **WHEN** run interactively
- **THEN** display animated welcome screen with ClearSpec logo
- **AND** present a searchable multi-select that shows all available tools
- **AND** mark already configured tools with "(configured ✓)" indicator
- **AND** pre-select configured tools for easy refresh
- **AND** sort configured tools to appear first in the list
- **AND** allow filtering by typing to search

#### Scenario: Selecting tools to configure

- **WHEN** user selects tools and confirms
- **THEN** generate skills in `.<tool>/skills/` directory for each selected tool
- **AND** generate slash commands in `.<tool>/commands/clsx/` directory for each selected tool
- **AND** create `clearspec/config.yaml` with default schema setting

### Requirement: Safety Checks

The command SHALL perform safety checks to prevent overwriting existing structures and ensure proper permissions.

#### Scenario: Detecting existing initialization
- **WHEN** the `clearspec/` directory already exists
- **THEN** inform the user that ClearSpec is already initialized, skip recreating the base structure, and enter an extend mode
- **AND** continue to the AI tool selection step so additional tools can be configured
- **AND** display the existing-initialization error message only when the user declines to add any AI tools

### Requirement: Additional AI Tool Initialization
`clearspec init` SHALL allow users to add configuration files for new AI coding assistants after the initial setup.

#### Scenario: Configuring an extra tool after initial setup
- **GIVEN** a `clearspec/` directory already exists and at least one AI tool file is present
- **WHEN** the user runs `clearspec init` and selects a different supported AI tool
- **THEN** generate that tool's configuration files with ClearSpec markers the same way as during first-time initialization
- **AND** leave existing tool configuration files unchanged except for managed sections that need refreshing

### Requirement: Config File Generation

The command SHALL create a ClearSpec config file with schema settings.

#### Scenario: Creating config.yaml

- **WHEN** initialization completes
- **AND** config.yaml does not exist
- **THEN** create `clearspec/config.yaml` with default schema setting
- **AND** display config location in output

#### Scenario: Preserving existing config.yaml

- **WHEN** initialization runs in extend mode
- **AND** `clearspec/config.yaml` already exists
- **THEN** preserve the existing config file
- **AND** display "(exists)" indicator in output
