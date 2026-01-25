---
"@fission-ai/openspec": major
---

## OpenSpec 1.0 — The OPSX Release

The workflow has been rebuilt from the ground up. OPSX replaces the old phase-locked `/openspec:*` commands with an action-based system where AI understands what artifacts exist, what's ready to create, and what each action unlocks.

### Breaking Changes

- **Old commands removed** — `/openspec:proposal`, `/openspec:apply`, and `/openspec:archive` no longer exist
- **Config files removed** — Tool-specific instruction files (`CLAUDE.md`, `.cursorrules`, `AGENTS.md`, `project.md`) are no longer generated
- **Migration** — Run `openspec init` to upgrade. Legacy artifacts are detected and cleaned up with confirmation.

### From Static Prompts to Dynamic Instructions

**Before:** AI received the same static instructions every time, regardless of project state.

**Now:** Instructions are dynamically assembled from three layers:
1. **Context** — Project background from `config.yaml` (tech stack, conventions)
2. **Rules** — Artifact-specific constraints (e.g., "propose spike tasks for unknowns")
3. **Template** — The actual structure for the output file

AI queries the CLI for real-time state: which artifacts exist, what's ready to create, what dependencies are satisfied, and what each action unlocks.

### From Phase-Locked to Action-Based

**Before:** Linear workflow — proposal → apply → archive. Couldn't easily go back or iterate.

**Now:** Flexible actions on a change. Edit any artifact anytime. The artifact graph tracks state automatically.

| Command | What it does |
|---------|--------------|
| `/opsx:explore` | Think through ideas before committing to a change |
| `/opsx:new` | Start a new change |
| `/opsx:continue` | Create one artifact at a time (step-through) |
| `/opsx:ff` | Create all planning artifacts at once (fast-forward) |
| `/opsx:apply` | Implement tasks |
| `/opsx:verify` | Validate implementation matches artifacts |
| `/opsx:sync` | Sync delta specs to main specs |
| `/opsx:archive` | Archive completed change |
| `/opsx:bulk-archive` | Archive multiple changes with conflict detection |
| `/opsx:onboard` | Guided 15-minute walkthrough of complete workflow |

### From Text Merging to Semantic Spec Syncing

**Before:** Spec updates required manual merging or wholesale file replacement.

**Now:** Delta specs use semantic markers that AI understands:
- `## ADDED Requirements` — New requirements to add
- `## MODIFIED Requirements` — Partial updates (add scenario without copying existing ones)
- `## REMOVED Requirements` — Delete with reason and migration notes
- `## RENAMED Requirements` — Rename preserving content

Archive parses these at the requirement level, not brittle header matching.

### From Scattered Files to Agent Skills

**Before:** 8+ config files at project root + slash commands scattered across 21 tool-specific locations with different formats.

**Now:** Single `.claude/skills/` directory with YAML-fronted markdown files. Auto-detected by Claude Code, Cursor, Windsurf. Cross-editor compatible.

### New Features

- **Onboarding skill** — `/opsx:onboard` walks new users through their first complete change with codebase-aware task suggestions and step-by-step narration (11 phases, ~15 minutes)

- **21 AI tools supported** — Claude Code, Cursor, Windsurf, Continue, Gemini CLI, GitHub Copilot, Amazon Q, Cline, RooCode, Kilo Code, Auggie, CodeBuddy, Qoder, Qwen, CoStrict, Crush, Factory, OpenCode, Antigravity, iFlow, and Codex

- **Interactive setup** — `openspec init` shows animated welcome screen and searchable multi-select for choosing tools. Pre-selects already-configured tools for easy refresh.

- **Customizable schemas** — Define custom artifact workflows in `openspec/schemas/` without touching package code. Teams can share workflows via version control.

### Bug Fixes

- Fixed Claude Code YAML parsing failure when command names contained colons
- Fixed task file parsing to handle trailing whitespace on checkbox lines
- Fixed JSON instruction output to separate context/rules from template — AI was copying constraint blocks into artifact files

### Documentation

- New getting-started guide, CLI reference, concepts documentation
- Removed misleading "edit mid-flight and continue" claims that weren't implemented
- Added migration guide for upgrading from pre-OPSX versions
