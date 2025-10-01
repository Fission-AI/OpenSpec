## 1. Slash command scaffolding
- [ ] 1.1 Add Kilo Code to the slash command template registry with a configurator that maps `plan-change`, `author-proposal`, and `validate-change` to `.kilocode/workflows/*.md`.
- [ ] 1.2 Author Markdown templates for each workflow that include frontmatter descriptions, reminders to gather missing context, and step-by-step OpenSpec guidance wrapped in OpenSpec markers.
- [ ] 1.3 Ensure templates share common snippets where possible so future updates stay consistent across editors.

## 2. CLI init integration
- [ ] 2.1 Extend the AI tool selection menu to list "Kilo Code" alongside existing tools, including already-configured detection and success messaging.
- [ ] 2.2 Ensure `openspec init` writes the Kilo `.kilocode/workflows/` files when the tool is selected, creating parent directories as needed and summarizing the resulting slash commands.

## 3. CLI update integration
- [ ] 3.1 Teach `openspec update` to refresh the Kilo workflow files only when they already exist, preserving content outside OpenSpec markers.
- [ ] 3.2 Extend logging to report Kilo workflow refreshes alongside other tools.

## 4. Documentation & guidance
- [ ] 4.1 Add an integration guide explaining how to enable the Kilo "Run Slash Command" experiment, run `openspec init`, and trigger the generated commands.
- [ ] 4.2 Update README or CLI help output to mention the new Kilo support and link to the guide.

## 5. Tests
- [ ] 5.1 Add Vitest coverage under `test/core/init.test.ts` verifying the `.kilocode/workflows/*.md` files are generated with the expected prompts and markers.
- [ ] 5.2 Add Vitest coverage under `test/core/update.test.ts` confirming existing Kilo files get refreshed while preserving unmanaged sections.
