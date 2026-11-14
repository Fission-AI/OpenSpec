## ADDED Requirements

### Requirement: Init installs skills for this machine

With the global scope, `openspec init` SHALL install the skills once for this machine through the `skills` package, from the skills published in the OpenSpec repository for the running CLI's version, and SHALL give the project its `openspec/` folder and no skill files. Apart from the version stamp, the skills SHALL be the text a project install writes. Tools named with `--tools` SHALL be added to the tools already set up, never removed.

#### Scenario: First global install

- **WHEN** the user runs `openspec init --scope global --tools claude,codex` in a new project
- **THEN** `~/.agents/skills/` SHALL hold one copy of each skill in the profile
- **AND** Claude Code SHALL reach each skill from `~/.claude/skills/`
- **AND** the project SHALL contain only `openspec/`

#### Scenario: git is missing

- **WHEN** the user runs `openspec init --scope global --tools claude` on a machine without git
- **THEN** init SHALL exit 1, say that git is needed, and name `openspec init --scope project`
- **AND** nothing SHALL be written to the home folder

#### Scenario: The release tag isn't published yet

- **WHEN** the repository has no tag for the running CLI's version
- **THEN** the skills SHALL be installed from the default branch

#### Scenario: A tool is added later

- **GIVEN** the global skills are set up for Claude Code
- **WHEN** the user runs `openspec init --scope global --tools qwen`
- **THEN** both Claude Code and Qwen Code SHALL have the skills

#### Scenario: A tool without a machine-wide folder

- **WHEN** the user runs `openspec init --scope global --tools claude,oh-my-pi`
- **THEN** init SHALL set up Claude Code
- **AND** SHALL say Oh My Pi can't use the global skills and how to give it project skills

#### Scenario: A skill of the same name that OpenSpec didn't install

- **GIVEN** `~/.agents/skills/openspec-propose` exists and the lock file doesn't attribute it to OpenSpec
- **WHEN** the user runs `openspec init --scope global --tools claude`
- **THEN** that skill SHALL be left as it is and named in the output
- **AND** the other skills SHALL be installed

#### Scenario: The home folder

- **WHEN** the user runs `openspec init --scope global` in their home folder
- **THEN** init SHALL exit 1 and say to run it inside a project

### Requirement: Init chooses where skills go

Init SHALL use the first of these that applies: the `--scope` flag; the project, when it already has OpenSpec skills of its own; the `OPENSPEC_SKILLS_SCOPE` environment variable; the saved `skillsScope`; the global scope, when the global skills are installed; the answer to a question asked once at a terminal and then saved; the global scope.

#### Scenario: Scripted init on a machine with nothing saved

- **WHEN** `openspec init --tools claude` runs with no saved choice and no global skills
- **THEN** the skills SHALL be installed for the machine
- **AND** the project SHALL get only `openspec/`

#### Scenario: A script that keeps project installs

- **WHEN** `OPENSPEC_SKILLS_SCOPE=project openspec init --tools claude` runs
- **THEN** the skills SHALL be written to the project
- **AND** nothing SHALL be written to the home folder

#### Scenario: The default can't serve the request

- **WHEN** a scripted init with nothing saved sets up a tool the global skills don't cover, asks for the Copilot cloud files, or runs without git
- **THEN** the skills SHALL be installed in the project
- **AND** init SHALL say why

#### Scenario: The next project after a global install

- **GIVEN** the global skills are installed
- **WHEN** the user runs `openspec init --tools claude` in a new project
- **THEN** the project SHALL get only `openspec/`

#### Scenario: A project with its own skills

- **GIVEN** a project set up by 2.0
- **WHEN** the user runs `openspec init` there
- **THEN** it SHALL keep its own skills, whatever is saved or installed

### Requirement: Init moves a project to the global skills

`openspec init --scope global` in a project with its own OpenSpec skills SHALL remove them and install the global ones. It SHALL also remove the command files 1.x wrote. If any of these files has the user's changes, init SHALL stop before removing anything and name them. The project's files SHALL be removed only after the global install succeeds.

#### Scenario: Unedited project skills

- **WHEN** the user runs `openspec init --scope global` in a project 2.0 set up
- **THEN** the project's OpenSpec skills and links SHALL be removed
- **AND** the global skills SHALL be installed

#### Scenario: The global install fails

- **WHEN** the global install fails during `openspec init --scope global` in a project with its own skills
- **THEN** the project's skills SHALL be left in place
- **AND** running the command again after fixing the cause SHALL finish the move

#### Scenario: An edited project skill

- **GIVEN** the user changed `.agents/skills/openspec-explore/SKILL.md`
- **WHEN** they run `openspec init --scope global`
- **THEN** init SHALL exit 1 and name that skill
- **AND** no file SHALL be removed

### Requirement: Init installs a project's skills through the skills package

With the project scope, `openspec init` SHALL install the project's skills through the `skills` package, from the skills published for the running CLI's version, and SHALL leave a `skills-lock.json` at the project root that records them. When the skills cannot be fetched, init SHALL write the same text itself, SHALL say that the lock file was not written and why, and SHALL still exit 0. A skill the user owns, and any file a user keeps beside a `SKILL.md`, SHALL NOT be replaced.

#### Scenario: A fresh project install

- **WHEN** the user runs `openspec init --scope project --tools claude`
- **THEN** `.agents/skills/` SHALL hold each skill in the profile, with the published text
- **AND** `skills-lock.json` SHALL list exactly those skills

#### Scenario: git is missing

- **WHEN** the same command runs on a machine without git
- **THEN** the skills SHALL be written and init SHALL exit 0
- **AND** init SHALL say they were written without `skills-lock.json`
