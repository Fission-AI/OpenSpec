## ADDED Requirements

### Requirement: Oh My Pi tool supported in init
The `openspec init` command SHALL support Oh My Pi as a configurable tool, generating both skill files and command files using Oh My Pi's conventions when selected.

#### Scenario: Selecting Oh My Pi during init
- **WHEN** a user selects Oh My Pi during `openspec init`
- **THEN** skill files are written to `.omp/skills/openspec-<id>/SKILL.md` for each active command
- **AND** command files are written to `.omp/commands/opsx-<id>.md` for each active command
- **AND** skill file bodies use hyphen-based `/opsx-<id>` command references
- **AND** command file bodies have `**Provided arguments**: $@` injected after any `**Input**:` heading

#### Scenario: Oh My Pi listed when .omp directory is detected
- **WHEN** the project root contains a `.omp/` directory
- **THEN** Oh My Pi is pre-checked in the tool selection during `openspec init`
