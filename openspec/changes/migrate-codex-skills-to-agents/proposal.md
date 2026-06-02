## Why

OpenAI's current Codex Skills convention discovers repository skills from `.agents/skills`, but OpenSpec's Codex integration and docs still have legacy `.codex/skills` assumptions in places. This creates the exact gap left by the skills-first Codex PR: prompts may be deprecated, but Codex skills still land in the wrong repo-local directory.

## What Changes

- Set Codex skill generation to `.agents/skills/openspec-*/SKILL.md`.
- Detect legacy Codex OpenSpec skills in `.codex/skills` so existing projects are still recognized as configured for Codex.
- On init/update refresh, migrate legacy Codex OpenSpec skills by regenerating them under `.agents/skills`.
- Clean up only OpenSpec-managed legacy `.codex/skills/openspec-*` directories after the `.agents/skills` replacement succeeds.
- Leave unmanaged or non-OpenSpec `.codex/skills` content untouched.
- Update Codex-facing docs and success output so Codex skill paths consistently point to `.agents/skills`.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `ai-tool-paths`: Codex uses `.agents` as its current skill root and treats `.codex` as a legacy detection and cleanup path.
- `cli-init`: Codex setup writes skills to `.agents/skills`, detects legacy `.codex/skills`, and removes managed legacy Codex skill directories after successful regeneration.
- `cli-update`: Codex refresh migrates existing `.codex/skills` installs to `.agents/skills`, preserves unmanaged legacy content, and reports the migration.
- `workspace-links`: Codex workspace skills install to `.agents/skills`, migrate managed legacy `.codex/skills/openspec-*` directories, preserve unmanaged legacy content, and report the migration.

## Impact

- Affected code: `src/core/config.ts`, tool detection, init/update skill generation and cleanup, docs, and tests.
- Affected docs: supported-tools tables and any Codex-specific setup/update guidance.
- No new dependencies.
- This is intended as a small follow-up to the active Codex skills-first work; it does not need to re-solve custom prompt deprecation or unsupported runtime tool-name rewrites.
