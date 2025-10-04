## 1. Slash command scaffolding
- [ ] 1.1 Add a Gemini CLI entry to the slash command registry with a `GeminiSlashCommandConfigurator` that maps `proposal`, `apply`, and `archive` to `.gemini/commands/openspec/*.toml`.
- [ ] 1.2 Reuse existing slash command templates for the prompt bodies and ensure they are wrapped by OpenSpec markers inside the TOML `prompt` string.
- [ ] 1.3 Define any Gemini-specific metadata (e.g., `description` values) that should live alongside the prompts to improve `/help` readability.

## 2. CLI init integration
- [ ] 2.1 Extend the AI tool selection options to list Gemini CLI as supporting OpenSpec slash commands, including already-configured detection and success messaging.
- [ ] 2.2 Ensure `openspec init` writes the Gemini CLI TOML files when the tool is selected, creating parent directories as needed.

## 3. CLI update integration
- [ ] 3.1 Update the slash command refresh flow so `openspec update` rewrites Gemini CLI TOML prompts only when the files already exist.
- [ ] 3.2 Extend logging to report Gemini slash command updates alongside other tools.

## 4. Tests
- [ ] 4.1 Add Vitest coverage under `test/core/init.test.ts` that verifies the Gemini CLI TOML files are generated with the expected prompts and markers.
- [ ] 4.2 Add Vitest coverage under `test/core/update.test.ts` that confirms existing Gemini TOML files get refreshed while preserving content outside the markers.

## 5. Documentation & polish
- [ ] 5.1 Update README (or other user-facing docs) to mention Gemini CLI slash command support and how the generated files map to `/openspec:*` commands.
- [ ] 5.2 Document any Gemini-specific limitations or follow-up work (e.g., handling of folder trust) if discovered during implementation.
