## ADDED Requirements

### Requirement: Init installs skills for this machine with --global

`openspec init --global` SHALL write the global profile's skills once to `~/.agents/skills/` and link them into the home skills folder of each selected tool that doesn't read that folder, using the layout `npx skills add -g` uses. It SHALL NOT read or write the current folder.

#### Scenario: Claude Code and Cursor

- **WHEN** a user runs `openspec init --global --tools claude,cursor`
- **THEN** `~/.agents/skills/openspec-propose/SKILL.md` SHALL be the only real copy of that skill
- **AND** `~/.claude/skills/openspec-propose` SHALL link to it
- **AND** nothing SHALL be written to `~/.cursor/skills/`
- **AND** nothing SHALL be written in the current folder

#### Scenario: A tool with no known home folder

- **WHEN** a user runs `openspec init --global --tools easycode`
- **THEN** init SHALL write nothing for EasyCode and say it is set up per project

#### Scenario: A skill already there from npx skills

- **GIVEN** `~/.agents/skills/openspec-propose/` holds text OpenSpec did not write
- **WHEN** a user runs `openspec init --global`
- **THEN** that folder SHALL be kept, recorded as the user's, and named in the output

### Requirement: Init respects a project's global skills setting

When `openspec/config.yaml` sets `skills: global`, `openspec init` SHALL write no project skills. If this machine has no global install covering the selected tools, init SHALL say so and name `openspec init --global`.

#### Scenario: Teammate without a global install

- **GIVEN** a project with `skills: global`
- **AND** no `~/.agents/skills/.openspec-target`
- **WHEN** the user runs `openspec init --tools claude`
- **THEN** no file SHALL be written under `.agents/skills/` or `.claude/skills/`
- **AND** the output SHALL name `openspec init --global`
