## ADDED Requirements

### Requirement: Shared COMMAND_NAMESPACE constant
The system SHALL define a single `COMMAND_NAMESPACE` constant in `src/core/command-generation/namespace.ts` with the value `'enpalspec'`. All adapters and workflow templates SHALL import and use this constant instead of the hardcoded string `'opsx'`.

#### Scenario: Constant is the single source of truth
- **WHEN** `COMMAND_NAMESPACE` is defined as `'enpalspec'`
- **THEN** no adapter file contains the literal string `'opsx'` in its path or frontmatter template
- **AND** no workflow template file contains the literal string `/opsx:` in its body content

## MODIFIED Requirements

### Requirement: Claude adapter formatting
The system SHALL generate Claude command files with the `enpalspec` namespace.

- **WHEN** formatting a command for Claude Code
- **THEN** the adapter SHALL output YAML frontmatter with `name`, `description`, `category`, `tags` fields
- **AND** file path SHALL follow pattern `.claude/commands/enpalspec/<id>.md`

#### Scenario: Claude adapter uses enpalspec path
- **WHEN** `generateCommand` is called with the Claude adapter and command id `explore`
- **THEN** the returned path is `.claude/commands/enpalspec/explore.md`

### Requirement: Cursor adapter formatting
The system SHALL generate Cursor command files with the `enpalspec` namespace.

- **WHEN** formatting a command for Cursor
- **THEN** the adapter SHALL output YAML frontmatter with `name` as `/enpalspec-<id>`, `id` as `enpalspec-<id>`, `category`, `description` fields
- **AND** file path SHALL follow pattern `.cursor/commands/enpalspec-<id>.md`

#### Scenario: Cursor adapter uses enpalspec path
- **WHEN** `generateCommand` is called with the Cursor adapter and command id `explore`
- **THEN** the returned path is `.cursor/commands/enpalspec-explore.md`
- **AND** the frontmatter `name` field is `/enpalspec-explore`

### Requirement: Windsurf adapter formatting
The system SHALL generate Windsurf workflow files with the `enpalspec` namespace.

- **WHEN** formatting a command for Windsurf
- **THEN** the adapter SHALL output YAML frontmatter with `name`, `description`, `category`, `tags` fields
- **AND** file path SHALL follow pattern `.windsurf/workflows/enpalspec-<id>.md`

#### Scenario: Windsurf adapter uses enpalspec path
- **WHEN** `generateCommand` is called with the Windsurf adapter and command id `explore`
- **THEN** the returned path is `.windsurf/workflows/enpalspec-explore.md`

### Requirement: All other tool adapters use enpalspec namespace
All remaining tool adapters (antigravity, cline, codebuddy, codex, continue, factory, gemini, github-copilot, iflow, kilocode, kiro, opencode, qoder, qwen, roocode, amazon-q, auggie, costrict, crush, pi) SHALL use `COMMAND_NAMESPACE` in their `getFilePath` and `formatFile` implementations, replacing the previous `opsx` prefix.

#### Scenario: All adapters use the shared constant
- **WHEN** any registered adapter generates a command file path
- **THEN** the path contains `enpalspec` in place of `opsx`
- **AND** any frontmatter referencing the namespace uses `enpalspec`

### Requirement: Workflow template body references use enpalspec namespace
All workflow skill template files SHALL reference `/enpalspec:*` commands in their body content, replacing all previous `/opsx:*` references.

#### Scenario: Installed skill body uses enpalspec commands
- **WHEN** a user runs `enpalspec init` and reads an installed skill file
- **THEN** any cross-skill references in the skill body use `/enpalspec:explore`, `/enpalspec:propose`, `/enpalspec:apply`, etc.
- **AND** no installed skill body contains `/opsx:` references
