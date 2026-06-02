## Context

The active Codex skills-first PR fixes deprecated prompt generation, but it still keeps Codex skills under `.codex/skills`. Current OpenAI Codex docs use `.agents/skills` for repository skills, so OpenSpec needs a narrow path migration on top of skills-first behavior.

Current OpenSpec path behavior is driven by `AI_TOOLS[].skillsDir`, then init/update append `skills`. Detection can be customized with `detectionPaths`, so the migration can reuse the existing configuration path rather than adding a separate Codex-only scanner.

## Goals / Non-Goals

**Goals:**

- Write Codex OpenSpec skills to `.agents/skills`.
- Detect legacy Codex OpenSpec installs under `.codex/skills`.
- Migrate managed legacy Codex skills by regenerating them under `.agents/skills`.
- Remove only OpenSpec-managed legacy `.codex/skills/openspec-*` directories after successful regeneration.
- Apply the same Codex skill migration and managed legacy cleanup to workspace-local Codex skills.
- Update Codex docs and user output to consistently say `.agents/skills`.
- Keep path handling cross-platform.

**Non-Goals:**

- Rework Codex custom prompt deprecation beyond what the skills-first PR already covers.
- Rewrite unsupported Codex runtime tool names beyond existing or parallel Codex-safe transforms.
- Add a generic `.agents` installer option for every tool.
- Delete unmanaged `.codex` content.

## Decisions

### 1. Codex Current Skill Root Is `.agents`

Set the Codex tool entry to `skillsDir: '.agents'`. Generated skill paths continue to be built by joining project root, `skillsDir`, `skills`, skill directory, and `SKILL.md`.

Rationale: this keeps the general skill-generation pipeline intact and moves only Codex's configured root.

### 2. Legacy `.codex` Is Detection And Cleanup Metadata

Add explicit legacy metadata for Codex, such as `legacySkillsDirs: ['.codex']` and `detectionPaths: ['.agents/skills', '.codex/skills']`.

Rationale: existing projects should still appear configured for Codex so `openspec update` can migrate them. Detection should not depend on broad globbing.

### 3. Cleanup Is Limited To Managed OpenSpec Skill Directories

After a successful `.agents/skills` write, remove only legacy `.codex/skills/<known-openspec-skill-dir>` directories. This applies to repo-local init/update and workspace-local skill setup/update. The known list should come from existing skill/workflow constants.

Rationale: users may have unrelated Codex files or custom skills under `.codex`. The cleanup must not delete anything that is not a known OpenSpec generated skill directory.

Alternative considered: leave `.codex/skills` untouched and only print a warning. Rejected because users asked for cleanup, and stale OpenSpec skills can keep confusing agents and contributors.

Alternative considered: delete all of `.codex/skills`. Rejected because it can remove user-authored skills.

### 4. Documentation Uses `.agents/skills` For Codex

Codex rows, examples, and setup guidance should describe `.agents/skills`. Any `.codex/skills` mention should be framed only as a legacy migration note.

Rationale: documentation is part of the migration. If docs keep `.codex/skills`, contributors will recreate the drift.

## Risks / Trade-offs

- **Risk: removing user edits inside generated OpenSpec skill directories** - Mitigation: remove only known `openspec-*` legacy directories and only after the replacement is written. This matches the generated artifact contract.
- **Risk: duplicate skills during failed migration** - Mitigation: perform cleanup after successful `.agents/skills` generation, not before.
- **Risk: duplicate workspace-local Codex skills** - Mitigation: workspace setup/update should use the same managed legacy cleanup rule as repo-local init/update.
- **Risk: Windows path regressions** - Mitigation: use `path.join()` or existing file-system helpers and add path tests.
- **Risk: PR overlap with #1143** - Mitigation: keep this change path-focused and avoid re-solving prompt deprecation.

## Migration Plan

1. Update Codex `AI_TOOLS` metadata to use `.agents`, detect `.agents/skills` and `.codex/skills`, and store legacy skill roots.
2. Update init/update to remove managed legacy Codex skill directories after successful Codex skill generation.
3. Update workspace skill setup/update to remove managed legacy Codex skill directories after successful workspace-local Codex skill generation.
4. Update docs and output to reference `.agents/skills` for Codex.
5. Add tests for current generation, legacy detection, migration cleanup, unmanaged content preservation, workspace migration cleanup, and cross-platform paths.
