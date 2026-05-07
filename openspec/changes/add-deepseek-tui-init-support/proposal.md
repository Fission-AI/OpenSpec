## Why

OpenSpec `init` currently does not support DeepSeek TUI, which prevents teams using DeepSeek-first workflows from onboarding with the same one-command setup as other tools. Adding native DeepSeek TUI support now removes manual setup friction and keeps tool support parity in this fork.

## What Changes

- Add DeepSeek TUI as a supported AI tool option in `openspec init` interactive and non-interactive flows.
- Add DeepSeek tool metadata in `AI_TOOLS` using the same directory convention as `.claude`/`.cursor` style tools (`skillsDir` + shared generation flow).
- Generate DeepSeek skill files under the tool-specific directory during initialization (targeting `<projectRoot>/.deepseek/skills/`).
- Keep command generation behavior consistent with adapter availability (skip slash command generation if no command adapter exists).
- Include DeepSeek TUI in validation/error messaging for `--tools` so users can discover and select it reliably.
- Reflect DeepSeek TUI in init completion summaries (created/refreshed/skipped) when selected.
- Update tool-facing docs so supported tool IDs and usage guidance stay consistent with existing tools.

## Capabilities

### New Capabilities
- None.

### Modified Capabilities
- `cli-init`: Extend tool selection and initialization behavior to include DeepSeek TUI as a first-class supported tool.
- `ai-tool-paths`: Define DeepSeek TUI path metadata and expected skills output directory convention.

## Impact

- Affected specs: `openspec/specs/cli-init/spec.md`, `openspec/specs/ai-tool-paths/spec.md` (requirement deltas).
- Affected CLI init flow: supported-tool registry, `--tools` parsing/validation, init summary output, and generation pipeline wiring.
- Affected metadata: `src/core/config.ts` tool entry for DeepSeek TUI.
- Affected docs: supported tools list and CLI `--tools` references.
- Affected generated project files: DeepSeek skill files under `.<tool>/skills/` convention (`.deepseek/skills/` for this tool).
