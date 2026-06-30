## Context

Codex is currently represented as both a skill-capable tool and a command-file target. Its command adapter writes `opsx-<workflow>.md` files to the global Codex prompt directory resolved from `CODEX_HOME` or the user's default `.codex` home. That means `openspec init` and `openspec update` can mutate files outside the project, and users can believe a project-local setup succeeded while the observable Codex surface depends on stale global prompt files.

Codex custom prompts are now deprecated in favor of skills, while OpenSpec already generates `.codex/skills/openspec-*/SKILL.md` as the supported workflow surface. This change removes Codex from the generated command adapter surface and treats Codex as a `skills-invocable` tool even when the user's global delivery mode includes commands.

## Goals / Non-Goals

**Goals:**

- Stop generating or refreshing Codex custom prompt files during `openspec init` and `openspec update`.
- Keep Codex usable through `.codex/skills/openspec-*/SKILL.md` for `both`, `skills`, and `commands` delivery settings.
- Remove stale OpenSpec-managed global Codex prompt files from the global Codex prompt directory during safe cleanup flows while keeping repo-local `.codex/prompts/openspec-*.md` compatibility cleanup.
- Update user-facing documentation and tests so Codex is documented as skills-only.

**Non-Goals:**

- Do not remove Codex as a supported AI tool.
- Do not remove command generation for other tools that still support prompt or command files.
- Do not delete arbitrary user-authored Codex prompt files; cleanup is limited to the final OpenSpec-managed prompt patterns in each scope.
- Do not change Codex workspace opener behavior.

## Decisions

### Decision: Remove Codex from the command adapter registry

Codex should no longer have a registered command adapter. This makes the command-generation layer reflect supported behavior: `CommandAdapterRegistry.get('codex')` returns undefined, and command generation callers skip command-file output for Codex.

Alternative considered: keep the adapter but gate writes in `init` and `update`. That leaves stale API surface and tests that imply Codex custom prompts are supported. Removing the adapter is clearer and matches adapterless skills-only tools.

### Decision: Treat Codex as skills-invocable regardless of delivery mode

Global delivery expresses the preferred output surfaces for tools that support both surfaces. For Codex, the only supported command surface is invocable skills. When a selected or configured Codex tool is processed under `commands` delivery, OpenSpec should still generate and preserve Codex skills while skipping Codex command files.

Alternative considered: let `commands` delivery remove Codex skills because there is no adapter. That would make selecting Codex produce no usable output, which contradicts the proposal and creates a poor migration path.

This should reuse the shared command-surface capability model from `add-tool-command-surface-capabilities` if that change lands first. If this change lands first, it should introduce only a shared minimal resolver that can later become the broader capability model; it should not add a Codex-only predicate that `init` and `update` special-case forever.

This follows the adapterless integration boundary for skills-only tools: do not add a fake command adapter or generated command path when the tool's real invocation surface is discovered skills. Codex also has existing managed global prompt files to retire; those global files are handled as legacy cleanup artifacts, not as ordinary delivery-reconciliation command files.

### Decision: Split global and repo-local Codex cleanup patterns by their final managed names

Cleanup should resolve the Codex prompt directory with the same `CODEX_HOME` fallback semantics that command generation used, then remove globally managed OpenSpec prompt files matching `opsx-*.md`. Repo-local compatibility cleanup should continue matching `.codex/prompts/openspec-*.md` inside the project tree. This reflects the final managed names left behind by the Codex adapter history: recent global prompt generation used `opsx-*`, while older local compatibility cleanup still needs to catch project-local `openspec-*` artifacts.

Alternative considered: explicit filename allowlist per workflow ID. That requires maintaining a separate constant synchronized with the workflow list whenever a new workflow is added. The final glob split avoids that double-maintenance cost while still excluding user-authored prompts that do not match the managed `opsx-*` global convention or the project-local `.codex/prompts/openspec-*` compatibility convention.

### Decision: Global Codex prompts are handled by legacy cleanup detection

Managed global Codex prompt files should not create a separate cleanup branch in `init` or `update`. `detectLegacyArtifacts(projectPath)` detects globally managed `opsx-*` prompt files as legacy command artifacts, and `cleanupLegacyArtifacts(projectPath, detection)` removes them when that command's normal cleanup flow runs. Non-interactive `openspec init` already auto-cleans OpenSpec-managed artifacts, so it also removes those managed global Codex prompt files. Non-interactive `openspec update` without `--force` keeps its existing broader behavior: it warns about legacy artifacts and does not run cleanup.

The adapterless command-skip path must not by itself delete files from `$CODEX_HOME/prompts`. Global Codex prompt deletion is only part of legacy artifact cleanup, not ordinary delivery reconciliation.

Implementation note: model project-local and global legacy prompt surfaces separately. Keep project-root slash-command paths in `LEGACY_SLASH_COMMAND_PATHS`, including `.codex/prompts/openspec-*.md` compatibility cleanup, and represent Codex's external prompt home in a separate `LEGACY_GLOBAL_SLASH_COMMAND_PATHS` table that resolves `$CODEX_HOME/prompts` (or `~/.codex/prompts` when unset) for globally managed `opsx-*.md` files. `detectLegacyArtifacts()` should keep those managed global prompt files separate from repo-local slash command files via `globalSlashCommandFiles`. This keeps the local-path registry scoped to repository artifacts while still letting standard legacy cleanup detect and remove the final managed global Codex prompt files.

### Decision: Keep legacy project-local `.codex/prompts` cleanup as compatibility cleanup

Existing cleanup already detects `.codex/prompts/openspec-*.md` in the project tree. That should remain for older or manually migrated projects, but it is insufficient for this change because recent Codex prompt generation used the global Codex home.

Alternative considered: replace project-local detection with global-only detection. Keeping both avoids regressions for users with older project-local artifacts.

## Risks / Trade-offs

- [Risk] Users with custom workflows that rely on Codex custom prompts will lose refreshed prompt files. -> Mitigation: document the breaking change and point Codex users to `.codex/skills/openspec-*`.
- [Risk] `delivery=commands` semantics become per-tool rather than purely global. -> Mitigation: document Codex as a `skills-invocable` command-surface tool and test commands-only Codex init/update.
- [Risk] Cleanup touches a global directory. -> Mitigation: remove only globally managed `opsx-*.md` files under the resolved Codex prompt home, keep repo-local `.codex/prompts/openspec-*.md` cleanup scoped to the project tree, and honor `CODEX_HOME` in tests.
- [Risk] Registry tests or docs may still assume Codex has a command adapter. -> Mitigation: update adapter, registry, supported-tools, troubleshooting, and migration docs in the same change.
- [Risk] This overlaps with `add-tool-command-surface-capabilities`. -> Mitigation: represent Codex with the same `skills-invocable` concept and rebase whichever change lands second.
