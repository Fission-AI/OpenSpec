## MODIFIED Requirements

### Requirement: Skill Generation

The command SHALL generate Agent Skills for selected AI tools.

#### Scenario: Generating skills for a tool

- **WHEN** a tool is selected during initialization
- **THEN** create 10 skill directories under `.<tool>/skills/`:
  - `openspec-explore/SKILL.md`
  - `openspec-new-change/SKILL.md`
  - `openspec-continue-change/SKILL.md`
  - `openspec-apply-change/SKILL.md`
  - `openspec-ff-change/SKILL.md`
  - `openspec-verify-change/SKILL.md`
  - `openspec-sync-specs/SKILL.md`
  - `openspec-archive-change/SKILL.md`
  - `openspec-bulk-archive-change/SKILL.md`
  - `openspec-propose/SKILL.md`
- **AND** each SKILL.md SHALL contain YAML frontmatter with name and description
- **AND** each SKILL.md SHALL contain the skill instructions
- **AND** skill instructions SHALL reference `enpalspec` as the CLI binary (not `openspec`)
- **AND** skill display names SHALL use `EnpalSpec: <Name>` format (not `OPSX: <Name>`)

### Requirement: Slash Command Generation

The command SHALL generate enpalspec slash commands for selected AI tools.

#### Scenario: Generating slash commands for a tool

- **WHEN** a tool is selected during initialization
- **THEN** create 5 slash command files using the tool's command adapter for the core profile:
  - `/enpalspec:propose`
  - `/enpalspec:explore`
  - `/enpalspec:apply`
  - `/enpalspec:verify`
  - `/enpalspec:archive`
- **AND** use tool-specific path conventions (e.g., `.claude/commands/enpalspec/` for Claude)
- **AND** include tool-specific frontmatter format
- **AND** command instructions SHALL reference `enpalspec` as the CLI binary

## ADDED Requirements

### Requirement: Verify Skill Installed by Default

The `core` profile SHALL include the `verify` workflow, so `enpalspec init` generates the verify skill and command for every target project by default.

#### Scenario: Core profile includes verify

- **WHEN** `enpalspec init` runs with default (core) profile
- **THEN** generate `openspec-verify-change/SKILL.md` in the tool's skills directory
- **AND** generate the `/enpalspec:verify` slash command file
- **AND** the verify skill SHALL appear between apply and archive in the installed workflow set
