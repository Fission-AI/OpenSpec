## Why

Hermes Agent is an open-source AI agent framework by Nous Research that runs in the terminal, messaging platforms, and IDEs. It is in the same category as Claude Code, Codex, and Gemini CLI — all already supported by OpenSpec. Hermes users cannot use `openspec init --tools hermes` because Hermes is absent from the supported tool list.

Unlike existing supported tools, Hermes discovers skills from a user-global directory (`~/.hermes/skills/`) rather than a project-local path. OpenSpec's current architecture assumes `skillsDir` serves double duty — both detection marker and installation target — which breaks for global-scope tools. This change introduces a generic `installDir` field to separate installation path from detection path, enabling Hermes support and any future global-scope agent.

## What Changes

- Add `installDir` optional field to `AIToolOption` interface — when set, skills are installed to the specified (global) path instead of `<projectRoot>/<skillsDir>/skills`. The `~` prefix is expanded to the user's home directory.
- Add Hermes Agent to `AI_TOOLS` with `skillsDir: '.hermes'` (project-local marker for detection) and `installDir: '~/.hermes/skills'` (global installation target). No command adapter — Hermes invokes skills via `/skill:openspec-*` in-session, matching the Kimi/ForgeCode/Vibe pattern.
- When `installDir` is set, `init` and `update` create a project-local marker directory (`.hermes/skills/`) so detection and update-bookkeeping know the tool is configured for this project, while skills are written to the global directory where Hermes discovers them.
- `getToolSkillStatus` uses the marker directory (not the global install path) to determine "configured" for global-install tools, preventing global skills from polluting project-level tool detection.
- Add `resolveSkillsDir()` and `resolveMarkerDir()` helper functions in `tool-detection.ts` as the single source of truth for path resolution, replacing inline `path.join(projectPath, tool.skillsDir, 'skills')` calls across `init.ts`, `update.ts`, `profile-sync-drift.ts`, and `migration.ts`.
- Update `docs/supported-tools.md` with Hermes Agent row, tool ID, and footnotes.
- No command adapter is added — Hermes exposes skills dynamically as `/skill:<name>`.

## Capabilities

### New Capabilities

_None._

### Modified Capabilities

- `ai-tool-paths`: define the `.hermes` skills root and `~/.hermes/skills` global install path for Hermes Agent.
- `cli-init`: clarify that tools with `installDir` install skills to a global path while creating a project-local marker directory for detection.
- `cli-update`: skill regeneration for `installDir` tools writes to the global path and maintains the project-local marker.

## Impact

- `src/core/config.ts` — add `installDir` field to `AIToolOption`; add Hermes Agent entry to `AI_TOOLS`.
- `src/core/shared/tool-detection.ts` — add `resolveSkillsDir()` and `resolveMarkerDir()` helpers; update `getToolSkillStatus` to use marker directory for global-install tools; update `getToolVersionStatus` to read version from the resolved (global) path.
- `src/core/shared/index.ts` — export new helpers.
- `src/core/init.ts` — use `resolveSkillsDir`/`resolveMarkerDir`; create marker directory for `installDir` tools.
- `src/core/update.ts` — use `resolveSkillsDir`/`resolveMarkerDir`; create marker directory for `installDir` tools (two call sites).
- `src/core/profile-sync-drift.ts` — use `resolveSkillsDir` (two call sites).
- `src/core/migration.ts` — use `resolveSkillsDir`.
- `docs/supported-tools.md` — add Hermes Agent row, tool ID, footnotes.
- `test/core/available-tools.test.ts` — add Hermes detection test.
- `test/core/shared/tool-detection.test.ts` — add `resolveSkillsDir`, `resolveMarkerDir`, Hermes `getToolSkillStatus`/`getToolVersionStatus` tests.

## Non-Goals

- Adding a Hermes command adapter (`src/core/command-generation/adapters/hermes.ts`).
- Changing Hermes itself to support project-level skill discovery — that is a Hermes feature, not an OpenSpec concern.
- Reworking `delivery=commands` behavior for global-install tools.
