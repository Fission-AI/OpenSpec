## Why

Pi-coding-agent from [badlogic/pi-mono](https://github.com/badlogic/pi-mono) is a growing terminal-based coding agent with multi-model support, mid-session model switching, and RPC mode for programmatic integration. It supports the AGENTS.md standard and has its own slash command system via `.pi/prompts/*.md` files. Adding OpenSpec support enables pi users to use the proposal/apply/archive workflow natively.

## What Changes

- Add "Pi" as a new supported AI tool in the tool selection list
- Create slash command configurator for pi's `.pi/prompts/*.md` format
- Register pi in the SlashCommandRegistry

Pi-coding-agent already reads AGENTS.md files, so no separate tool configurator is needed for project instructions - the existing AGENTS.md support covers that.

## Capabilities

### New Capabilities
- `pi-slash-commands`: Slash command generation for pi-coding-agent using `.pi/prompts/*.md` format with YAML frontmatter

### Modified Capabilities
- `tool-registry`: Add pi to the AI_TOOLS list and SlashCommandRegistry

## Impact

- **Code**:
  - `src/core/config.ts` - add pi to AI_TOOLS array
  - `src/core/configurators/slash/pi.ts` - new slash command configurator
  - `src/core/configurators/slash/registry.ts` - register pi configurator
- **User-facing**: Pi users can select "Pi" during `openspec init` and get `/openspec-proposal`, `/openspec-apply`, `/openspec-archive` commands
- **Dependencies**: None - uses existing slash command infrastructure
