## Why

The base class `SlashCommandConfigurator` has a semantic mismatch with the actual tool ecosystem. Different AI tools use different terminology for their integration files:
- Claude/Cursor/Windsurf: "slash commands" or "workflows"
- Amp: "skills" (`.agents/skills/`)
- Codex/GitHub Copilot: "prompts"
- Gemini: "commands" (TOML format)

The current naming misleadingly implies these configurators only handle slash commands, when they actually configure "OpenSpec workflow operations" (proposal/apply/archive) across diverse tool formats.

## What Changes

- Rename `SlashCommandConfigurator` → `WorkflowConfigurator` in `src/core/configurators/slash/base.ts`
- Rename `SlashCommandRegistry` → `WorkflowRegistry` in `src/core/configurators/slash/registry.ts`
- Rename `SlashCommandTarget` → `WorkflowTarget` interface
- Rename `SlashCommandId` → `WorkflowId` type in templates
- Rename directory `src/core/configurators/slash/` → `src/core/configurators/workflow/`
- Export old names as type aliases for backward compatibility
- Update all configurator subclasses and consumers to use new names
- Remove explanatory documentation workarounds added during Amp implementation

## Impact

- Affected specs: `cli-init`, `cli-update` (terminology in scenarios)
- Affected code: All files in `src/core/configurators/slash/`, template exports, init/update command implementations
- Breaking changes: None if aliases are maintained; internal refactor only
