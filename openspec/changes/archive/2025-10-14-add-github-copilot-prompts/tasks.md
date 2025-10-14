## Implementation Tasks

- [x] Create `src/core/configurators/slash/github-copilot.ts` implementing `SlashCommandConfigurator` base class
  - Implement `getRelativePath()` to return `.github/prompts/openspec-{proposal,apply,archive}.prompt.md`
  - Implement `getFrontmatter()` to generate YAML frontmatter with `description` field and include `$ARGUMENTS` placeholder
  - Implement `generateAll()` to create `.github/prompts/` directory and write three prompt files with frontmatter, markers, and shared template bodies
  - Implement `updateExisting()` to refresh only the managed block between markers while preserving frontmatter
  - Set `toolId = "github-copilot"` and `isAvailable = true`

- [x] Register GitHub Copilot configurator in `src/core/configurators/slash/registry.ts`
  - Import `GitHubCopilotSlashCommandConfigurator`
  - Add to `SLASH_COMMAND_CONFIGURATORS` array
  - Update tool picker display name to "GitHub Copilot"

- [x] Update `src/core/init.ts` to include GitHub Copilot in the AI tool selection prompt
  - Add GitHub Copilot to the available tools list with detection for existing `.github/prompts/openspec-*.prompt.md` files
  - Display "(already configured)" when prompt files exist

- [x] Update `src/core/update.ts` to refresh GitHub Copilot prompts when they exist
  - Call `updateExisting()` for GitHub Copilot configurator when `.github/prompts/` contains OpenSpec prompt files

- [x] Add integration tests for GitHub Copilot slash command generation
  - Test `generateAll()` creates three prompt files with correct structure (frontmatter + markers + body)
  - Test `updateExisting()` preserves frontmatter and only updates managed blocks
  - Test that missing prompt files are not created during update

- [x] Update documentation
  - Add GitHub Copilot to README slash-command support table
  - Document `.github/prompts/` as the discovery location
  - Add CHANGELOG entry for GitHub Copilot support
