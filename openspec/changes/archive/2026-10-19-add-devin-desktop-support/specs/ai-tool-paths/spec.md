# ai-tool-paths Delta Specification

## ADDED Requirements

### Requirement: Migrating OpenSpec content out of a renamed tool's former directory

When a tool's directory is renamed, OpenSpec-managed content left in the former
location SHALL be moved to the current one. Content the user wrote SHALL never
be moved or deleted.

Some renames are safe to apply silently and some are not, so each former root
declares whether leaving it needs the user's consent. Kimi CLI is gone, so
`.kimi` can be vacated without asking. Windsurf's `.windsurf` cannot: a
pre-rebrand Windsurf build reads only that directory, and nothing on disk
distinguishes that user from one who took the rebrand.

#### Scenario: Moving a former directory that needs no consent

- **WHEN** `openspec init` or `openspec update` runs and OpenSpec-managed content is found under a former root marked as needing no consent, such as `.kimi`
- **THEN** move it to the tool's current directory without prompting
- **AND** report what moved

#### Scenario: Offering a move that needs consent

- **GIVEN** OpenSpec skills or command files under `.windsurf/`
- **WHEN** `openspec update` runs interactively without `--force`
- **THEN** explain that Windsurf is now Devin Desktop, that `.devin/` is the current directory, and that Devin Local does not read `.windsurf/` at all
- **AND** ask before moving anything
- **AND** on decline, leave every file untouched and state that `.windsurf/` will no longer be refreshed until it is moved

#### Scenario: Unattended runs take the move

- **WHEN** `openspec update` runs with `--force`, or non-interactively
- **THEN** perform the move without prompting, reporting what moved

#### Scenario: Selecting a renamed tool is consent

- **WHEN** `openspec init` configures a tool that has OpenSpec content under a former root
- **THEN** move that content as part of setup, rather than leaving the user with two installs of one tool

#### Scenario: Both directories already hold OpenSpec content

- **GIVEN** the same OpenSpec-managed skill or command exists under both the former and the current root
- **WHEN** the move runs
- **THEN** the copy under the current root SHALL win, rather than being merged or overwritten
- **AND** only the file OpenSpec generated SHALL be removed from the former root — for a skill directory that is `SKILL.md` alone, never the directory and whatever else it holds
- **AND** one rule SHALL govern skills and command files alike: the former copy SHALL be removed only when it is byte-identical to the surviving one
- **AND** a former copy that differs SHALL be left where it is, since the difference may be a customization
- **AND** files left behind for that reason SHALL be reported, so the user knows two copies now exist

#### Scenario: Every former file differs, so nothing is movable

- **GIVEN** every OpenSpec-managed file under the former root differs from its counterpart under the current one
- **WHEN** the move runs
- **THEN** report the files left in place, rather than staying silent because nothing moved
- **AND** NOT offer to move anything, since there is nothing movable to consent to
- **AND** NOT report a migration that did not happen

#### Scenario: One root is a symbolic link to the other

- **GIVEN** the former and current roots resolve to the same directory, as when a user symlinks one at the other to straddle the rename
- **WHEN** the move runs
- **THEN** recognize that source and destination are the same file and change nothing, rather than deleting the only copy

#### Scenario: User files survive the move

- **GIVEN** a former root also holds files the user wrote, such as a hand-written workflow beside the generated ones
- **WHEN** the move runs
- **THEN** move only the files OpenSpec generates — each skill's `SKILL.md` and command files named `opsx-*`
- **AND** delete the former directory only when the move leaves it empty

#### Scenario: A user file beside a generated skill is not carried into a directory OpenSpec prunes

- **GIVEN** a former skill directory holds `SKILL.md` alongside a file the user wrote
- **AND** OpenSpec removes whole skill directories it owns, as under commands-only delivery or for a workflow outside the active profile
- **WHEN** the move runs
- **THEN** move `SKILL.md` alone and leave the user's file under the former root
- **AND** never move the enclosing directory, which would hand that file to a later removal

#### Scenario: The move is idempotent

- **WHEN** `openspec update` runs again after a completed move
- **THEN** find nothing to migrate and report nothing

## MODIFIED Requirements

### Requirement: Path configuration for supported tools

The `AI_TOOLS` array SHALL include `skillsDir` for tools that support the Agent Skills specification.

#### Scenario: Claude Code paths defined

- **WHEN** looking up the `claude` tool
- **THEN** `skillsDir` SHALL be `.claude`

#### Scenario: Cursor paths defined

- **WHEN** looking up the `cursor` tool
- **THEN** `skillsDir` SHALL be `.cursor`

#### Scenario: Devin Desktop paths defined

- **WHEN** looking up the `devin` tool
- **THEN** `skillsDir` SHALL be `.devin`
- **AND** workflow files SHALL be written to `.devin/workflows/opsx-<id>.md`
- **AND** `detectionPaths` SHALL include both `.devin` and the legacy `.windsurf`, so a project set up before the rebrand is still recognized

#### Scenario: Legacy Windsurf tool ID

- **WHEN** initializing with `openspec init --tools windsurf`
- **THEN** the `windsurf` alias SHALL resolve to `devin`
- **AND** when skill delivery is enabled, skills SHALL be generated under `.devin/skills/`, not `.windsurf/skills/`

#### Scenario: Kimi Code paths defined

- **WHEN** looking up the `kimi` tool
- **THEN** `skillsDir` SHALL be `.kimi-code`
- **AND** OpenSpec-managed skills remaining under the legacy `.kimi/skills` directory SHALL be migrated to `.kimi-code/skills` during init and update, preserving user files

#### Scenario: Hermes Agent paths defined

- **WHEN** looking up the `hermes` tool
- **THEN** `skillsDir` SHALL be `.hermes`
- **AND** `setupNote` SHALL explain that project `.hermes/skills` must be added to `skills.external_dirs` in `~/.hermes/config.yaml`
- **AND** `openspec init` and `openspec update` SHALL display the note whenever `hermes` is configured

#### Scenario: DeepSeek Harness paths defined

- **WHEN** looking up the `dsh` tool
- **THEN** `skillsDir` SHALL be `.dsh`
- **AND** auto-detection SHALL require `.dsh` to be a directory
- **AND** OpenSpec SHALL write dsh skills under `<projectRoot>/.dsh/skills/` using platform-native path joining

#### Scenario: Grok Build paths defined

- **WHEN** looking up the `grok` tool
- **THEN** `skillsDir` SHALL be `.grok`

#### Scenario: Warp paths and detection defined

- **WHEN** looking up the `warp` tool
- **THEN** `skillsDir` SHALL be `.warp`
- **AND** `detectionPaths` SHALL include `.warp` and `WARP.md`

#### Scenario: Warp invokes skills without command files

- **WHEN** generating workflows for the `warp` tool with delivery set to `commands`
- **THEN** skills SHALL remain installed in `.warp/skills/`
- **AND** no command adapter or command files SHALL be required
- **AND** each skill SHALL be directly invocable by its `/openspec-*` name

#### Scenario: Tools without skillsDir

- **WHEN** a tool has no `skillsDir` defined
- **THEN** skill generation SHALL error with message indicating the tool is not supported
