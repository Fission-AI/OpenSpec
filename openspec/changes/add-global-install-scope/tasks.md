## 1. Global Config + Validation

- [ ] 1.1 Add `installScope` (`global` | `project`) to `GlobalConfig` with explicit `global` default for newly created configs
- [ ] 1.2 Update config schema validation and known-key checks to include install scope
- [ ] 1.3 Add schema-evolution tests ensuring missing `installScope` in legacy configs resolves to effective `project` until explicit migration
- [ ] 1.4 Extend `openspec config list` output to show install scope and source (`explicit`, `new-default`, `legacy-default`)

## 2. Tool Capability Metadata + Resolvers

- [ ] 2.1 Extend `AI_TOOLS` metadata to declare scope support per surface (skills/commands)
- [ ] 2.2 Add shared install-target resolver for skills and commands using requested scope + tool support
- [ ] 2.3 Implement deterministic fallback/error behavior when preferred scope is unsupported, including default behavior when scope support metadata is absent
- [ ] 2.4 Add unit tests for scope resolution (preferred, fallback, and hard-fail paths)

## 3. Command Generation Contract

- [ ] 3.1 Update `ToolCommandAdapter` path contract to accept install context
- [ ] 3.2 Update `generateCommand`/`generateCommands` to pass context through adapters
- [ ] 3.3 Migrate all command adapters to the new path contract
- [ ] 3.4 Update adapter tests for scoped path behavior (including Codex global path semantics)

## 4. Init Command Scope Support

- [ ] 4.1 Add scope override flag to `openspec init` (`--scope global|project`)
- [ ] 4.2 Resolve effective scope per tool/surface before writing artifacts
- [ ] 4.3 Apply scope-aware generation/removal planning for skills and commands
- [ ] 4.4 Surface effective scope decisions and fallback notes in init summary output
- [ ] 4.5 Add init tests for global default, project override, and fallback/error scenarios

## 5. Update Command Scope Support

- [ ] 5.1 Add scope override flag to `openspec update` (`--scope global|project`)
- [ ] 5.2 Make configured-tool detection and drift checks scope-aware
- [ ] 5.3 Persist and read last successful effective scope per tool/surface for deterministic scope-drift detection
- [ ] 5.4 Apply scope-aware sync/removal with consistent fallback/error behavior
- [ ] 5.5 Ensure scope changes update managed files in new targets and clean old managed targets safely
- [ ] 5.6 Add update tests for global/project/fallback/error and repeat-run idempotency

## 6. Config UX

- [ ] 6.1 Extend `openspec config profile` interactive flow to select install scope
- [ ] 6.2 Preserve install scope when using preset shortcuts unless explicitly changed
- [ ] 6.3 Ensure non-interactive config behavior remains deterministic with clear errors
- [ ] 6.4 Add/adjust config command tests for install scope flows
- [ ] 6.5 Add migration UX for legacy users to opt into `global` scope explicitly

## 7. Documentation

- [ ] 7.1 Update `docs/supported-tools.md` with scope behavior and effective-scope fallback notes
- [ ] 7.2 Update `docs/cli.md` examples for init/update scope options
- [ ] 7.3 Document cross-project implications of global installs
- [ ] 7.4 Add existing-user migration guide covering legacy-default behavior and explicit opt-in to `installScope: global`

## 8. Verification

- [ ] 8.1 Run targeted tests for config, adapters, init, and update
- [ ] 8.2 Run full test suite (`pnpm test`) and resolve regressions
- [ ] 8.3 Manual smoke test: init/update with `installScope=global`
- [ ] 8.4 Manual smoke test: init/update with `--scope project`
- [ ] 8.5 Verify path resolution behavior on Windows CI (or cross-platform unit tests with mocked Windows paths)
- [ ] 8.6 Verify combined behavior matrix for mixed tools across scope × delivery × command-surface capability
