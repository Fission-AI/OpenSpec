## Why

The current setup has two separate commands (`openspec init` and `openspec experimental`) that configure different parts of the OpenSpec workflow. This creates confusion about which command to run, results in partial setups, and maintains two parallel systems (config files + old slash commands vs skills + opsx commands). Making the skill-based workflow the default simplifies onboarding and establishes a single, consistent way to use OpenSpec.

## What Changes

- **BREAKING**: `openspec init` now generates skills and `/opsx:*` commands instead of config files and `/openspec:*` commands
- **BREAKING**: Config files (`CLAUDE.md`, `.cursorrules`, etc.) are no longer generated
- **BREAKING**: Old slash commands (`/openspec:proposal`, `/openspec:apply`, `/openspec:archive`) are no longer generated
- **BREAKING**: `openspec/AGENTS.md` and `openspec/project.md` are no longer generated
- Merge `experimental` command functionality into `init`
- Add legacy detection and auto-cleanup with Y/N confirmation
- Keep `openspec experimental` as hidden alias for backward compatibility
- Use the animated welcome screen from experimental for the unified init

## Capabilities

### New Capabilities

- `legacy-cleanup`: Detect and remove legacy OpenSpec artifacts (config files, old slash commands, AGENTS.md) during init

### Modified Capabilities

- `cli-init`: Complete rewrite - generates skills and opsx commands instead of config files and old slash commands; removes AGENTS.md/project.md generation; adds legacy cleanup; uses experimental's animated welcome screen

## Impact

- **Code removal**: `ToolRegistry`, `SlashCommandRegistry`, config file generators, old slash command templates, AGENTS.md/project.md templates
- **Code migration**: Move skill generation and command adapter logic from `experimental/setup.ts` into `init.ts`
- **Commands affected**: `init` (rewritten), `experimental` (becomes hidden alias), `update` (may need adjustment)
- **User migration**: Existing users running `init` will be prompted to clean up legacy files
- **Breaking for**: Users relying on config files for passive triggering, users using `/openspec:*` commands
