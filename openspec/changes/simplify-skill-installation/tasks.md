## 1. Global Config Extension

- [ ] 1.1 Extend `src/core/global-config.ts` schema with `profile`, `delivery`, and `workflows` fields
- [ ] 1.2 Add TypeScript types for profile (`core` | `custom`), delivery (`both` | `skills` | `commands`), and workflows (string array)
- [ ] 1.3 Update `GlobalConfig` interface and defaults (profile=`core`, delivery=`both`)
- [ ] 1.4 Update existing `readGlobalConfig()` to handle missing new fields with defaults
- [ ] 1.5 Add tests for schema evolution (existing config without new fields)

## 2. Profile System

- [ ] 2.1 Create `src/core/profiles.ts` with profile definitions (core, custom)
- [ ] 2.2 Define `CORE_WORKFLOWS` constant: `['propose', 'explore', 'apply', 'archive']`
- [ ] 2.3 Define `ALL_WORKFLOWS` constant with all 11 workflows
- [ ] 2.4 Add `COMMAND_IDS` constant to `src/core/shared/tool-detection.ts` (parallel to existing SKILL_NAMES)
- [ ] 2.5 Implement `getProfileWorkflows(profile, customWorkflows?)` resolver function
- [ ] 2.6 Add tests for profile resolution

## 3. Config Profile Command (Interactive Picker)

- [ ] 3.1 Add `config profile` subcommand to `src/commands/config.ts`
- [ ] 3.2 Implement interactive picker UI with delivery selection (skills/commands/both)
- [ ] 3.3 Implement interactive picker UI with workflow toggles
- [ ] 3.4 Pre-select current config values in picker
- [ ] 3.5 Update global config on confirmation (config-only, no file regeneration)
- [ ] 3.6 Display post-update message: "Config updated. Run `openspec update` in your projects to apply."
- [ ] 3.7 Detect if running inside an OpenSpec project and offer to run update automatically
- [ ] 3.8 Implement `config profile core` preset shortcut (preserves delivery setting)
- [ ] 3.9 Handle non-interactive mode: error with helpful message
- [ ] 3.10 Add tests for config profile command

## 4. Available Tools Detection

- [ ] 4.1 Create `src/core/available-tools.ts` (separate from existing `tool-detection.ts`)
- [ ] 4.2 Implement `getAvailableTools(projectPath)` that scans for AI tool directories (`.claude/`, `.cursor/`, etc.)
- [ ] 4.3 Use `AI_TOOLS` config to map directory names to tool IDs
- [ ] 4.4 Add tests for available tools detection including cross-platform paths

## 5. Propose Workflow Template

- [ ] 5.1 Create `src/core/templates/workflows/propose.ts`
- [ ] 5.2 Implement skill template that combines new + ff behavior
- [ ] 5.3 Add onboarding-style explanatory output to template
- [ ] 5.4 Implement command template for propose
- [ ] 5.5 Export templates from `src/core/templates/skill-templates.ts`
- [ ] 5.6 Add `openspec-propose` to `SKILL_NAMES` in `src/core/shared/tool-detection.ts`
- [ ] 5.7 Add `propose` to command templates in `src/core/shared/skill-generation.ts`
- [ ] 5.8 Add `propose` to `COMMAND_IDS` in `src/core/shared/tool-detection.ts`

## 6. Conditional Skill/Command Generation

- [ ] 6.1 Update `getSkillTemplates()` to accept profile filter parameter
- [ ] 6.2 Update `getCommandTemplates()` to accept profile filter parameter
- [ ] 6.3 Update `generateSkillsAndCommands()` in init.ts to respect delivery setting
- [ ] 6.4 Add logic to skip skill generation when delivery is 'commands'
- [ ] 6.5 Add logic to skip command generation when delivery is 'skills'
- [ ] 6.6 Add tests for conditional generation

## 7. Init Flow Updates

- [ ] 7.1 Update init to call `getAvailableTools()` first
- [ ] 7.2 Update init to read global config for profile/delivery defaults
- [ ] 7.3 Change tool selection to show pre-selected detected tools
- [ ] 7.4 Update success message to show `/opsx:propose` prompt
- [ ] 7.5 Add `--profile` flag to override global config
- [ ] 7.6 Update non-interactive mode to use defaults without prompting
- [ ] 7.7 Add tests for init flow with various scenarios

## 8. Update Command (Profile Support)

- [ ] 8.1 Modify existing `src/commands/update.ts` to read global config for profile/delivery/workflows
- [ ] 8.2 Add logic to detect which workflows are in config but not installed (to add)
- [ ] 8.3 Add logic to detect which workflows are installed and need refresh (to update)
- [ ] 8.4 Respect delivery setting: generate only skills if `skills`, only commands if `commands`
- [ ] 8.5 Delete files when delivery changes: remove commands if `skills`, remove skills if `commands`
- [ ] 8.6 Generate new workflow files for missing workflows in profile
- [ ] 8.7 Display summary: "Added: X, Y" / "Updated: Z" / "Removed: N files" / "Already up to date."
- [ ] 8.8 List affected tools in output: "Tools: Claude Code, Cursor"
- [ ] 8.9 Add tests for update command with profile scenarios (including delivery changes)

## 9. Tool Selection UX Fix

- [ ] 9.1 Update `src/prompts/searchable-multi-select.ts` keybindings
- [ ] 9.2 Change Space to toggle selection
- [ ] 9.3 Change Enter to confirm selection
- [ ] 9.4 Remove Tab-to-confirm behavior
- [ ] 9.5 Add hint text "Space to toggle, Enter to confirm"
- [ ] 9.6 Add tests for keybinding behavior

## 10. Scaffolding Verification

- [ ] 10.1 Verify `openspec new change` creates `.openspec.yaml` with schema and created fields
- [ ] 10.2 Update ff skill to verify `.openspec.yaml` exists after `openspec new change`
- [ ] 10.3 Add guardrail to skills: "Never manually create files in openspec/changes/ - use openspec new change"

## 11. Integration & Documentation

- [ ] 11.1 Run full test suite and fix any failures
- [ ] 11.2 Test on Windows (or verify CI passes on Windows)
- [ ] 11.3 Test end-to-end flow: init → propose → apply → archive
- [ ] 11.4 Update CLI help text for new commands
