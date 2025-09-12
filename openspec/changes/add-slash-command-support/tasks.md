# Implementation Tasks

## 1. Templates and Configurators
- [ ] 1.1 Create shared templates for `/create-change`, `/implement-change`, and `/archive-change` commands with instructions for each workflow stage from `openspec/README.md`.
- [ ] 1.2 Implement a `SlashCommandConfigurator` base and tool-specific configurators for Claude Code and Cursor.

## 2. Claude Code Integration
- [ ] 2.1 Generate `.claude/commands/openspec/{create-change,implement-change,archive-change}.md` during `openspec init` using shared templates.
- [ ] 2.2 Update existing `.claude/commands/openspec/*` files during `openspec update`.

## 3. Cursor Integration
- [ ] 3.1 Generate `.cursor/commands/{create-change,implement-change,archive-change}.md` during `openspec init` using shared templates.
- [ ] 3.2 Update existing `.cursor/commands/*` files during `openspec update`.

## 4. Verification
- [ ] 4.1 Add tests verifying slash command files are created and updated correctly.
