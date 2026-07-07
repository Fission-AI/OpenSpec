## Purpose

The init command SHALL allow users to choose a shared `agents` skills target in the same way they choose tool-specific targets such as `claude`, `cursor`, `pi`, or `codex`.

## MODIFIED Requirements

### Requirement: Init accepts the shared agents target
`openspec init` SHALL accept `agents` anywhere tool IDs are selected or passed through `--tools`.

#### Scenario: Non-interactive agents setup
- **WHEN** the user runs `openspec init --tools agents`
- **THEN** OpenSpec creates skills under `.agents/skills/openspec-*/SKILL.md`
- **AND** OpenSpec does not fail just because `agents` has no command adapter

#### Scenario: Interactive agents setup
- **WHEN** the user selects `agents` from the init tool picker
- **THEN** OpenSpec configures `.agents/skills` using the same workflow/profile rules as other skill targets

#### Scenario: Deprecated init alias accepts agents
- **WHEN** the user runs the deprecated `experimental --tool agents` path
- **THEN** OpenSpec treats it the same as the equivalent init tool selection
