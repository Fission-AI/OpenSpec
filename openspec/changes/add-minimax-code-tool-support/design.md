## Context

OpenSpec currently treats skill installation as a project-root concern. Tool metadata is centered on `skillsDir`, detection scans project directories, and both `init` and `update` derive skill targets from `path.join(projectRoot, tool.skillsDir, 'skills')`.

MiniMax Code needs a different skill target. Current local verification shows MiniMax Code uses the user's `~/.minimax/skills` location for user-installable skills, and `.mavis` compatibility appears to point at the same backing location. For this change, OpenSpec will target `~/.minimax/skills` directly and will not attempt to discover MiniMax runtime profile or data-dir overrides.

The implementation should stay close to the existing model: keep the common skill generation logic, add a small shared helper for resolving the effective skill directory, and reuse the existing behavior for tools that have skills but no command adapter.

## Goals / Non-Goals

**Goals:**

- Add MiniMax Code as a supported OpenSpec tool target with a stable tool id (`minimax-code`)
- Install MiniMax Code OpenSpec skills into the user's fixed MiniMax Code skill directory (`~/.minimax/skills`)
- Let `openspec init` detect, install, and refresh MiniMax Code skills using that global user-home target
- Let `openspec update` detect an existing MiniMax Code OpenSpec installation and refresh it in place
- Avoid creating repo-local `.minimax` or `.mavis` directories for MiniMax Code
- Keep implementation additive and low-disruption by reusing existing adapterless skills behavior

**Non-Goals:**

- Adding a MiniMax-specific slash-command adapter or command file output path
- Dynamically resolving MiniMax runtime profile or data-dir overrides
- Supporting arbitrary user-entered MiniMax skill paths
- Migrating pre-existing MiniMax user skills that are not OpenSpec-managed
- Redesigning command generation, profile delivery, or all tool metadata beyond what is needed for this fixed global skill target

## Decisions

### 1. Represent MiniMax Code with fixed user-home global skill target metadata

`AI_TOOLS` should gain a minimal `globalSkillsDir` field for tools whose OpenSpec skills are not stored under `<projectRoot>/<skillsDir>/skills`. Existing tools continue using `skillsDir`, while MiniMax Code declares `globalSkillsDir: '.minimax'`.

Call sites that only need to know whether a tool supports skills can use `tool.skillsDir || tool.globalSkillsDir`. Path resolution still needs to distinguish the two fields:

- `skillsDir`: resolve to `<projectRoot>/<skillsDir>/skills`
- `globalSkillsDir`: resolve to `<home>/<globalSkillsDir>/skills`

Why this over a full runtime resolver:

- It keeps this change small and close to the current `skillsDir` model.
- It avoids making synchronous detection/update flows depend on an external MiniMax CLI command.
- It matches current local verification where `.mavis` points to `.minimax`.
- It leaves runtime discovery as a future improvement if real installations require it.

Alternative considered:

- Invoke MiniMax runtime configuration and parse a `dataDir`.
  Deferred because it expands the failure surface and requires stronger knowledge of MiniMax CLI contracts than this first integration needs.

### 2. Add a shared skill directory helper instead of a skill adapter system

OpenSpec does not currently have skill adapters. Skills use common content generation and a tool-level `skillsDir`; only commands have adapters. This change should preserve that shape by adding a small helper that resolves the skill directory for a tool:

- Project-local tools with `skillsDir`: `<projectRoot>/<skillsDir>/skills`
- MiniMax Code with `globalSkillsDir: '.minimax'`: `<home>/.minimax/skills`

Why this approach:

- It keeps `init`, `update`, detection, profile drift, and migration aligned without duplicating path rules.
- It avoids introducing a broader skill adapter abstraction before there is more than one tool-specific skill format.
- It lets MiniMax Code reuse the same skill templates and generated metadata as other tools.

### 3. Treat MiniMax Code as a global skills-only integration

MiniMax Code should reuse the adapterless command behavior, but not the destructive commands-only skill cleanup behavior for global user-home skills. In repo-local `openspec init` and `openspec update`, when delivery includes skills, OpenSpec writes MiniMax Code skills. When delivery includes commands, OpenSpec skips command generation for MiniMax Code because no command adapter exists. When repo delivery is `commands`, OpenSpec should leave existing MiniMax Code global skills untouched.

