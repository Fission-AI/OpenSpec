## Why
- Kilo Code executes \"slash commands\" by loading markdown workflows from `.kilocode/workflows/` (or the global `~/.kilocode/workflows/`) and running them when a user types `/workflow-name.md`, making project-local workflow files the analogue to the slash-command files we already ship for other tools.\\
  ([Workflows | Kilo Code Docs](https://kilocode.ai/docs/features/slash-commands/workflows))
- Those workflows are plain markdown with step-by-step instructions that can call built-in tools and MCP integrations, so reusing OpenSpec's shared proposal/apply/archive bodies keeps behaviour aligned across assistants without inventing new content.
- OpenSpec already detects configured tools and refreshes marker-wrapped files during `init`/`update`; extending the same mechanism to `.kilocode/workflows/openspec-*.md` ensures Kilo Code stays in sync with one source of truth.

## What Changes
- Add Kilo Code to the `openspec init` tool picker with \"already configured\" detection, including wiring for extend mode so teams can refresh Kilo Code assets.
- Implement a `KiloCodeSlashCommandConfigurator` that creates `.kilocode/workflows/openspec-{proposal,apply,archive}.md`, ensuring the workflow directory exists and wrapping shared content in OpenSpec markers (no front matter required).
- Teach `openspec update` to refresh existing Kilo Code workflows (and only those that already exist) using the shared slash-command templates.
- Update documentation, release notes, and integration tests so the new workflow support is covered alongside Claude, Cursor, OpenCode, and Windsurf.

## Impact
- Specs: `cli-init`, `cli-update`
- Code: `src/core/config.ts`, `src/core/configurators/(registry|slash/*)`, `src/core/templates/slash-command-templates.ts`, CLI wiring for tool summaries
- Tests: init/update workflow coverage, regression for marker preservation in `.kilocode/workflows/`
- Docs: README / CHANGELOG updates advertising Kilo Code workflow support
