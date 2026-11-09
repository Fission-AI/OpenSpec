## MODIFIED Requirements

### Requirement: AIToolOption skillsDir field

The `AIToolOption` interface SHALL include an optional `skillsDir` field naming the tool's own project folder. Project skills SHALL be written once, to the shared `.agents/skills/` folder, for every tool with a `skillsDir`.

#### Scenario: Interface includes skillsDir field

- **WHEN** a tool entry is defined in `AI_TOOLS` that supports skill generation
- **THEN** it SHALL include a `skillsDir` field specifying the tool's project folder (e.g., `.claude`)

#### Scenario: Skills path follows Agent Skills spec

- **WHEN** generating project skills for any tool with a `skillsDir`
- **THEN** skills SHALL be written to `<projectRoot>/.agents/skills/`
- **AND** a skill SHALL be written once however many tools are set up

### Requirement: Shared .agents skills target

OpenSpec SHALL provide a vendor-neutral `agents` tool target for assistants that read skills from the shared `.agents/skills/` folder.

#### Scenario: Shared agents target paths defined

- **WHEN** looking up the `agents` tool
- **THEN** `skillsDir` SHALL be `.agents`

#### Scenario: Detection keys off the shared skills subtree

- **WHEN** `.agents/skills/.openspec-target` lists `agents`
- **THEN** OpenSpec SHALL detect `agents` as set up
- **AND** a `.agents/skills` folder alone SHALL NOT count as evidence of any one tool, since every tool's skills live there

#### Scenario: A bare shared root does not select the target

- **GIVEN** a project contains `.agents` but no `.agents/skills/.openspec-target` listing `agents`
- **WHEN** OpenSpec detects available tools
- **THEN** `agents` SHALL NOT be reported as available

## ADDED Requirements

### Requirement: Skill links for tools that do not read the shared folder

OpenSpec SHALL link each project skill into the own `skills/` folder of every tool that does not, or may not, read `.agents/skills`: Claude Code, Continue, ForgeCode, Kiro, CodeBuddy, EasyCode, iFlow, CodeArts, Lingma, GigaCode, Veai, Rovo Dev, Code Studio and Hermes.

#### Scenario: Link per skill

- **WHEN** skills are generated for Claude Code
- **THEN** `.claude/skills/<skill>` SHALL be a relative link to `../../.agents/skills/<skill>`

#### Scenario: Copy when a link cannot be made

- **WHEN** creating the link fails
- **THEN** OpenSpec SHALL write a plain copy of the shared skill at the link path

#### Scenario: No link for tools that read the shared folder

- **WHEN** skills are generated for a tool that reads `.agents/skills` (for example Cursor)
- **THEN** OpenSpec SHALL NOT write anything to that tool's own `skills/` folder

### Requirement: Tools set up in a project are listed

`.agents/skills/.openspec-target` SHALL list every tool set up in the project, one id per line.

#### Scenario: Listing tools

- **WHEN** init sets up Claude Code and Cursor
- **THEN** the file SHALL contain `claude` and `cursor`, one per line

#### Scenario: Reading an older file

- **GIVEN** the file holds a single tool id from an earlier release
- **WHEN** OpenSpec reads it
- **THEN** it SHALL treat that tool as listed