Workspace setup/update is different: existing workspace skill behavior ignores command delivery and remains skills-only. When MiniMax Code is selected as a workspace agent, workspace setup/update should refresh MiniMax Code skills in `<home>/.minimax/skills` even if global delivery is `commands` or `both`; it still never generates MiniMax command files.

Codex is the closest reference point for global command output: Codex commands are written to `CODEX_HOME/prompts`, but Codex OpenSpec skills remain workspace/project-local, so commands-only delivery never deletes user-home OpenSpec skill directories. MiniMax Code's only OpenSpec surface in this change is a user-home global skill directory, so deleting that directory on a repo-local delivery change would have a wider blast radius than Codex.

Why this approach:

- It reuses existing delivery semantics instead of adding MiniMax-specific delivery rules.
- It keeps repo-local `delivery=commands` non-destructive for user-home global skill targets.
- It prevents OpenSpec from inventing unsupported MiniMax command files.
- It avoids one project's delivery setting removing OpenSpec skills used by other MiniMax Code projects.

### 4. Detect and refresh MiniMax Code from the fixed global target

Configured-tool detection, version checks, profile drift checks, migration scans, and update refresh logic should use the shared skill directory helper. For MiniMax Code, detection is based on `openspec-*` skill files under `~/.minimax/skills`, not on a repo-local marker directory.

Why this approach:

- `openspec init` can show MiniMax Code as already configured when its managed skills already exist globally.
- `openspec update` can refresh MiniMax Code even when there is no project-local MiniMax directory.
- A shared path helper avoids drift where setup, detection, and refresh disagree about the active target.

Workspace skill setup and update should also use the same helper. Workspace code currently assumes `workspaceRoot/<skillsDir>/skills`; if it is not updated, MiniMax Code will either be excluded from workspace agent selection or written to the wrong workspace-local fallback path.

### 5. Never create a repo-local MiniMax fallback

OpenSpec should not create `<projectRoot>/.minimax`, `<projectRoot>/.mavis`, or any repo-local MiniMax fallback when setting up MiniMax Code. If the fixed home target cannot be prepared or written, MiniMax Code setup should fail for that tool with a clear filesystem error while preserving the existing per-tool success/failure summary behavior.

Why this approach:

- It avoids silently writing invalid files to the repository.
- It keeps the first implementation simple and predictable.
- It preserves non-OpenSpec MiniMax user skills outside `openspec-*` skill directories. `openspec-*` directories are treated as OpenSpec-owned workflow skill targets and may be overwritten or removed by profile cleanup even if the user edited their contents.

## Risks / Trade-offs

- `[MiniMax installations with custom data roots are not supported in this first version]` -> Mitigation: document the fixed `~/.minimax/skills` target and leave runtime discovery as future work.
- `[Global installations are less project-scoped than repo-local paths]` -> Mitigation: document MiniMax Code as a global user-home integration and display the global path in user-facing setup/update output where practical.
- `[Cross-platform home path bugs]` -> Mitigation: build targets with `os.homedir()` and `path.join()`, and cover Windows-style home directories in unit tests.
- `[Commands-only delivery could remove global MiniMax Code OpenSpec skills across projects]` -> Mitigation: commands-only delivery for MiniMax Code must skip command generation and leave existing global MiniMax Code skills untouched, mirroring Codex's non-destructive treatment of user-home surfaces.
- `[Managed cleanup or refresh could overwrite user-authored colliding MiniMax skills]` -> Mitigation: document that `openspec-*` directories under the MiniMax Code skill target are OpenSpec-managed workflow skill targets. Users should keep unrelated MiniMax skills outside the `openspec-*` namespace.

## Migration Plan

There is no schema or repository migration required for existing OpenSpec projects.

Implementation rollout should follow this sequence:

1. Add MiniMax Code metadata and the shared skill directory helper for project-local and home-relative global targets.
2. Wire detection, init, update, profile drift, migration scans, and workspace skill setup/update to use the helper.
3. Update documentation so users know MiniMax Code installs globally at `~/.minimax/skills` and uses skills as its workflow surface.
4. Verify fresh setup, repeat refresh, delivery modes, workspace setup/update, managed-only cleanup, and non-OpenSpec skill preservation before release.

## Open Questions

- Do MiniMax installations with explicit profile/data-dir overrides need to be supported in a follow-up runtime discovery change?
