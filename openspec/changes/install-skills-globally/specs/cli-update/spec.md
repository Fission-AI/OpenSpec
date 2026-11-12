## ADDED Requirements

### Requirement: Update refreshes this machine's skills with --global

`openspec update --global` SHALL bring `~/.agents/skills/` and the tools' home links to the current version and global profile, for the tools listed in `~/.agents/skills/.openspec-target`, under the same rules a project update follows. With `--dry-run` it SHALL write nothing and list what it would change. It SHALL NOT read or write the current folder.

#### Scenario: After a CLI upgrade

- **GIVEN** a global install from an earlier version
- **WHEN** the user runs `openspec update --global`
- **THEN** each installed skill SHALL hold this version's text
- **AND** a skill the user edited SHALL be named as replaced

#### Scenario: Nothing installed globally

- **WHEN** the user runs `openspec update --global` with no global install
- **THEN** update SHALL write nothing and name `openspec init --global`

### Requirement: Update offers to switch a project to global skills

When a project has its own OpenSpec skills, has no `skills` setting, and this machine's global install covers every tool set up in the project, interactive `openspec update` SHALL ask once whether to use the global skills. Non-interactive runs SHALL NOT switch and SHALL print one line naming `--use-global-skills`.

#### Scenario: The user accepts

- **WHEN** the user answers yes
- **THEN** update SHALL remove the project's unedited OpenSpec skills and links
- **AND** SHALL keep and list each edited one
- **AND** SHALL save `skills: global` in `openspec/config.yaml`

#### Scenario: The user declines

- **WHEN** the user answers no
- **THEN** the project's skills SHALL be refreshed as before
- **AND** update SHALL save `skills: project` and not ask again

#### Scenario: Dry run

- **WHEN** the user runs `openspec update --use-global-skills --dry-run`
- **THEN** update SHALL list the skills it would remove and write nothing

### Requirement: Update respects a project's global skills setting

When `openspec/config.yaml` sets `skills: global`, `openspec update` SHALL write no project skills, SHALL never write to the home folder, and SHALL name `openspec init --global` when this machine's global install doesn't cover the project's tools.

#### Scenario: Teammate without a global install

- **GIVEN** a project with `skills: global` and no global install on this machine
- **WHEN** the user runs `openspec update`
- **THEN** no project skill SHALL be written
- **AND** the output SHALL name `openspec init --global`
