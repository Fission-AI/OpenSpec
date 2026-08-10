## 1. Tool Metadata

- [x] 1.1 Add `Grok Build` to `src/core/config.ts` with `value: 'grok'`, `successLabel: 'Grok Build'`, and `skillsDir: '.grok'` (alphabetically near related tools)

## 2. Documentation

- [x] 2.1 Update `docs/supported-tools.md` with a Grok Build row (`skillsDir` `.grok`, no command adapter; skill-based `/openspec-*` invocations) and add `grok` to the `--tools` list
- [x] 2.2 Update `docs/commands.md` to document Grok Build skill invocations such as `/openspec-propose`, `/openspec-apply-change`
- [x] 2.3 Update `docs/how-commands-work.md` slash-syntax table to include Grok Build (`/openspec-*` skill form)
- [x] 2.4 Update `docs/cli.md` so the supported `--tools` list includes `grok`
- [x] 2.5 Update `docs/troubleshooting.md` skills-only tool list to include Grok Build

## 3. Tests

- [x] 3.1 Add a targeted init regression test for `--tools grok` with `delivery=both`: skills under `.grok/skills/...`, no `.grok/commands`, and commands-skipped log for `grok` `(no adapter)` using relaxed log matching and `path.join` expectations

## 4. Release Notes

- [x] 4.1 Add a changeset noting Grok Build as a supported skills-only tool via `.grok/skills/`

## 5. Validation

- [x] 5.1 Validate the change artifacts with `openspec validate add-grok-build-skills-only-support --strict` (or project-equivalent)
- [x] 5.2 Run targeted tests (`test/core/init.test.ts` Grok case) and fix any regressions
