## 1. CLI scaffolding command
- [ ] 1.1 Register an `openspec scaffold` command in the CLI entrypoint with `change-id` argument validation.
- [ ] 1.2 Implement generator logic that copies the default change template bundle (`proposal.md`, `tasks.md`, optional `design.md`, `specs/README.md`) into `openspec/changes/<id>/`, creating the directory tree in a single pass.
- [ ] 1.3 Detect when `openspec/changes/<id>/` already exists and exit with a clear error instead of overwriting user files.

## 2. Templates and documentation
- [ ] 2.1 Update `openspec/AGENTS.md` quick reference so agents see `openspec scaffold` before drafting files manually.
- [ ] 2.2 Refresh CLI docs/README/help text to mention the scaffold workflow, template bundle contents, and when to add spec deltas manually.

## 3. Test coverage
- [ ] 3.1 Add unit tests covering name validation, template copying, and existing-directory failures.
- [ ] 3.2 Add integration coverage ensuring a freshly scaffolded change (without deltas) passes `openspec validate --strict` until the author customizes it.
