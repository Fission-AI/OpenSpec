## 1. Extend supported tool metadata

- [x] 1.1 Add DeepSeek TUI to `src/core/config.ts` `AI_TOOLS` using the same metadata shape as tools like `claude` (`value`, `name`, `successLabel`, `skillsDir`), with `value: 'deepseek'` and `skillsDir: '.deepseek'`.
- [x] 1.2 Ensure DeepSeek TUI is included in interactive tool lists and `--tools` validation/available-values messaging.

## 2. Wire generation and init summaries

- [x] 2.1 Integrate DeepSeek TUI into skill generation routing so init writes workflow files to `<projectRoot>/.deepseek/skills/` using existing templates/profile rules.
- [x] 2.2 Preserve adapter-gated command generation: when DeepSeek has no command adapter, skip command files and include DeepSeek in the "commands skipped" summary.
- [x] 2.3 Ensure init success output classifies DeepSeek correctly in created/refreshed/skipped tool summaries.
- [x] 2.4 Update documentation (`docs/supported-tools.md` and `docs/cli.md`) so DeepSeek appears in supported tool IDs and usage guidance consistently with other tools.
- [x] 2.5 Confirm DeepSeek integration does not apply tool-specific command-body transforms used by other adapters (e.g., OpenCode/Pi), unless explicitly required by DeepSeek CLI behavior.

## 3. Verify behavior with automated tests

- [x] 3.1 Add/extend init tests for interactive and non-interactive selection to confirm DeepSeek is accepted and processed as a supported tool.
- [x] 3.2 Add/extend tests validating `.deepseek/skills` output paths and adapterless command-skip behavior/summary output when DeepSeek is selected.
- [x] 3.3 Add or update cross-platform-safe path assertions (using `path.join`/`path.resolve`) and run the relevant Windows CI-targeted test coverage for changed init paths.
- [x] 3.4 Add a small parity test matrix (or table-driven case) comparing DeepSeek against representative existing tools: one adapter-backed tool (`codex` or `cursor`) and one adapterless tool (`kimi` or `trae`), to lock in consistent init semantics.
