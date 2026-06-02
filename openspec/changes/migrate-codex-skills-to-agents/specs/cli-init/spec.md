## MODIFIED Requirements

### Requirement: AI Tool Configuration

The command SHALL configure AI coding assistants with skills and slash commands using a searchable multi-select experience.

#### Scenario: Prompting for AI tool selection

- **WHEN** run interactively
- **THEN** display animated welcome screen with OpenSpec logo
- **AND** present a searchable multi-select that shows all available tools
- **AND** mark already configured tools with "(configured ✓)" indicator
- **AND** pre-select configured tools for easy refresh
- **AND** sort configured tools to appear first in the list
- **AND** allow filtering by typing to search

#### Scenario: Selecting tools to configure

- **WHEN** user selects tools and confirms
- **THEN** generate skills in each selected tool's configured skill path
- **AND** generate slash commands only for selected tools with a registered command adapter
- **AND** create `openspec/config.yaml` with default schema setting

#### Scenario: Selecting Codex

- **WHEN** user selects Codex during initialization
- **THEN** generate Codex OpenSpec skills in `.agents/skills`
- **AND** treat `.codex/skills` only as a legacy detection and migration path
- **AND** remove OpenSpec-managed legacy `.codex/skills/openspec-*` directories after the `.agents/skills` replacement succeeds

### Requirement: Skill Generation

The command SHALL generate Agent Skills for selected AI tools.

#### Scenario: Generating skills for a tool

- **WHEN** a tool is selected during initialization
- **THEN** create 9 skill directories under the selected tool's configured skill path:
  - `openspec-explore/SKILL.md`
  - `openspec-new-change/SKILL.md`
  - `openspec-continue-change/SKILL.md`
  - `openspec-apply-change/SKILL.md`
  - `openspec-ff-change/SKILL.md`
  - `openspec-verify-change/SKILL.md`
  - `openspec-sync-specs/SKILL.md`
  - `openspec-archive-change/SKILL.md`
  - `openspec-bulk-archive-change/SKILL.md`
- **AND** each SKILL.md SHALL contain YAML frontmatter with name and description
- **AND** each SKILL.md SHALL contain the skill instructions

#### Scenario: Generating Codex skills

- **WHEN** Codex is selected during initialization
- **THEN** create Codex skill directories under `.agents/skills`
- **AND** do not create Codex OpenSpec skills under `.codex/skills`

#### Scenario: Preserving unmanaged legacy Codex content

- **WHEN** Codex initialization encounters `.codex/skills` content outside known OpenSpec-managed skill directories
- **THEN** the system SHALL leave that content untouched

#### Scenario: Constructing skill paths across platforms

- **WHEN** skill paths are generated for any selected tool
- **THEN** the system SHALL construct paths using platform-aware path handling
