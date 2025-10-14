## Why
- GitHub Copilot supports custom slash commands through markdown files in `.github/prompts/<name>.prompt.md`. Each file includes YAML frontmatter with a `description` label and uses `$ARGUMENTS` to capture user input. This format allows teams to expose curated workflows directly in Copilot's chat interface.
- Teams already rely on OpenSpec to manage slash-command configurations for Claude Code, Cursor, OpenCode, Codex, Kilo Code, and Windsurf. Excluding GitHub Copilot forces developers to manually maintain OpenSpec prompts in `.github/prompts/`, which leads to drift and undermines OpenSpec's "single source of truth" promise.
- GitHub Copilot discovers prompts from the repository's `.github/prompts/` directory, making it straightforward to version control and share across the team. Adding automated generation and refresh through `openspec init` and `openspec update` eliminates manual synchronization and keeps OpenSpec instructions consistent across all AI assistants.

## What Changes
- Add GitHub Copilot to the `openspec init` tool picker with "already configured" detection similar to other editors, wiring an implementation that writes managed Markdown prompt files to `.github/prompts/` with OpenSpec marker blocks.
- Generate three GitHub Copilot prompt files—`openspec-proposal.prompt.md`, `openspec-apply.prompt.md`, and `openspec-archive.prompt.md`—whose content mirrors shared slash-command templates while conforming to Copilot's frontmatter and `$ARGUMENTS` placeholder convention.
- Document GitHub Copilot's repository-based discovery and that OpenSpec writes prompts to `.github/prompts/` with managed blocks.
- Teach `openspec update` to refresh existing GitHub Copilot prompts in-place (only when they already exist) in the repository's `.github/prompts/` directory.
- Document GitHub Copilot support alongside other slash-command integrations and add test coverage that exercises init/update behavior for `.github/prompts/` files.

## Impact
- Specs: `cli-init`, `cli-update`
- Code: `src/core/configurators/slash/github-copilot.ts` (new), `src/core/configurators/slash/registry.ts`, `src/core/templates/slash-command-templates.ts`, CLI tool summaries, docs
- Tests: integration coverage for GitHub Copilot prompt scaffolding and refresh logic
- Docs: README and CHANGELOG entries announcing GitHub Copilot slash-command support

## Current Spec Reference
- `specs/cli-init/spec.md`
  - Requirements cover init UX, directory scaffolding, AI tool configuration, and existing slash-command support for Claude Code, Cursor, OpenCode, Codex, Kilo Code, and Windsurf.
  - Our `## MODIFIED` delta in `changes/.../specs/cli-init/spec.md` will copy the full "Slash Command Configuration" requirement (header, description, and all scenarios) before appending the new GitHub Copilot scenario so archiving retains every prior scenario.
- `specs/cli-update/spec.md`
  - Requirements define update preconditions, template refresh behavior, and slash-command refresh logic for existing tools.
  - The corresponding delta preserves the entire "Slash Command Updates" requirement while adding the GitHub Copilot refresh scenario, ensuring the archive workflow replaces the block without losing existing scenarios or the "Missing slash command file" guardrail.
