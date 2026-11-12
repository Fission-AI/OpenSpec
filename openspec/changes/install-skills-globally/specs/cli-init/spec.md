## ADDED Requirements

### Requirement: Init installs skills for this machine

With the global scope, `openspec init` SHALL install the skills once for this machine through the `skills` package, and SHALL give the project its `openspec/` folder and no skill files. The skills SHALL be the text a project install writes for the same profile. Tools named with `--tools` SHALL be added to the tools already set up, never removed.

#### Scenario: First global install

- **WHEN** the user runs `openspec init --scope global --tools claude,codex` in a new project
- **THEN** `~/.agents/skills/` SHALL hold one copy of each skill in the profile
- **AND** Claude Code SHALL reach each skill from `~/.claude/skills/`
- **AND** the project SHALL contain only `openspec/`

#### Scenario: A tool is added later

- **GIVEN** the global skills are set up for Claude Code
- **WHEN** the user runs `openspec init --scope global --tools qwen`
- **THEN** both Claude Code and Qwen Code SHALL have the skills

#### Scenario: A tool without a machine-wide folder

- **WHEN** the user runs `openspec init --scope global --tools claude,oh-my-pi`
- **THEN** init SHALL set up Claude Code
- **AND** SHALL say Oh My Pi can't use the global skills and how to give it project skills

### Requirement: Init chooses where skills go

Init SHALL use the first of these that applies: the `--scope` flag; the project, when it already has OpenSpec skills of its own; the saved `skillsScope`; the global scope, when the global skills are installed; the answer to a question asked once at a terminal and then saved; the project.

#### Scenario: Scripted init on a machine with nothing saved

- **WHEN** `openspec init --tools claude` runs with no saved choice and no global skills
- **THEN** the skills SHALL be written to the project, as in 2.0
- **AND** nothing SHALL be written to the home folder

#### Scenario: The next project after a global install

- **GIVEN** the global skills are installed
- **WHEN** the user runs `openspec init --tools claude` in a new project
- **THEN** the project SHALL get only `openspec/`

#### Scenario: A project with its own skills

- **GIVEN** a project set up by 2.0
- **WHEN** the user runs `openspec init` there
- **THEN** it SHALL keep its own skills, whatever is saved or installed

### Requirement: Init moves a project to the global skills

`openspec init --scope global` in a project with its own OpenSpec skills SHALL remove them and install the global ones. If any of them has the user's changes, init SHALL stop before removing anything and name them.

#### Scenario: Unedited project skills

- **WHEN** the user runs `openspec init --scope global` in a project 2.0 set up
- **THEN** the project's OpenSpec skills and links SHALL be removed
- **AND** the global skills SHALL be installed

#### Scenario: An edited project skill

- **GIVEN** the user changed `.agents/skills/openspec-explore/SKILL.md`
- **WHEN** they run `openspec init --scope global`
- **THEN** init SHALL exit 1 and name that skill
- **AND** no file SHALL be removed
