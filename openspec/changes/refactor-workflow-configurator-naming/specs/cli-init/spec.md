## MODIFIED Requirements

### Requirement: Slash Command Configuration

The init command SHALL generate workflow configuration files for supported editors using shared templates.

#### Scenario: Generating workflow files for Claude Code

- **WHEN** the user selects Claude Code during initialization
- **THEN** create `.claude/commands/openspec/proposal.md`, `.claude/commands/openspec/apply.md`, and `.claude/commands/openspec/archive.md`
- **AND** populate each file from shared templates so command text matches other tools
- **AND** each template includes instructions for the relevant OpenSpec workflow stage

#### Scenario: Generating workflow files for Amp

- **WHEN** the user selects Amp during initialization
- **THEN** create `.agents/skills/openspec-proposal/SKILL.md`, `.agents/skills/openspec-apply/SKILL.md`, and `.agents/skills/openspec-archive/SKILL.md`
- **AND** populate each file with YAML frontmatter containing `name` and `description` fields
- **AND** wrap the body in OpenSpec markers so `openspec update` can refresh the content
- **AND** each template includes instructions for the relevant OpenSpec workflow stage

#### Scenario: Generating workflow files for Codex

- **WHEN** the user selects Codex during initialization
- **THEN** create global prompt files at `~/.codex/prompts/openspec-proposal.md`, `~/.codex/prompts/openspec-apply.md`, and `~/.codex/prompts/openspec-archive.md` (or under `$CODEX_HOME/prompts` if set)
- **AND** populate each file from shared templates that map the first numbered placeholder (`$1`) to the primary user input (e.g., change identifier or question text)
- **AND** wrap the generated content in OpenSpec markers so `openspec update` can refresh the prompts without touching surrounding custom notes

#### Scenario: Generating workflow files for GitHub Copilot

- **WHEN** the user selects GitHub Copilot during initialization
- **THEN** create `.github/prompts/openspec-proposal.prompt.md`, `.github/prompts/openspec-apply.prompt.md`, and `.github/prompts/openspec-archive.prompt.md`
- **AND** populate each file with YAML frontmatter containing a `description` field that summarizes the workflow stage
- **AND** include `$ARGUMENTS` placeholder to capture user input
- **AND** wrap the shared template body with OpenSpec markers so `openspec update` can refresh the content
- **AND** each template includes instructions for the relevant OpenSpec workflow stage

#### Scenario: Generating workflow files for Gemini CLI

- **WHEN** the user selects Gemini CLI during initialization
- **THEN** create `.gemini/commands/openspec/proposal.toml`, `.gemini/commands/openspec/apply.toml`, and `.gemini/commands/openspec/archive.toml`
- **AND** populate each file as TOML that sets a stage-specific `description = "<summary>"` and a multi-line `prompt = """` block with the shared OpenSpec template
- **AND** wrap the OpenSpec managed markers (`<!-- OPENSPEC:START -->` / `<!-- OPENSPEC:END -->`) inside the `prompt` value so `openspec update` can safely refresh the body between markers without touching the TOML framing
- **AND** ensure the workflow copy matches the existing proposal/apply/archive templates used by other tools
