---
"@fission-ai/openspec": major
---

### OpenSpec is now OPSX

The workflow has been rebuilt from the ground up.

### Breaking Changes

- **Old commands removed** — `/openspec:proposal`, `/openspec:apply`, and `/openspec:archive` no longer exist. Use the new `/opsx:*` commands instead.
- **Config files removed** — Tool-specific config files (`CLAUDE.md`, `.cursorrules`, `openspec/AGENTS.md`, `openspec/project.md`) are no longer generated. OpenSpec now uses Agent Skills.
- **Migration required** — Run `openspec update` to get the new workflow. Legacy artifacts are detected and cleaned up automatically with confirmation.

### New Workflow

- **Dynamic instructions** — AI gets contextually relevant instructions based on what artifacts exist and what's ready, not the same static prompts every time
- **Semantic spec syncing** — Archive parses ADDED/MODIFIED/REMOVED/RENAMED at the requirement level. No more brittle header matching. Validation happens automatically.
- **Step through changes** — `/opsx:continue` creates one artifact at a time for better context management. Or `/opsx:ff` for everything at once.
- **Skills support** — Now using the Agent Skills standard alongside tool-specific commands

### New Commands

| Command | Description |
|---------|-------------|
| `/opsx:new` | Start a new change |
| `/opsx:ff` | Create all planning artifacts at once |
| `/opsx:continue` | Create one artifact at a time |
| `/opsx:apply` | Implement tasks |
| `/opsx:archive` | Sync specs and archive the change |
| `/opsx:onboard` | Guided walkthrough of your first complete workflow cycle |

### New Features

- **Onboarding skill** — `/opsx:onboard` guides new users through their first complete OpenSpec workflow with codebase-aware task suggestions
- **Multi-provider support** — Generate skills for 21 AI tools including Claude, Cursor, Windsurf, Continue, Gemini, GitHub Copilot, Amazon Q, and more
- **Interactive setup** — `openspec init` launches a searchable multi-select UI for choosing which AI tools to configure
- **Agent Skills metadata** — Skills now include license, compatibility, and metadata fields per the Agent Skills specification

### Bug Fixes

- Fixed Claude Code slash command parsing where colons in names caused incorrect description fallback
- Fixed task file parsing to handle trailing whitespace
- Fixed JSON instruction output to separate context and rules from template

### Other

- Comprehensive documentation overhaul with new getting-started guide, workflow patterns, and customization guides
