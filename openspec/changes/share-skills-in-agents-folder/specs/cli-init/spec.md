## ADDED Requirements

### Requirement: Init writes one shared copy of the skills

Init SHALL write each selected workflow's skill once, to `.agents/skills/`, with wording that names other workflows by skill name rather than by any tool's command syntax.

#### Scenario: Several tools selected

- **WHEN** a user runs `openspec init --tools claude,cursor,codex`
- **THEN** `.agents/skills/openspec-propose/SKILL.md` SHALL be the only real copy of that skill
- **AND** `.claude/skills/openspec-propose` SHALL link to it
- **AND** nothing SHALL be written to `.cursor/skills/`

#### Scenario: Union of workflows

- **WHEN** tools with different delivery needs are selected
- **THEN** the shared copy SHALL hold every workflow any selected tool needs as a skill

### Requirement: Init installs skills only

Init SHALL generate no command files for any tool, whatever the `delivery` setting, and its summary and getting-started hints SHALL name skills, never `/opsx:` commands. Command files a re-run finds are handled as update handles them: generated ones removed, edited ones kept and listed.

#### Scenario: Any delivery setting

- **GIVEN** the global `delivery` setting is `both`, `skills` or `commands`
- **WHEN** the user runs `openspec init --tools claude,cursor`
- **THEN** skills SHALL be installed and no command file SHALL be written
- **AND** the hint SHALL read `/openspec-propose`

### Requirement: Init refuses retired tools

Init SHALL reject a retired tool id in `--tools` with a message that names why it is retired and the tool to use instead, before writing anything.

#### Scenario: Amazon Q requested

- **WHEN** the user runs `openspec init --tools amazon-q`
- **THEN** init SHALL fail with "Amazon Q Developer is no longer supported" and "Use --tools kiro instead"
- **AND** no file SHALL be written

## REMOVED Requirements

### Requirement: Slash Command Generation

**Reason**: OpenSpec 2.0 installs skills only.

**Migration**: Each `/opsx:<id>` command has a skill with the same instructions; see the table in `docs-lab/help/upgrade-to-2.md`.
