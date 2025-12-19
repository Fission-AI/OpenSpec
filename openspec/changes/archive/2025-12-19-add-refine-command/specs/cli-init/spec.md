## MODIFIED Requirements
### Requirement: Slash Command Configuration
The init command SHALL generate slash command files for supported editors using shared templates.

#### Scenario: Generating slash commands for Claude Code
- **WHEN** the user selects Claude Code during initialization
- **THEN** create `.claude/commands/openspec/proposal.md`, `.claude/commands/openspec/apply.md`, `.claude/commands/openspec/refine.md`, and `.claude/commands/openspec/archive.md`
- **AND** populate each file from shared templates so command text matches other tools
- **AND** each template includes instructions for the relevant OpenSpec workflow stage

#### Scenario: Generating slash commands for CodeBuddy Code
- **WHEN** the user selects CodeBuddy Code during initialization
- **THEN** create `.codebuddy/commands/openspec/proposal.md`, `.codebuddy/commands/openspec/apply.md`, `.codebuddy/commands/openspec/refine.md`, and `.codebuddy/commands/openspec/archive.md`
- **AND** populate each file from shared templates so command text matches other tools
- **AND** each template includes instructions for the relevant OpenSpec workflow stage

#### Scenario: Generating slash commands for Cline
- **WHEN** the user selects Cline during initialization
- **THEN** create `.clinerules/openspec-proposal.md`, `.clinerules/openspec-apply.md`, `.clinerules/openspec-refine.md`, and `.clinerules/openspec-archive.md`
- **AND** populate each file from shared templates so command text matches other tools
- **AND** include Cline-specific Markdown heading frontmatter
- **AND** each template includes instructions for the relevant OpenSpec workflow stage

#### Scenario: Generating slash commands for Crush
- **WHEN** the user selects Crush during initialization
- **THEN** create `.crush/commands/openspec/proposal.md`, `.crush/commands/openspec/apply.md`, `.crush/commands/openspec/refine.md`, and `.crush/commands/openspec/archive.md`
- **AND** populate each file from shared templates so command text matches other tools
- **AND** include Crush-specific frontmatter with OpenSpec category and tags
- **AND** each template includes instructions for the relevant OpenSpec workflow stage

#### Scenario: Generating slash commands for Cursor
- **WHEN** the user selects Cursor during initialization
- **THEN** create `.cursor/commands/openspec-proposal.md`, `.cursor/commands/openspec-apply.md`, `.cursor/commands/openspec-refine.md`, and `.cursor/commands/openspec-archive.md`
- **AND** populate each file from shared templates so command text matches other tools
- **AND** each template includes instructions for the relevant OpenSpec workflow stage

#### Scenario: Generating slash commands for Factory Droid
- **WHEN** the user selects Factory Droid during initialization
- **THEN** create `.factory/commands/openspec-proposal.md`, `.factory/commands/openspec-apply.md`, `.factory/commands/openspec-refine.md`, and `.factory/commands/openspec-archive.md`
- **AND** populate each file from shared templates that include Factory-compatible YAML frontmatter for the `description` and `argument-hint` fields
- **AND** include the `$ARGUMENTS` placeholder in the template body so droid receives any user-supplied input
- **AND** wrap the generated content in OpenSpec managed markers so `openspec update` can safely refresh the commands

#### Scenario: Generating slash commands for OpenCode
- **WHEN** the user selects OpenCode during initialization
- **THEN** create `.opencode/commands/openspec-proposal.md`, `.opencode/commands/openspec-apply.md`, `.opencode/commands/openspec-refine.md`, and `.opencode/commands/openspec-archive.md`
- **AND** populate each file from shared templates so command text matches other tools
- **AND** each template includes instructions for the relevant OpenSpec workflow stage

#### Scenario: Generating slash commands for Windsurf
- **WHEN** the user selects Windsurf during initialization
- **THEN** create `.windsurf/workflows/openspec-proposal.md`, `.windsurf/workflows/openspec-apply.md`, `.windsurf/workflows/openspec-refine.md`, and `.windsurf/workflows/openspec-archive.md`
- **AND** populate each file from shared templates (wrapped in OpenSpec markers) so workflow text matches other tools
- **AND** each template includes instructions for the relevant OpenSpec workflow stage

