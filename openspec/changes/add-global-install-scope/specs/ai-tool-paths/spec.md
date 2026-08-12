## MODIFIED Requirements

### Requirement: AIToolOption skillsDir field

The `AIToolOption` interface SHALL include skill path metadata and MAY include explicit install-scope support and a documented global path override.

#### Scenario: Interface includes skillsDir field

- **WHEN** a tool entry is defined in `AI_TOOLS` that supports skill generation
- **THEN** it SHALL include a `skillsDir` field specifying its default relative skill container (for example `.claude`)

#### Scenario: Skills path follows Agent Skills spec

- **WHEN** generating skills for a tool with `skillsDir: '.claude'`
- **THEN** the managed skill directories SHALL be placed below a `skills` directory in the resolved scope target
- **AND** project scope SHALL resolve that example below `<projectRoot>/.claude/skills/`

#### Scenario: Scope support metadata is present

- **WHEN** a tool surface supports a documented scope
- **THEN** its entry MAY declare that support as `scopeSupport.skills` or `scopeSupport.commands`
- **AND** each declared value SHALL be `global` or `project`
- **AND** the support array SHALL NOT determine preference order

#### Scenario: Scope support metadata is absent

- **WHEN** a tool surface exists but omits its scope support metadata
- **THEN** that surface SHALL be treated as project-only
- **AND** no global path SHALL be inferred from the tool name

#### Scenario: Project and global skill containers match

- **WHEN** a skills surface supports `project` and `global`
- **AND** its documented relative container is the same in both scopes
- **THEN** `skillsDir` SHALL supply that relative container for both roots
- **AND** the entry SHALL NOT require a duplicate global path field

#### Scenario: Global skill container differs

- **WHEN** a skills surface supports `global`
- **AND** its documented user-level relative container differs from `skillsDir`
- **THEN** `globalSkillsDir` SHALL declare that override
- **AND** the override SHALL NOT by itself declare global scope support

### Requirement: Path configuration for supported tools

The `AI_TOOLS` array SHALL include skill path and scope metadata that matches each supported tool's documented installation locations, while command scope SHALL remain independent from skill scope.

#### Scenario: Claude Code paths defined

- **WHEN** looking up the `claude` tool
- **THEN** `skillsDir` SHALL be `.claude`
- **AND** its skills and adapter-backed commands SHALL be project-only in the initial support matrix

#### Scenario: Cursor paths defined

- **WHEN** looking up the `cursor` tool
- **THEN** `skillsDir` SHALL be `.cursor`
- **AND** its skills and adapter-backed commands SHALL be project-only in the initial support matrix

#### Scenario: Windsurf paths defined

- **WHEN** looking up the retired `windsurf` tool ID
- **THEN** it SHALL resolve to the current `devin` tool
- **AND** `.devin` SHALL be the preferred skill container
- **AND** `.windsurf` SHALL remain a legacy detection/migration path rather than a new write target

#### Scenario: Kimi Code paths defined

- **WHEN** looking up the `kimi` tool
- **THEN** `skillsDir` SHALL be `.kimi-code`
- **AND** OpenSpec-managed skills remaining under the legacy `.kimi/skills` directory SHALL be migrated to the effective `.kimi-code/skills` target after replacement, preserving user files

#### Scenario: Hermes Agent paths defined

- **WHEN** looking up the `hermes` tool
- **THEN** `skillsDir` SHALL be `.hermes`
- **AND** `setupNote` SHALL explain any manual configuration required for the effective project skill target
- **AND** `openspec init` and `openspec update` SHALL display that note whenever the selected effective target requires it

#### Scenario: Tools without skillsDir

- **WHEN** a tool has no `skillsDir` defined
- **THEN** skill generation SHALL error with a message indicating the tool is not supported

#### Scenario: Codex paths and scopes defined

- **WHEN** looking up the `codex` tool
- **THEN** `skillsDir` SHALL be `.agents`
- **AND** skills SHALL declare support for `global` and `project`
- **AND** no command-file scope SHALL be declared
- **AND** `.codex` SHALL remain a legacy skill path rather than a new write target

#### Scenario: Shared agents paths and scopes defined

- **WHEN** looking up the `agents` tool
- **THEN** `skillsDir` SHALL be `.agents`
- **AND** skills SHALL declare support for `global` and `project`
- **AND** no command-file scope SHALL be declared

#### Scenario: MiniMax Code paths and scopes defined

- **WHEN** looking up the `minimax-code` tool
- **THEN** `skillsDir` SHALL be `.minimax`
- **AND** skills SHALL declare support for `global` only
- **AND** project preference SHALL use normal fallback rather than create a project `.minimax` skill tree

#### Scenario: GitHub Copilot uses different skill containers

- **WHEN** looking up the `github-copilot` tool
- **THEN** project skills SHALL use the `.github` container
- **AND** personal skills SHALL use the documented `.copilot` global override
- **AND** skills SHALL declare `global` and `project` support
- **AND** generated Copilot prompt files SHALL declare project-only command scope

#### Scenario: Other existing skill surfaces remain project-only

- **WHEN** looking up an existing skills surface other than Codex, `agents`, MiniMax Code, or GitHub Copilot
- **THEN** that skills surface SHALL support `project` only in the initial support matrix
- **AND** no user-level path SHALL be inferred during implementation

#### Scenario: Existing adapter-backed commands remain project-only

- **WHEN** looking up any existing adapter-backed commands surface, including GitHub Copilot prompt files
- **THEN** that commands surface SHALL support `project` only in the initial support matrix
- **AND** no existing adapter SHALL write command files globally

## ADDED Requirements

### Requirement: Scope-aware skill target resolution

The system SHALL resolve skill targets from effective scope, platform context, and tool path metadata without permitting scope support and path overrides to contradict each other.

#### Scenario: Project skill target

- **WHEN** effective skills scope is `project`
- **THEN** the target SHALL resolve to `<projectRoot>/<skillsDir>/skills`
- **AND** SHALL remain within the canonical project root

#### Scenario: Global skill target with the default container

- **WHEN** effective skills scope is `global`
- **AND** no `globalSkillsDir` override exists
- **THEN** the target SHALL resolve to `<homeDir>/<skillsDir>/skills`
- **AND** SHALL remain within the canonical allowed user directory

#### Scenario: Global skill target with an override

- **WHEN** effective skills scope is `global`
- **AND** `globalSkillsDir` is defined
- **THEN** the target SHALL resolve to `<homeDir>/<globalSkillsDir>/skills`
- **AND** `skillsDir` SHALL remain the project-scope container

#### Scenario: Windows skill target

- **WHEN** a skill target is resolved for Windows
- **THEN** the resolver SHALL use the Windows home and Windows path semantics
- **AND** tests SHALL compare paths using Windows-aware path joining rather than hardcoded separators

#### Scenario: Declared global support has no usable path

- **WHEN** a tool declares global skills support but neither its default nor override metadata yields a safely contained global target
- **THEN** preflight SHALL fail before filesystem mutation
- **AND** SHALL identify the invalid tool metadata
