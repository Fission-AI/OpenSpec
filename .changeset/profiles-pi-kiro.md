---
"@fission-ai/openspec": minor
---

### New Features

- **Profile system** — Choose between `core` (4 essential workflows) and `custom` (pick any subset) profiles to control which skills get installed. Manage profiles with the new `openspec config profile` command
- **Propose workflow** — New one-step workflow creates a complete change proposal with design, specs, and tasks from a single request — no need to run `new` then `ff` separately
- **AI tool auto-detection** — `openspec init` now scans your project for existing tool directories (`.claude/`, `.cursor/`, etc.) and pre-selects detected tools
- **Pi (pi.dev) support** — Pi coding agent is now a supported tool with prompt and skill generation
- **Kiro support** — AWS Kiro IDE is now a supported tool with prompt and skill generation
- **Sync prunes deselected workflows** — `openspec update` now removes command files and skill directories for workflows you've deselected, keeping your project clean
- **Config drift warning** — `openspec config list` warns when global config is out of sync with the current project

### Bug Fixes

- Fixed onboard preflight giving a false "not initialized" error on freshly initialized projects
- Fixed archive workflow stopping mid-way when syncing — it now properly resumes after sync completes
- Added Windows PowerShell alternatives for onboard shell commands
