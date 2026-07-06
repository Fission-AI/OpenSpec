## MODIFIED Requirements

### Requirement: Directory Creation

The command SHALL create the ClearSpec directory structure with config file, including dedicated folders for project inputs and outputs.

#### Scenario: Creating ClearSpec structure

- **WHEN** `clearspec init` is executed
- **THEN** create the following directory structure:
```
clearspec/
├── config.yaml
├── specs/
├── changes/
│   └── archive/
├── requirements/
├── context/
├── code/
├── reports/
└── spec-packs/
```

#### Scenario: Creating project folders in extend mode

- **GIVEN** a `clearspec/` directory already exists
- **WHEN** `clearspec init` is executed and enters extend mode
- **THEN** ensure `requirements/`, `context/`, `code/`, `reports/`, and `spec-packs/` exist under `clearspec/`
- **AND** preserve any content already present in those folders

#### Scenario: Creating project folders regardless of tool selection

- **WHEN** `clearspec init` is run with `--tools none`
- **THEN** create the `clearspec/` base structure including `requirements/`, `context/`, `code/`, `reports/`, and `spec-packs/`
- **AND** skip skill and command generation

#### Scenario: Cross-platform folder paths

- **WHEN** the command creates the project folders on macOS, Linux, or Windows
- **THEN** resolve each folder path relative to the `clearspec/` directory using the platform path separator
- **AND** create each folder successfully without assuming forward-slash separators

### Requirement: Skill Generation

The command SHALL generate Agent Skills for selected AI tools.

#### Scenario: Generating skills for a tool

- **WHEN** a tool is selected during initialization
- **THEN** create 12 skill directories under `.<tool>/skills/`:
  - `clearspec-explore/SKILL.md`
  - `clearspec-new-change/SKILL.md`
  - `clearspec-continue-change/SKILL.md`
  - `clearspec-apply-change/SKILL.md`
  - `clearspec-ff-change/SKILL.md`
  - `clearspec-verify-change/SKILL.md`
  - `clearspec-sync-specs/SKILL.md`
  - `clearspec-archive-change/SKILL.md`
  - `clearspec-bulk-archive-change/SKILL.md`
  - `clearspec-check-readiness/SKILL.md`
  - `clearspec-deep-review/SKILL.md`
  - `clearspec-discover/SKILL.md`
- **AND** each SKILL.md SHALL contain YAML frontmatter with name and description
- **AND** each SKILL.md SHALL contain the skill instructions

### Requirement: Slash Command Generation

The command SHALL generate clsx slash commands only for selected tools that have a registered command adapter, while keeping adapterless tools valid for skill generation.

#### Scenario: Generating slash commands for a tool with a registered adapter

- **WHEN** a tool with a registered command adapter is selected during initialization
- **THEN** create 12 slash command files using the tool's command adapter:
  - `/clsx:explore`
  - `/clsx:new`
  - `/clsx:continue`
  - `/clsx:apply`
  - `/clsx:ff`
  - `/clsx:verify`
  - `/clsx:sync`
  - `/clsx:archive`
  - `/clsx:bulk-archive`
  - `/clsx:check-readiness`
  - `/clsx:deep-review`
  - `/clsx:discover`
- **AND** use tool-specific path conventions (e.g., `.claude/commands/clsx/` for Claude)
- **AND** include tool-specific frontmatter format

#### Scenario: Selected tool has no command adapter

- **GIVEN** a selected tool has `skillsDir` configured but no registered command adapter
- **WHEN** initialization includes command generation
- **THEN** skill generation for that tool SHALL still remain valid
- **AND** command-file generation SHALL be skipped for that tool
- **AND** the command output SHALL include `Commands skipped for: <tool-id> (no adapter)`

#### Scenario: Kimi CLI skips command-file generation

- **WHEN** the user selects Kimi CLI during initialization
- **THEN** ClearSpec SHALL treat it as a supported tool with `skillsDir: '.kimi'`
- **AND** command-file generation SHALL be skipped because no Kimi adapter is registered

## ADDED Requirements

### Requirement: Readiness pipeline skills in the core profile

`clearspec init` SHALL generate the three readiness-pipeline skills and their slash commands alongside the other generated skills, and SHALL include the `check-readiness`, `deep-review`, and `discover` workflows in the default `core` profile so they ship by default.

#### Scenario: Generating the readiness-pipeline skills and commands

- **WHEN** `clearspec init` configures a selected AI tool with the default profile
- **THEN** it generates `clearspec-check-readiness`, `clearspec-deep-review`, and `clearspec-discover` skills under that tool's `skills/` directory
- **AND** it generates `check-readiness`, `deep-review`, and `discover` slash commands under that tool's `commands/clsx/` directory (for tools that support commands)

#### Scenario: Readiness workflows included in the core profile

- **WHEN** `clearspec init` runs with the default `core` profile
- **THEN** the generated skill set includes `clearspec-check-readiness`, `clearspec-deep-review`, and `clearspec-discover` alongside the other core skills

#### Scenario: Cross-platform readiness skill paths

- **WHEN** `clearspec init` writes the readiness-pipeline skill and command files on macOS, Linux, or Windows
- **THEN** it resolves each file path using the platform path separator
- **AND** does not assume forward-slash separators
