## Why

DeepSeek Harness discovers skills from fixed local roots, with `<project>/.dsh/skills` as its highest-priority project root. OpenSpec supports many assistants but has no dedicated target for it today, so dsh users can only use the vendor-neutral shared `.agents` target or hand-place skills — losing the dedicated `.dsh` integration.

## What Changes

- Add DeepSeek Harness as a supported tool with id `dsh`, `skillsDir: '.dsh'`, and directory-based auto-detection from `.dsh`.
- Generate the OpenSpec workflow skills into `.dsh/skills/openspec-*/SKILL.md` for dsh via `openspec init --tools dsh` and `openspec update`.
- Keep dsh skills-only: no command adapter and no `.dsh/commands/` files, because dsh has no file-based custom command surface.
- Spell dsh skill references as `/openspec-*` (dsh supports the user `/name` gesture), matching the existing skills-only tool pattern.
- Document dsh in the supported tools and command syntax docs.
- Add regression tests for detection, path resolution, init, update, and invocation spelling.

## Capabilities

### New Capabilities

_None._

### Modified Capabilities

- `ai-tool-paths`: define the `.dsh` skills root and directory-based detection for DeepSeek Harness.

## Impact

- `src/core/config.ts` — add the `dsh` entry to `AI_TOOLS`
- `docs/supported-tools.md` — tool row, invocation table, and `--tools` id list
- `docs/cli.md` — supported `--tools` id list
- `docs/commands.md`, `docs/how-commands-work.md`, `docs/troubleshooting.md` — skills-only invocation tables and notes
- `test/core/available-tools.test.ts`, `test/core/shared/skill-paths.test.ts`, `test/core/shared/tool-detection.test.ts`, `test/core/init.test.ts`, `test/core/update.test.ts`, `test/utils/command-references.test.ts`, `test/core/command-generation/registry.test.ts` — targeted dsh coverage
- `.changeset/add-dsh-support.md` — release note
