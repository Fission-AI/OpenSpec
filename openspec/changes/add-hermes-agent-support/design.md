## Context

OpenSpec currently supports 31 AI coding agents via the `AI_TOOLS` array in `config.ts`. Each tool entry has a `skillsDir` field (e.g., `.claude`) that serves two purposes simultaneously:

1. **Detection**: `getAvailableTools()` checks if `<projectRoot>/<skillsDir>` exists to detect the tool.
2. **Installation**: `init` and `update` write skills to `<projectRoot>/<skillsDir>/skills/`.

This dual-purpose design works for all current tools because they all discover skills from a project-local directory. Hermes Agent is different — it discovers skills from a user-global directory (`~/.hermes/skills/`), not from the project tree.

SpecKit (GitHub Spec Kit) already solved this exact problem with a `detect_dir` vs `dir` separation in its integration model. This change ports that pattern to OpenSpec via a generic `installDir` field.

## Goals / Non-Goals

**Goals:**

- Enable `openspec init --tools hermes` to install OpenSpec skills where Hermes discovers them (`~/.hermes/skills/openspec-*/SKILL.md`).
- Maintain correct project-level detection ("is Hermes configured for this project?") without being polluted by global skills that may exist from other projects.
- Introduce a generic mechanism (`installDir`) that any future global-scope agent can use, not a Hermes-specific hack.
- Centralize path resolution in shared helpers to prevent drift across `init`, `update`, `profile-sync-drift`, and `migration`.

**Non-Goals:**

- Adding a Hermes command adapter — Hermes invokes skills via `/skill:openspec-*`, matching the Kimi/ForgeCode/Vibe pattern.
- Modifying Hermes itself to support project-level skill discovery.
- Reworking `delivery=commands` behavior for global-install tools.

## Decisions

### 1. `installDir` field on `AIToolOption`

Add `installDir?: string` to the `AIToolOption` interface. When set, skills are installed to the resolved path (with `~` expansion) instead of `<projectRoot>/<skillsDir>/skills`. When unset, behavior is unchanged.

**Why a new field instead of overloading `skillsDir`:** `skillsDir` is already used for detection by `getAvailableTools()` — pointing it at `~/.hermes/skills` would cause false detection in every project on the machine. Keeping `skillsDir` as the project-local detection marker and adding `installDir` as the optional installation override cleanly separates the two concerns.

**Alternative considered:** SpecKit's `detect_dir` + `dir` pair. This would require two new fields and a larger refactor of every consumer that reads `skillsDir`. A single optional `installDir` override is simpler and sufficient — `skillsDir` already works as the detection marker.

### 2. Project-local marker directory for global-install tools

When `installDir` is set, `init` and `update` create an empty project-local directory at `<projectRoot>/<skillsDir>/skills/` (the marker directory). This serves:

- **Detection**: `getAvailableTools()` finds `.hermes/` and reports Hermes as available.
- **Configuration tracking**: `getToolSkillStatus()` checks the marker directory to determine if Hermes is "configured" for this project, rather than checking the global path (which may contain skills from other projects).
- **Update bookkeeping**: `profile-sync-drift` and `migration` use the marker to know which tools are active.

Hermes itself ignores this directory — skills live in `~/.hermes/skills/`. The marker is purely an OpenSpec bookkeeping artifact.

### 3. `resolveSkillsDir()` and `resolveMarkerDir()` shared helpers

Centralize path resolution in `tool-detection.ts`:

- `resolveSkillsDir(tool, projectRoot)`: returns `installDir` (expanded) if set, else `<projectRoot>/<skillsDir>/skills`.
- `resolveMarkerDir(tool, projectRoot)`: always returns `<projectRoot>/<skillsDir>/skills` (the project-local path, regardless of `installDir`).

All consumers (`init`, `update`, `profile-sync-drift`, `migration`, `tool-detection`) call these helpers instead of inlining `path.join(projectPath, tool.skillsDir, 'skills')`. This prevents drift when a future tool adds `installDir`.

### 4. `getToolSkillStatus` marker-based configured check for global-install tools

For tools with `installDir`, `configured` is determined by marker directory existence, not by checking the global install path. This prevents a machine-wide `~/.hermes/skills/openspec-*` from causing every project to report Hermes as "configured". `skillCount` and `fullyConfigured` still check the global path (when configured) to report accurate skill counts.

### 5. No command adapter

- **No command adapter** — Hermes exposes skills dynamically as `/skill:<name>` in-session. No file-based command directory exists. This matches the Kimi CLI, ForgeCode, and Mistral Vibe pattern — adapterless tools that are valid for skill generation but skip command-file generation.

### 6. Additive/overwrite-only update for global-install tools

When `installDir` is set, `update` and `init` SHALL NOT remove skill directories from the global path. The `removeUnselectedSkillDirs` and `removeSkillDirs` cleanup functions are skipped for global-install tools. Rationale:

- Global skills are shared across all projects on the machine. A per-project profile or delivery change must not delete skills that other projects depend on.
- Hermes has no command adapter — `delivery=commands` cannot substitute skills with commands. Deleting skills leaves the user with nothing.
- Residual skill directories (not in the current profile) are harmless — Hermes displays them as available, and their content remains valid.

**What still happens during update for global-install tools:**
- Overwrite existing skill files with new version content ✓
- Create newly-selected skill directories ✓
- Create/maintain the project-local marker directory ✓

**What is skipped:**
- `removeUnselectedSkillDirs` — no deletion of non-profile skill dirs
- `removeSkillDirs` — no deletion on delivery=commands switch

For project-local tools (no `installDir`), deletion behavior is unchanged.

## Risks / Trade-offs

- **Global skills are shared across projects**: Running `openspec init --tools hermes` in project A installs skills globally; project B on the same machine will see those skills too. This is inherent to Hermes's global discovery model and matches how Hermes users already manage skills. The marker directory correctly scopes "configured for this project" detection.

- **`openspec update` overwrites global skills**: If two projects use different OpenSpec versions, updating one overwrites the global skill files. This is acceptable because OpenSpec skills are version-pinned — all projects should use the same OpenSpec version. Skill directories not in the current profile are left in place (additive-only); they remain valid but may appear as "extra" workflows to Hermes.

- **`getToolSkillStatus` reads from global path for `skillCount`**: This means `skillCount` may report non-zero even in a fresh project if global skills exist. The `configured` flag correctly uses the marker, so this only affects display, not detection logic.
