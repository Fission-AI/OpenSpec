## Why

The Bob harness config carries two outdated details:

1. **Wrong display name.** The tool is officially branded "IBM Bob", but OpenSpec registers it as "Bob Shell" — a name that refers only to the CLI variant. The `.bob` config directory is shared by both IBM Bob IDE and IBM Bob Shell, so the entry should reflect the full product name rather than one specific surface.

2. **Commands are deprecated in Bob.** IBM Bob has replaced slash commands (`.bob/commands/`) with skills (`.bob/skills/`). Continuing to generate `.bob/commands/` files produces artifacts the tool no longer uses, and treating Bob as an `adapter-backed` command target causes OpenSpec to install and maintain those files unnecessarily. Bob should be treated as a skills-only integration, parallel to how Codex was handled in `make-codex-skills-only`.

## What Changes

- **Rename**: Update the `name` and `successLabel` fields in `AI_TOOLS` for the `bob` entry from `"Bob Shell"` to `"IBM Bob"`.
- **Skills-only**: Remove the Bob command adapter registration so `resolveCommandSurfaceCapability('bob')` returns `'none'` rather than `'adapter-backed'`. This stops `shouldGenerateCommandsForTool` from returning `true` for Bob and stops `shouldGenerateSkillsForTool` from skipping Bob when delivery is `commands`.
- **Cleanup**: Add migration and cleanup behavior for previously managed Bob command files, targeting the known OpenSpec-managed legacy command filenames under `.bob/commands/opsx-*.md`, deleting them only after replacement skills exist.
- **Docs**: Update `docs/supported-tools.md` to reflect the IBM Bob name and the skills-only path pattern (remove the command path pattern column entry).

## Capabilities

### New Capabilities
- None.

### Modified Capabilities
- `config-loading`: Bob tool entry name and successLabel change from `"Bob Shell"` to `"IBM Bob"`.
- `command-generation`: Bob is no longer treated as an active generated command-file target; the Bob command adapter is removed from registration.
- `cli-init`: Bob initialization no longer creates managed command files and instead installs only the supported skills-based workflow surface.
- `cli-update`: Bob update behavior no longer refreshes deprecated command files and instead manages skills plus legacy command file cleanup.

## Impact

- Affected code: `src/core/config.ts` (display name), `src/core/command-generation/registry.ts` (adapter deregistration), `src/core/command-generation/adapters/bob.ts` (deleted), migration/cleanup logic for `.bob/commands/opsx-*.md`, plus Bob-specific tests.
- Affected docs: `docs/supported-tools.md`.
- User impact: existing Bob users who relied on generated command files will need to use the skills-based workflow surface. The command files will be cleaned up automatically on the next `openspec update`.
