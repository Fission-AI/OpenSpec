## Why

OpenSpec currently supports many coding assistants, but does not support Mistral Vibe. Teams using Vibe cannot bootstrap OpenSpec skills through `openspec init` and cannot refresh Vibe-managed files through `openspec update`.

## What Changes

- Add `mistral-vibe` as a supported AI tool in the tool registry with Vibe project-local directory mapping.
- Generate OpenSpec skills for Vibe under the Vibe skill discovery directory during `openspec init`.
- Ensure tool detection, configured-tool summaries, and update flows recognize existing Vibe skill installations.
- Keep command generation behavior explicit for Vibe based on adapter support, with predictable messaging during init and update.
- Update supported-tools documentation and user-facing setup guidance to include Mistral Vibe conventions.

## Capabilities

### New Capabilities
- None.

### Modified Capabilities
- `ai-tool-paths`: Add path metadata for Mistral Vibe so skill generation uses the correct Vibe directory layout.
- `cli-init`: Include Mistral Vibe in interactive and non-interactive tool selection, generation, and summaries.
- `cli-update`: Detect and refresh existing Mistral Vibe OpenSpec artifacts in update mode.

## Impact

- Affected code: `src/core/config.ts`, tool detection utilities, init/update workflow logic, and command adapter registry wiring if needed.
- Affected tests: init/update and tool-detection coverage for the new `mistral-vibe` tool ID and directory conventions.
- Affected docs: supported tools matrix and setup references that list available AI assistants.
