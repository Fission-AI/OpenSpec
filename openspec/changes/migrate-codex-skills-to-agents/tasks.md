## 1. Path Metadata

- [x] 1.1 Set Codex `skillsDir` to `.agents` in the supported tool configuration.
- [x] 1.2 Add explicit legacy Codex skill metadata for `.codex`.
- [x] 1.3 Ensure tool detection recognizes both `.agents/skills` and `.codex/skills` as Codex configuration signals.
- [x] 1.4 Verify all Codex skill paths are built with `path.join()` or existing cross-platform file-system helpers.

## 2. Migration And Cleanup

- [x] 2.1 Add a helper that lists known OpenSpec-managed Codex skill directories from existing workflow or skill constants.
- [x] 2.2 Update init so Codex writes skills to `.agents/skills`.
- [x] 2.3 Update init so managed legacy `.codex/skills/openspec-*` directories are removed only after successful `.agents/skills` generation.
- [x] 2.4 Update update so legacy `.codex/skills` installs are refreshed under `.agents/skills`.
- [x] 2.5 Update update so unmanaged `.codex/skills` content is preserved.
- [x] 2.6 Report legacy Codex skill migration or cleanup in init/update output.
- [x] 2.7 Update workspace setup so Codex workspace skills write to `.agents/skills` and managed legacy `.codex/skills/openspec-*` directories are removed only after successful generation.
- [x] 2.8 Update workspace update so legacy Codex workspace skills are refreshed under `.agents/skills`, managed legacy `.codex/skills/openspec-*` directories are removed after successful generation, and unmanaged `.codex/skills` content is preserved.
- [x] 2.9 Report legacy Codex workspace skill migration or cleanup in workspace setup/update output, including JSON output.

## 3. Documentation

- [x] 3.1 Update supported-tool docs so Codex skills point to `.agents/skills/openspec-*/SKILL.md`.
- [x] 3.2 Remove or reframe `.codex/skills` references so they appear only as legacy migration notes.
- [x] 3.3 Update Codex setup, update, and troubleshooting guidance to use `.agents/skills`.
- [x] 3.4 Keep non-Codex tool path docs unchanged.

## 4. Tests

- [x] 4.1 Add tests that `AI_TOOLS` returns Codex `skillsDir: '.agents'` with legacy `.codex/skills` detection.
- [x] 4.2 Add init tests proving Codex generates `.agents/skills` and not `.codex/skills`.
- [x] 4.3 Add init/update tests proving managed legacy `.codex/skills/openspec-*` directories are removed after successful migration.
- [x] 4.4 Add tests proving unmanaged `.codex/skills` content remains untouched.
- [x] 4.5 Add Windows-style path assertions for Codex current and legacy skill paths.
- [x] 4.6 Run `pnpm run build`, `pnpm run lint`, and focused Vitest suites for config, available-tools, tool detection, init, update, workspace skills, and docs-related snapshots if present.
- [x] 4.7 Add workspace setup/update tests proving managed legacy `.codex/skills/openspec-*` directories are removed after successful workspace Codex migration.
- [x] 4.8 Add workspace setup/update tests proving unmanaged legacy `.codex/skills` content remains untouched and failed workspace Codex migration leaves legacy content untouched.
