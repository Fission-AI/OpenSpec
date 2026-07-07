## Why

Codex custom prompts are now a poor fit for OpenSpec's generated command surface: the official Codex docs deprecate custom prompts in favor of skills, while OpenSpec still treats Codex as a prompt-file target under the user's global Codex home. That mismatch creates confusing setup, stale global artifacts, and a command path that is increasingly likely to fail even when `openspec init` appears to succeed.

## What Changes

- **BREAKING**: Stop generating new Codex custom prompt files during `openspec init` and `openspec update`.
- Treat Codex as a skills-first integration so OpenSpec installs and refreshes `.codex/skills/openspec-*/SKILL.md` as the supported Codex workflow surface.
- Treat Codex as a `skills-invocable` command-surface tool so Codex remains usable when the global delivery mode is `both`, `skills`, or `commands`, instead of relying on deprecated prompt-file generation.
- Add migration and cleanup behavior for previously managed Codex prompt files, with global cleanup targeting only the known OpenSpec-managed legacy prompt filenames under `$CODEX_HOME/prompts` or `~/.codex/prompts`, deleting them only after replacement Codex skills exist, and repo-local compatibility cleanup preserving `.codex/prompts/openspec-*.md` detection in the project tree.
- Update user-facing docs and CLI messaging so Codex guidance reflects skills-based usage rather than global custom prompts.

## Capabilities

### New Capabilities
- None.

### Modified Capabilities
- `ai-tool-paths`: Codex path metadata changes from global prompt generation expectations to skills-first configuration expectations.
- `cli-init`: Codex initialization no longer creates managed custom prompts and instead installs the supported skills-based workflow surface.
- `cli-update`: Codex update behavior no longer refreshes deprecated custom prompts and instead manages skills plus legacy prompt cleanup.
- `command-generation`: Codex is no longer treated as an active generated command-file target in the supported command adapter surface.

## Impact

- Affected code: `src/core/config.ts`, `src/core/init.ts`, `src/core/update.ts`, command-surface capability resolution, Codex-related command-generation and migration/cleanup logic, plus Codex-specific tests.
- Affected docs: `docs/supported-tools.md`, `docs/commands.md`, `docs/how-commands-work.md`, and troubleshooting/setup guidance that currently references Codex prompt files.
- User impact: existing Codex users who rely on generated custom prompts will need to use the skills-based Codex workflow surface after updating.

## Sequencing

This change should reuse the command-surface capability model from `add-tool-command-surface-capabilities` when that change lands first. If this change lands first, it should introduce only the minimal shared capability path needed for Codex and leave it compatible with the broader capability-aware delivery work.
