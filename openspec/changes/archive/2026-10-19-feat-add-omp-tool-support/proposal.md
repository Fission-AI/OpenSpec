## Why

Oh My Pi (OMP) is a terminal AI coding agent whose users expect OpenSpec workflows to be available as slash commands. Without an adapter, users who have OMP configured in their project cannot generate OMP-native command files or get the correct skill transformations from `openspec init` or `openspec update`.

## What Changes

- Add a `ToolCommandAdapter` for Oh My Pi that generates command files at `.omp/commands/opsx-<id>.md` with YAML `description` frontmatter, hyphen-based command references, and `$@` argument injection after the `**Input**:` heading (matching Pi's convention so user-supplied arguments are visible to the agent).
- Register `oh-my-pi` in `AI_TOOLS` with `skillsDir: '.omp'` so detection and skill generation work.
- Register the new adapter in `CommandAdapterRegistry` and `adapters/index.ts`.
- Add Oh My Pi to the `transformToHyphenCommands` whitelist in `init.ts` and `update.ts` so skill files use the correct `/opsx-*` invocation form that matches OMP's filename-based command naming.
- Add test coverage for the new adapter.
- Update `docs/supported-tools.md` with the new tool's directory reference.

## Capabilities

### New Capabilities

- `oh-my-pi-tool`: Command and skill generation support for the Oh My Pi (OMP) AI coding agent, following its `.omp/commands/opsx-<id>.md` format with `description` frontmatter, hyphen-based command references, and `$@` argument injection.

### Modified Capabilities

- `cli-init`: Oh My Pi is added to the supported tool list and the hyphen-command transformer whitelist.
- `cli-update`: Oh My Pi is added to the hyphen-command transformer whitelist for skill regeneration.

## Impact

- `src/core/command-generation/adapters/oh-my-pi.ts` — new adapter
- `src/core/command-generation/adapters/index.ts` — export new adapter
- `src/core/command-generation/registry.ts` — register adapter
- `src/core/config.ts` — add `oh-my-pi` entry to `AI_TOOLS`
- `src/core/init.ts` — extend hyphen-command transformer conditional
- `src/core/update.ts` — extend hyphen-command transformer conditional (two call sites)
- `test/core/command-generation/adapters.test.ts` — adapter unit tests
- `docs/supported-tools.md` — add Oh My Pi row to directory reference table
