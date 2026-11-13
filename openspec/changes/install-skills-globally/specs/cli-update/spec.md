## ADDED Requirements

### Requirement: Update refreshes the skills installed for this machine

When the global skills are installed, `openspec update` SHALL reinstall them at the CLI's version and the current profile, with no flag. It SHALL do so from any folder, including one that is not an OpenSpec project. It SHALL remove a global skill the profile no longer includes only when OpenSpec installed it. Without the global skills, update SHALL behave as in 2.0.

#### Scenario: A project that uses the global skills

- **WHEN** the user runs `openspec update` in a project with no skills of its own
- **THEN** the global skills SHALL be refreshed
- **AND** update SHALL NOT report that no tools are configured

#### Scenario: Outside a project

- **GIVEN** the global skills are installed
- **WHEN** the user runs `openspec update` in a folder with no `openspec/`
- **THEN** the global skills SHALL be refreshed and update SHALL exit 0

#### Scenario: A project with its own skills

- **GIVEN** the global skills are installed
- **WHEN** the user runs `openspec update` in a project with its own skills
- **THEN** both SHALL be updated
- **AND** update SHALL say a tool may list each skill twice and name `openspec init --scope global`

#### Scenario: Someone else's skill with an OpenSpec name

- **GIVEN** `~/.agents/skills/openspec-verify-change` exists and OpenSpec did not install it
- **WHEN** update runs with a profile that doesn't include verify
- **THEN** that folder SHALL be left alone

#### Scenario: The project update fails

- **GIVEN** the global skills are installed
- **WHEN** `openspec update` fails to update the project's own skills
- **THEN** the global skills SHALL still be refreshed
- **AND** update SHALL exit 1

#### Scenario: Dry run

- **WHEN** the user runs `openspec update --dry-run`
- **THEN** the plan SHALL note that the global skills would be refreshed
- **AND** nothing in the home folder SHALL change

### Requirement: Update names the projects that still have their own skills

`openspec init` and `openspec update` SHALL record the project they run in, in a list kept in the global data folder on this machine. When the global skills are installed, `openspec update` SHALL name the other recorded projects that still have their own OpenSpec skills and give the command that moves one. A list that cannot be read or written SHALL NOT fail the command.

#### Scenario: Another project still has its own skills

- **GIVEN** the global skills are installed and a recorded project has its own skills
- **WHEN** the user runs `openspec update` in another folder
- **THEN** update SHALL name that project
- **AND** SHALL change nothing in it

#### Scenario: A recorded project is gone

- **GIVEN** a recorded project's `openspec/` folder no longer exists
- **WHEN** the user runs `openspec update`
- **THEN** that project SHALL NOT be named

#### Scenario: Dry run

- **WHEN** the user runs `openspec update --dry-run`
- **THEN** the list SHALL NOT be written

#### Scenario: The list cannot be written

- **WHEN** the global data folder cannot be written during `openspec init` or `openspec update`
- **THEN** the command SHALL finish as it would have without the list

### Requirement: Update keeps a project's skills under the skills package

`openspec update` SHALL treat a project as up to date when its installed skills equal the text the running CLI publishes, and SHALL then change no file and fetch nothing. Otherwise it SHALL install the skills through the `skills` package and record them in `skills-lock.json`. Skills that 1.x or 2.0 installed SHALL be recognized as OpenSpec's and brought under the lock file.

#### Scenario: A project 2.0 installed

- **WHEN** the user runs `openspec update` in a project that 2.0 set up
- **THEN** its skills SHALL be replaced with the published text and listed in `skills-lock.json`
- **AND** a second `openspec update` SHALL report it up to date and change nothing

#### Scenario: A skill an older CLI marked as kept

- **GIVEN** `.agents/skills/.openspec-target` marks a skill as kept and its text is OpenSpec's
- **WHEN** the user runs `openspec update`
- **THEN** the skill SHALL be managed as OpenSpec's again

### Requirement: Update keeps the lock file right when skills are removed

A skill the profile drops SHALL be removed together with its links and its lock entry, and a lock file that then records no skill SHALL be deleted. Entries for skills that are not OpenSpec's SHALL be left as they are.

#### Scenario: The profile drops a skill

- **WHEN** the profile no longer includes explore and the user runs `openspec update`
- **THEN** `openspec-explore`, its links and its entry in `skills-lock.json` SHALL be removed

#### Scenario: The lock file cannot be rewritten

- **WHEN** a skill is removed and `skills-lock.json` is read-only
- **THEN** the removal SHALL finish and update SHALL say the lock file still lists the skill
