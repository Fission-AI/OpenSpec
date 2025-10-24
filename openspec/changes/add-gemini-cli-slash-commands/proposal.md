## Why
Gemini CLI now supports project-scoped custom slash commands that live under `.gemini/commands`. Teams using OpenSpec with Gemini CLI must currently hand-write these TOML files to stay aligned with the proposal/apply/archive workflow, creating drift and inconsistent instructions. Extending OpenSpec's automation keeps Gemini CLI users at parity with Claude, Cursor, and OpenCode.

## Research Findings
- Gemini CLI discovers user and project commands from `~/.gemini/commands/` and `<project>/.gemini/commands/`, with project commands winning on name conflicts. Commands are named from their relative path (e.g., `openspec/proposal.toml` → `/openspec:proposal`).
- Each command definition is a TOML file that must provide a `prompt` string and can optionally include a `description`. Multiline prompts use triple quotes and safely support argument injection via `{{args}}` as well as shell execution blocks (`!{...}`) that trigger confirmations.
- Gemini CLI loads these definitions through `FileCommandLoader`, which scans both command directories, parses TOML via Zod, and adapts them into executable slash commands at runtime.

## What Changes
- Treat Gemini CLI as a first-class slash command target during `openspec init`, generating `.gemini/commands/openspec/proposal.toml`, `apply.toml`, and `archive.toml` populated from shared templates wrapped with OpenSpec markers.
- Refresh existing Gemini CLI command files during `openspec update`, updating only the marker-managed prompt content when the files already exist.
- Add a Gemini CLI option to the AI tool selection UI and to the slash command registry so users can configure or refresh it alongside other assistants.
- Provide Vitest coverage that mirrors existing slash command tests for creation and update flows, ensuring the TOML scaffolding integrates cleanly with FileCommandLoader expectations.
- Document the Gemini CLI slash command behavior in the relevant specs so downstream automation and teams understand the new capability.

## Impact
- Affected specs: `cli-init`, `cli-update`
- Affected code (planned): slash command configurators/registry, CLI init & update flows, template management, AI tool configuration prompts
- Affected tests: `test/core/init.test.ts`, `test/core/update.test.ts` (new cases for Gemini CLI)