#### Scenario: Generating slash commands for Kilo Code
- **WHEN** the user selects Kilo Code during initialization
- **THEN** create `.kilocode/workflows/openspec-proposal.md`, `.kilocode/workflows/openspec-apply.md`, `.kilocode/workflows/openspec-refine.md`, and `.kilocode/workflows/openspec-archive.md`
- **AND** populate each file from shared templates (wrapped in OpenSpec markers) so workflow text matches other tools
- **AND** each template includes instructions for the relevant OpenSpec workflow stage

#### Scenario: Generating slash commands for Codex
- **WHEN** the user selects Codex during initialization
- **THEN** create global prompt files at `~/.codex/prompts/openspec-proposal.md`, `~/.codex/prompts/openspec-apply.md`, `~/.codex/prompts/openspec-refine.md`, and `~/.codex/prompts/openspec-archive.md` (or under `$CODEX_HOME/prompts` if set)
- **AND** populate each file from shared templates that map the first numbered placeholder (`$1`) to the primary user input (e.g., change identifier or question text)
- **AND** wrap the generated content in OpenSpec markers so `openspec update` can refresh the prompts without touching surrounding custom notes

#### Scenario: Generating slash commands for GitHub Copilot
- **WHEN** the user selects GitHub Copilot during initialization
- **THEN** create `.github/prompts/openspec-proposal.prompt.md`, `.github/prompts/openspec-apply.prompt.md`, `.github/prompts/openspec-refine.prompt.md`, and `.github/prompts/openspec-archive.prompt.md`
- **AND** populate each file with YAML frontmatter containing a `description` field that summarizes the workflow stage
- **AND** include `$ARGUMENTS` placeholder to capture user input
- **AND** wrap the shared template body with OpenSpec markers so `openspec update` can refresh the content
- **AND** each template includes instructions for the relevant OpenSpec workflow stage

#### Scenario: Generating slash commands for Gemini CLI
- **WHEN** the user selects Gemini CLI during initialization
- **THEN** create `.gemini/commands/openspec/proposal.toml`, `.gemini/commands/openspec/apply.toml`, `.gemini/commands/openspec/refine.toml`, and `.gemini/commands/openspec/archive.toml`
- **AND** populate each file as TOML that sets a stage-specific `description = "<summary>"` and a multi-line `prompt = """` block with the shared OpenSpec template
- **AND** wrap the OpenSpec managed markers (`<!-- OPENSPEC:START -->` / `<!-- OPENSPEC:END -->`) inside the `prompt` value so `openspec update` can safely refresh the body between markers without touching the TOML framing
- **AND** ensure the slash-command copy matches the existing proposal/apply/refine/archive templates used by other tools

#### Scenario: Generating slash commands for iFlow CLI
- **WHEN** the user selects iFlow CLI during initialization
- **THEN** create `.iflow/commands/openspec-proposal.md`, `.iflow/commands/openspec-apply.md`, `.iflow/commands/openspec-refine.md`, and `.iflow/commands/openspec-archive.md`
- **AND** populate each file from shared templates so command text matches other tools
- **AND** include YAML frontmatter with `name`, `id`, `category`, and `description` fields for each command
- **AND** wrap the generated content in OpenSpec managed markers so `openspec update` can safely refresh the commands
- **AND** each template includes instructions for the relevant OpenSpec workflow stage

#### Scenario: Generating slash commands for RooCode
- **WHEN** the user selects RooCode during initialization
- **THEN** create `.roo/commands/openspec-proposal.md`, `.roo/commands/openspec-apply.md`, `.roo/commands/openspec-refine.md`, and `.roo/commands/openspec-archive.md`
- **AND** populate each file from shared templates so command text matches other tools
- **AND** include simple Markdown headings (e.g., `# OpenSpec: Proposal`) without YAML frontmatter
- **AND** wrap the generated content in OpenSpec managed markers where applicable so `openspec update` can safely refresh the commands
- **AND** each template includes instructions for the relevant OpenSpec workflow stage
