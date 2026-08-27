## 1. Command Adapter Surface

- [x] 1.1 Remove Codex from command adapter registration so `CommandAdapterRegistry.get('codex')` returns undefined.
- [x] 1.2 Remove Codex command adapter exports and delete or retire Codex adapter-specific tests.
- [x] 1.3 Update command-generation types, comments, and examples that describe Codex as a global command target.
- [x] 1.4 Update registry tests to assert Codex is not included in `getAll()` or `has('codex')`.

## 2. Codex Skills-Only Delivery

- [x] 2.1 Reuse the command-surface capability model for Codex by resolving Codex as `skills-invocable`; do not add a Codex-only delivery predicate.
- [x] 2.2 Update `openspec init` generation so Codex skills are created for `both`, `skills`, and `commands` delivery modes.
- [x] 2.3 Update `openspec init` command cleanup so `commands` delivery does not remove Codex OpenSpec skill directories.
- [x] 2.4 Update `openspec update` generation so configured Codex skills are refreshed for `both`, `skills`, and `commands` delivery modes.
- [x] 2.5 Update `openspec update` delivery reconciliation so `commands` delivery does not remove Codex OpenSpec skill directories.
- [x] 2.6 Keep command generation skipped for Codex whenever command generation would otherwise run.
- [x] 2.7 If `add-tool-command-surface-capabilities` has not landed first, stage the smallest shared capability helper needed so Codex and later skills-invocable tools use the same path.

## 3. Legacy Codex Prompt Cleanup

- [x] 3.1 Add final Codex prompt cleanup support: allowlisted globally managed Codex legacy prompt filenames plus repo-local `.codex/prompts/openspec-*.md` compatibility cleanup.
- [x] 3.2 Resolve the global Codex prompt directory from `CODEX_HOME` when set and the default user `.codex/prompts` directory when unset.
- [x] 3.3 Detect exact allowlisted global Codex prompt files under the resolved prompt directory, infer workflow IDs from those filenames, and leave non-allowlisted prompt files untouched.
- [x] 3.4 Remove managed global Codex prompt files only after replacement Codex skills exist for the represented workflows.
- [x] 3.5 Preserve existing project-local `.codex/prompts/openspec-*.md` cleanup compatibility.
- [x] 3.6 Update cleanup summaries to identify removed Codex prompt files as replaced by Codex skills.
- [x] 3.6a Present deferred global prompts cleanup separately from immediate repo-local removals while listing the affected global prompt files.
- [x] 3.7 Ensure non-interactive `openspec init` without `--force` removes only the managed global Codex prompt files whose replacement skills exist and preserves unreplaced prompts.
- [x] 3.8 Ensure non-interactive `openspec update` without `--force` uses the existing legacy-cleanup warning path and leaves legacy files untouched.

## 4. Documentation and Messaging

- [x] 4.1 Update `docs/supported-tools.md` to list Codex as skills-only and remove the `$CODEX_HOME/prompts` command path.
- [x] 4.2 Update command and troubleshooting docs so Codex guidance points to `.codex/skills/openspec-*`.
- [x] 4.3 Update installation or migration guidance to mention managed Codex prompt cleanup and the breaking change.
- [x] 4.4 Update CLI success or skipped-command messaging if needed so Codex users understand skills were installed even when commands are skipped.

## 5. Tests and Validation

- [x] 5.1 Add `openspec init` tests for Codex under `both`, `skills`, and `commands` delivery modes, verifying skills exist and global prompt files are not created.
- [x] 5.2 Add `openspec update` tests for Codex under `both`, `skills`, and `commands` delivery modes, verifying skills are refreshed and not removed by commands-only delivery.
- [x] 5.3 Add cleanup tests for allowlisted managed global Codex prompt files under `CODEX_HOME/prompts`, and verify custom or non-allowlisted prompts remain unmanaged.
- [x] 5.4 Add cleanup tests proving unmanaged files in the Codex prompt directory are preserved.
- [x] 5.5 Add non-interactive init cleanup tests proving managed global Codex prompt files are removed only after replacement skills exist.
- [x] 5.6 Add non-interactive update cleanup tests proving global Codex prompt files are preserved without `--force`.
- [x] 5.7 Add cross-platform path tests that construct Codex cleanup paths with path utilities rather than hardcoded separators.
- [x] 5.8 Update or remove tests that import the removed Codex adapter directly.
- [x] 5.9 Add command-surface tests proving Codex resolves as `skills-invocable` and does not require a command adapter.
- [x] 5.10 Run targeted test suites for command generation, init, update, legacy cleanup, and docs-related snapshots if present.
- [x] 5.11 Run `openspec validate make-codex-skills-only --strict`.

## 6. Review Follow-up

- [x] 6.1 Add `opsx-update.md` to the managed global Codex prompt allowlist and map it to the `update` workflow.
- [x] 6.2 Simplify managed global Codex prompt detection to exact directory and filename allowlisting so prompts from older template revisions still migrate.
- [x] 6.3 Defer approved global Codex prompt cleanup until after configured tools refresh, allowing replacement skills and prompt cleanup to complete in one update run.
- [x] 6.4 Update focused tests and change artifacts for the final allowlist and cleanup ordering behavior.
