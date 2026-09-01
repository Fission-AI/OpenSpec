## Why

xAI Grok Build is a coding agent with a documented project skills root at `.grok/skills/`, and user-invocable skills surface as slash commands (`/<skill-name>`). OpenSpec does not yet list Grok Build as a supported tool, so users must free-ride on Claude/Cursor compat scanners or configure extra skill paths manually.

OpenSpec already supports adapterless skills-only tools (Kimi CLI, ForgeCode, Mistral Vibe). Grok Build should follow that pattern: install skills under `.grok/skills/` without inventing a command adapter for a project command-file surface that xAI docs do not define.

## What Changes

- Add Grok Build as a supported tool in `AI_TOOLS` with `value: 'grok'` and `skillsDir: '.grok'`
- Document Grok Build as a skills-only integration (no generated `opsx-*` command files; invoke via `/openspec-*` skill names)
- Align specs so `ai-tool-paths` and `cli-init` cover the Grok Build path and adapterless init behavior

## Capabilities

### New Capabilities

_None._

### Modified Capabilities

- `ai-tool-paths`: define the `.grok` skills root for Grok Build
- `cli-init`: treat Grok Build as a supported adapterless selection that still generates skills and skips command-file generation

## Impact

- `src/core/config.ts` - add Grok Build tool metadata
- `docs/supported-tools.md` - add Grok Build row and tool id
- `docs/commands.md` - document `/openspec-*` skill invocations for Grok Build
- `docs/how-commands-work.md` - include Grok Build in slash-syntax table
- `docs/cli.md` - include `grok` in the supported `--tools` list
- `docs/troubleshooting.md` - list Grok Build among skills-only tools
- `test/core/init.test.ts` - cover Grok Build as an adapterless tool during init
- `.changeset/` - minor release note for the new tool

## Non-Goals

- Adding `src/core/command-generation/adapters/grok.ts`
- Defining a `.grok/commands/...` output path
- Relying on Claude/Cursor free-ride as the product integration
- Changing the broader delivery model for adapterless tools under `delivery=commands` (tracked separately in `add-tool-command-surface-capabilities`)
