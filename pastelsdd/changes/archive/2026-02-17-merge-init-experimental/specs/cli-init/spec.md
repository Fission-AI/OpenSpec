## MODIFIED Requirements

### Requirement: Directory Creation

The command SHALL create the Pastelsdd directory structure with config file.

#### Scenario: Creating Pastelsdd structure

- **WHEN** `pastelsdd init` is executed
- **THEN** create the following directory structure:
```
pastelsdd/
├── config.yaml
├── specs/
└── changes/
    └── archive/
```

### Requirement: AI Tool Configuration

The command SHALL configure AI coding assistants with skills and slash commands using a searchable multi-select experience.

#### Scenario: Prompting for AI tool selection

- **WHEN** run interactively
- **THEN** display animated welcome screen with Pastelsdd logo
- **AND** present a searchable multi-select that shows all available tools
- **AND** mark already configured tools with "(configured ✓)" indicator
- **AND** pre-select configured tools for easy refresh
- **AND** sort configured tools to appear first in the list
- **AND** allow filtering by typing to search

#### Scenario: Selecting tools to configure

- **WHEN** user selects tools and confirms
- **THEN** generate skills in `.<tool>/skills/` directory for each selected tool
- **AND** generate slash commands in `.<tool>/commands/pastel/` directory for each selected tool
- **AND** create `pastelsdd/config.yaml` with default schema setting

### Requirement: Skill Generation

The command SHALL generate Agent Skills for selected AI tools.

#### Scenario: Generating skills for a tool

- **WHEN** a tool is selected during initialization
- **THEN** create 9 skill directories under `.<tool>/skills/`:
  - `pastelsdd-explore/SKILL.md`
  - `pastelsdd-new-change/SKILL.md`
  - `pastelsdd-continue-change/SKILL.md`
  - `pastelsdd-apply-change/SKILL.md`
  - `pastelsdd-ff-change/SKILL.md`
  - `pastelsdd-verify-change/SKILL.md`
  - `pastelsdd-sync-specs/SKILL.md`
  - `pastelsdd-archive-change/SKILL.md`
  - `pastelsdd-bulk-archive-change/SKILL.md`
- **AND** each SKILL.md SHALL contain YAML frontmatter with name and description
- **AND** each SKILL.md SHALL contain the skill instructions

### Requirement: Slash Command Generation

The command SHALL generate pastel slash commands for selected AI tools.

#### Scenario: Generating slash commands for a tool

- **WHEN** a tool is selected during initialization
- **THEN** create 9 slash command files using the tool's command adapter:
  - `/pastel:explore`
  - `/pastel:new`
  - `/pastel:continue`
  - `/pastel:apply`
  - `/pastel:ff`
  - `/pastel:verify`
  - `/pastel:sync`
  - `/pastel:archive`
  - `/pastel:bulk-archive`
- **AND** use tool-specific path conventions (e.g., `.claude/commands/pastel/` for Claude)
- **AND** include tool-specific frontmatter format

### Requirement: Success Output

The command SHALL provide clear, actionable next steps upon successful initialization.

#### Scenario: Displaying success message

- **WHEN** initialization completes successfully
- **THEN** display categorized summary:
  - "Created: <tools>" for newly configured tools
  - "Refreshed: <tools>" for already-configured tools that were updated
  - Count of skills and commands generated
- **AND** display getting started section with:
  - `/pastel:new` - Start a new change
  - `/pastel:continue` - Create the next artifact
  - `/pastel:apply` - Implement tasks
- **AND** display links to documentation and feedback

#### Scenario: Displaying restart instruction

- **WHEN** initialization completes successfully and tools were created or refreshed
- **THEN** display instruction to restart IDE for slash commands to take effect

### Requirement: Config File Generation

The command SHALL create an Pastelsdd config file with schema settings.

#### Scenario: Creating config.yaml

- **WHEN** initialization completes
- **AND** config.yaml does not exist
- **THEN** create `pastelsdd/config.yaml` with default schema setting
- **AND** display config location in output

#### Scenario: Preserving existing config.yaml

- **WHEN** initialization runs in extend mode
- **AND** `pastelsdd/config.yaml` already exists
- **THEN** preserve the existing config file
- **AND** display "(exists)" indicator in output

### Requirement: Non-Interactive Mode

The command SHALL support non-interactive operation through command-line options.

#### Scenario: Select all tools non-interactively

- **WHEN** run with `--tools all`
- **THEN** automatically select every available AI tool without prompting
- **AND** proceed with skill and command generation

#### Scenario: Select specific tools non-interactively

- **WHEN** run with `--tools claude,cursor`
- **THEN** parse the comma-separated tool IDs
- **AND** generate skills and commands for specified tools only

#### Scenario: Skip tool configuration non-interactively

- **WHEN** run with `--tools none`
- **THEN** create only the pastelsdd directory structure and config.yaml
- **AND** skip skill and command generation

### Requirement: Experimental Command Alias

The command SHALL maintain backward compatibility with the experimental command.

#### Scenario: Running pastelsdd experimental

- **WHEN** user runs `pastelsdd experimental`
- **THEN** delegate to `pastelsdd init`
- **AND** the command SHALL be hidden from help output

## REMOVED Requirements

### Requirement: File Generation

**Reason**: AGENTS.md and project.md are no longer generated. Skills contain all necessary instructions.

**Migration**: Skills in `.<tool>/skills/` provide all Pastelsdd workflow instructions. No manual file needed.

### Requirement: AI Tool Configuration Details

**Reason**: Config files (CLAUDE.md, .cursorrules, etc.) are replaced by skills.

**Migration**: Use skills in `.<tool>/skills/` instead of config files. Skills provide richer, tool-specific instructions.

### Requirement: Slash Command Configuration

**Reason**: Old `/pastelsdd:*` slash commands are replaced by `/pastel:*` commands with richer functionality.

**Migration**: Use `/pastel:new`, `/pastel:continue`, `/pastel:apply` instead of `/pastelsdd:proposal`, `/pastelsdd:apply`, `/pastelsdd:archive`.

### Requirement: Root instruction stub

**Reason**: Root AGENTS.md stub is no longer needed. Skills provide tool-specific instructions.

**Migration**: Skills are loaded automatically by supporting tools. No root stub needed.
