## ADDED Requirements

### Requirement: Oh My Pi command file generation
OpenSpec SHALL generate command files for Oh My Pi in `.omp/commands/opsx-<id>.md`, one per active workflow command.

Each file SHALL include a YAML frontmatter block with a `description` field. The command body SHALL transform `/opsx:` references to `/opsx-` to match Oh My Pi's filename-based slash command naming (e.g., `opsx-propose.md` → `/opsx-propose`). It SHALL inject `**Provided arguments**: $@` on the line immediately following any `**Input**:` heading, unless `$@` or `$ARGUMENTS` is already present in the body.

#### Scenario: Command file path follows OMP convention
- **WHEN** OpenSpec generates a command file for Oh My Pi for workflow command `propose`
- **THEN** the file is written to `.omp/commands/opsx-propose.md`

#### Scenario: Command file format includes description frontmatter
- **WHEN** OpenSpec writes a command file for Oh My Pi
- **THEN** the file begins with a YAML frontmatter block containing only a `description` field
- **AND** the body follows the closing `---`

#### Scenario: Command body uses hyphen-based references
- **WHEN** OpenSpec writes a command file for Oh My Pi whose body contains `/opsx:apply` or similar colon-style references
- **THEN** those references are transformed to `/opsx-apply` in the output file

#### Scenario: Command body exposes user arguments via $@
- **WHEN** OpenSpec writes a command file for Oh My Pi whose body contains a `**Input**:` heading and no existing `$@` or `$ARGUMENTS` reference
- **THEN** `**Provided arguments**: $@` is injected on the line immediately after the `**Input**:` heading
- **AND** when the user invokes `/opsx-propose my-feature`, the agent receives `my-feature` as the value of `$@`

### Requirement: Oh My Pi skill file generation
OpenSpec SHALL generate skill files for Oh My Pi in `.omp/skills/openspec-<id>/SKILL.md`, one per active workflow command.

Skill file bodies SHALL have `/opsx:` references transformed to `/opsx-` so that skill invocations refer to the correct hyphen-based slash command names.

#### Scenario: Skill file path follows OMP convention
- **WHEN** OpenSpec generates a skill file for Oh My Pi for workflow command `explore`
- **THEN** the file is written to `.omp/skills/openspec-explore/SKILL.md`

#### Scenario: Skill body uses hyphen-based references
- **WHEN** OpenSpec writes a skill file for Oh My Pi whose body contains `/opsx:explore`
- **THEN** the reference is transformed to `/opsx-explore` in the output file

### Requirement: Oh My Pi tool detection
OpenSpec SHALL detect an Oh My Pi installation when the `.omp/` directory exists at the project root, and SHALL present Oh My Pi as a selectable tool in `openspec init` and `openspec update`.

#### Scenario: Auto-detection when .omp directory exists
- **WHEN** the project root contains a `.omp/` directory
- **THEN** Oh My Pi is listed as a detected tool during `openspec init` and `openspec update`

#### Scenario: Oh My Pi appears in the tool selection list
- **WHEN** a user runs `openspec init` interactively
- **THEN** Oh My Pi appears as a selectable option in the tool list
