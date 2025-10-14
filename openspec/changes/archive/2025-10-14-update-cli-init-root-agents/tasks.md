## 1. Implementation
- [x] 1.1 Refactor `openspec init` to always generate the root `AGENTS.md` stub (initial run and extend mode) via shared helper logic.
- [x] 1.2 Rework the AI tool selection wizard to surface "Natively supported" vs "Other tools" groupings and make the stub non-optional.
- [x] 1.3 Update CLI messaging, templates, and configurators so the new flow stays in sync across init and update commands.
- [x] 1.4 Refresh unit/integration tests to cover the unconditional stub and the regrouped prompt layout.
- [x] 1.5 Update documentation, README snippets, and CHANGELOG entries that mention the opt-in `AGENTS.md` experience.

## 2. Validation
- [x] 2.1 Run `pnpm test` targeting CLI init/update suites.
- [x] 2.2 Execute `openspec validate update-cli-init-root-agents --strict`.
- [x] 2.3 Perform a manual smoke test: run `openspec init` in a temp directory, confirm stub + grouped prompts, rerun in extend mode.
