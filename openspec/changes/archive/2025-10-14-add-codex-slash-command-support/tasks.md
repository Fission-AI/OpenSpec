## 1. CLI integration
- [x] 1.1 Add Codex to the init tool picker with display text that clarifies prompts live in the global `.codex/prompts/` directory and implement "already configured" detection by checking for managed Codex prompt files.
- [x] 1.2 Implement a `CodexSlashCommandConfigurator` that writes `.codex/prompts/openspec-{proposal,apply,archive}.md`, ensuring the prompt directory exists and wrapping content in OpenSpec markers.
// (No helper command required)
- [x] 1.3 Register the configurator with the slash-command registry and include Codex in init/update wiring so both commands invoke the new configurator when appropriate.

## 2. Prompt templates
- [x] 2.1 Extend the shared slash-command templates (or add a Codex-specific wrapper) to inject numbered placeholders (`$1`, `$2`, …) where Codex expects user-supplied arguments.
- [x] 2.2 Verify generated Markdown stays within Codex's formatting expectations (no front matter, heading-first layout) and matches the problem-analyzer style shown in the reference screenshot.

## 3. Update support & tests
- [x] 3.1 Update the `openspec update` flow to refresh existing Codex prompts without creating new ones when files are missing.
- [x] 3.2 Add integration coverage that exercises init/update against a temporary global Codex prompts directory by setting `CODEX_HOME`, asserting marker preservation and idempotent updates.
- [x] 3.3 Document Codex's global-only discovery and automatic installation in README and CHANGELOG.
- [x] 3.3 Confirm error handling surfaces clear paths when the CLI cannot write to the Codex prompt directory (permissions, missing home directory, etc.).

## 4. Documentation
- [x] 4.1 Document Codex slash-command support in the README and changelog alongside other assistant integrations.
- [x] 4.2 Add a release note snippet that points Codex users to the generated `/openspec-proposal`, `/openspec-apply`, and `/openspec-archive` commands.
