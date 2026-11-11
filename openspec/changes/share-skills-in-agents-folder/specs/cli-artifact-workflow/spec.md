## MODIFIED Requirements

### Requirement: Tool selection flag

The `artifact-experimental-setup` command SHALL accept a `--tool <tool-id>` flag to specify the target AI tool.

#### Scenario: Specify tool via flag

- **WHEN** user runs `openspec artifact-experimental-setup --tool cursor`
- **THEN** skill files are generated in the shared `.agents/skills/` folder
- **AND** no command files are generated

#### Scenario: Missing tool flag

- **WHEN** user runs `openspec artifact-experimental-setup` without `--tool`
- **THEN** the system displays an error requiring the `--tool` flag
- **AND** lists valid tool IDs in the error message

#### Scenario: Unknown tool ID

- **WHEN** user runs `openspec artifact-experimental-setup --tool unknown-tool`
- **AND** the tool ID is not in `AI_TOOLS`
- **THEN** the system displays an error listing valid tool IDs

#### Scenario: Tool without skillsDir

- **WHEN** user specifies a tool that has no `skillsDir` configured
- **THEN** the system displays an error indicating skill generation is not supported for that tool

#### Scenario: Tool without command adapter

- **WHEN** user specifies a tool that has `skillsDir` but no command adapter registered
- **THEN** skill files are generated successfully
- **AND** no message about commands is shown, since no tool gets command files

### Requirement: Output messaging

The `openspec init` command SHALL display clear output about what was generated and what it removed.

#### Scenario: Show target tool in output

- **WHEN** initialization creates or refreshes a tool configuration
- **THEN** output includes the tool name under `Created:` or `Refreshed:`, respectively

#### Scenario: Show generated paths

- **WHEN** initialization generates skills
- **THEN** output summarizes their count and destination folders, naming each tool folder that links to the shared copy

#### Scenario: Show removed command files

- **WHEN** initialization removes command files an earlier version generated
- **THEN** output includes `Removed: <n> command file(s) (OpenSpec 2.0 installs skills only)`
- **AND** any command file it kept because it differs from what OpenSpec generated is listed

#### Scenario: Show skipped commands message

- **WHEN** initialization runs for any tool, with or without a command adapter
- **THEN** output includes no "Commands skipped" message, since no tool gets command files
