## 1. Global Config Extension

- [x] 1.1 Extend `src/core/global-config.ts` schema with `profile`, `delivery`, and `workflows` fields
- [x] 1.2 Add TypeScript types for profile (`core` | `custom`), delivery (`both` | `skills` | `commands`), and workflows (string array)
- [x] 1.3 Update `GlobalConfig` interface and defaults (profile=`core`, delivery=`both`)
- [x] 1.4 Update existing `readGlobalConfig()` to handle missing new fields with defaults
- [x] 1.5 Add tests for schema evolution (existing config without new fields)

## 2. Profile System

- [x] 2.1 Create `src/core/profiles.ts` with profile definitions (core, custom)
- [x] 2.2 Define `CORE_WORKFLOWS` constant: `['propose', 'explore', 'apply', 'archive']`
- [x] 2.3 Define `ALL_WORKFLOWS` constant with all 11 workflows
- [x] 2.4 Add `COMMAND_IDS` constant to `src/core/shared/tool-detection.ts` (parallel to existing SKILL_NAMES)
- [x] 2.5 Implement `getProfileWorkflows(profile, customWorkflows?)` resolver function
- [x] 2.6 Add tests for profile resolution

## 3. Config Profile Command (Interactive Picker)

- [x] 3.1 Add `config profile` subcommand to `src/commands/config.ts`
- [x] 3.2 Implement interactive picker UI with delivery selection (skills/commands/both)
- [x] 3.3 Implement interactive picker UI with workflow toggles
- [x] 3.4 Pre-select current config values in picker
- [x] 3.5 Update global config on confirmation (config-only, no file regeneration)
- [x] 3.6 Display post-update message: "Config updated. Run `openspec update` in your projects to apply."
- [x] 3.7 Detect if running inside an OpenSpec project and offer to run update automatically
- [x] 3.8 Implement `config profile core` preset shortcut (preserves delivery setting)
- [x] 3.9 Handle non-interactive mode: error with helpful message
- [x] 3.10 Update `openspec config list` to display profile, delivery, and workflows settings (indicate defaults vs explicit)
- [x] 3.11 Add tests for config profile command and config list output

## 4. Available Tools Detection

- [x] 4.1 Create `src/core/available-tools.ts` (separate from existing `tool-detection.ts`)
- [x] 4.2 Implement `getAvailableTools(projectPath)` that scans for AI tool directories (`.claude/`, `.cursor/`, etc.)
- [x] 4.3 Use `AI_TOOLS` config to map directory names to tool IDs
- [x] 4.4 Add tests for available tools detection including cross-platform paths

## 5. Propose Workflow Template

- [x] 5.1 Create `src/core/templates/workflows/propose.ts`
- [x] 5.2 Implement skill template that combines new + ff behavior
- [x] 5.3 Ensure propose creates `.openspec.yaml` via `openspec new change` before generating artifacts
- [x] 5.4 Add onboarding-style explanatory output to template
- [x] 5.5 Implement command template for propose
- [x] 5.6 Export templates from `src/core/templates/skill-templates.ts`
- [x] 5.7 Add `openspec-propose` to `SKILL_NAMES` in `src/core/shared/tool-detection.ts`
- [x] 5.8 Add `propose` to command templates in `src/core/shared/skill-generation.ts`
- [x] 5.9 Add `propose` to `COMMAND_IDS` in `src/core/shared/tool-detection.ts`
- [x] 5.10 Add tests for propose template (creates change, generates artifacts, equivalent to new + ff)

## 6. Conditional Skill/Command Generation

- [x] 6.1 Update `getSkillTemplates()` to accept profile filter parameter
- [x] 6.2 Update `getCommandTemplates()` to accept profile filter parameter
- [x] 6.3 Update `generateSkillsAndCommands()` in init.ts to respect delivery setting
- [x] 6.4 Add logic to skip skill generation when delivery is 'commands'
- [x] 6.5 Add logic to skip command generation when delivery is 'skills'
- [x] 6.6 Add tests for conditional generation

## 7. Init Flow Updates

- [x] 7.1 Update init to call `getAvailableTools()` first
- [x] 7.2 Update init to read global config for profile/delivery defaults
- [x] 7.3 Add migration check to init: call shared `migrateIfNeeded()` before profile resolution
- [x] 7.4 Change tool selection to show pre-selected detected tools
- [x] 7.5 Add profile confirmation for non-default profiles: display what will be installed and prompt to proceed or reconfigure
- [x] 7.6 Update success message to show `/opsx:propose` prompt (only if propose is in the active profile)
- [x] 7.7 Add `--profile` flag to override global config
- [x] 7.8 Update non-interactive mode to use defaults without prompting
- [x] 7.9 Add tests for init flow with various scenarios (including migration on re-init, custom profile confirmation)

## 8. Update Command (Profile Support + Migration)

- [x] 8.1 Modify existing `src/commands/update.ts` to read global config for profile/delivery/workflows
- [x] 8.2 Implement shared `scanInstalledWorkflows(projectPath, tools)` — scan tool directories, match only against `ALL_WORKFLOWS` constant, return union across tools
- [x] 8.3 Implement shared `migrateIfNeeded(projectPath, tools)` — one-time migration logic used by both `init` and `update`
- [x] 8.4 Display migration message: "Migrated: custom profile with N workflows" + "New in this version: /opsx:propose. Try 'openspec config profile core' for the streamlined experience."
- [x] 8.5 Add project check: exit with error if no `openspec/` directory exists
- [x] 8.6 Add logic to detect which workflows are in config but not installed (to add)
- [x] 8.7 Add logic to detect which workflows are installed and need refresh (to update)
- [x] 8.8 Respect delivery setting: generate only skills if `skills`, only commands if `commands`
- [x] 8.9 Delete files when delivery changes: remove commands if `skills`, remove skills if `commands`
- [x] 8.10 Generate new workflow files for missing workflows in profile
- [x] 8.11 Display summary: "Added: X, Y" / "Updated: Z" / "Removed: N files" / "Already up to date."
- [x] 8.12 List affected tools in output: "Tools: Claude Code, Cursor"
- [x] 8.13 Detect new tool directories not currently configured and display hint to re-init
- [x] 8.14 Add tests for migration scenarios (existing user, partial workflows, multiple tools, idempotent, custom skills ignored)
- [x] 8.15 Add tests for update command with profile scenarios (including delivery changes, outside-project error, new tool detection)

## 9. Tool Selection UX Fix

- [x] 9.1 Update `src/prompts/searchable-multi-select.ts` keybindings
- [x] 9.2 Change Space to toggle selection
- [x] 9.3 Change Enter to confirm selection
- [x] 9.4 Remove Tab-to-confirm behavior
- [x] 9.5 Add hint text "Space to toggle, Enter to confirm"
- [x] 9.6 Add tests for keybinding behavior

## 10. Scaffolding Verification

- [x] 10.1 Verify `openspec new change` creates `.openspec.yaml` with schema and created fields

<!-- Note: 10.2 and 10.3 below are potential follow-up work, not core to this change -->
<!-- - [ ] 10.2 Update ff skill to verify `.openspec.yaml` exists after `openspec new change` -->
<!-- - [ ] 10.3 Add guardrail to skills: "Never manually create files in openspec/changes/ - use openspec new change" -->

## 11. Template Next-Step Guidance

- [x] 11.1 Audit all templates for hardcoded cross-workflow command references (e.g., `/opsx:propose`)
- [x] 11.2 Replace any specific command references with generic concept-based guidance (e.g., "create a change proposal")
- [x] 11.3 Review explore → propose transition UX (see `openspec/explorations/explore-workflow-ux.md` for open questions)

## 12. Integration & Manual Testing

- [x] 12.1 Run full test suite and fix any failures
- [x] 12.2 Test on Windows (or verify CI passes on Windows)
- [x] 12.3 Test end-to-end flow: init → propose → apply → archive
- [x] 12.4 Update CLI help text for new commands
- [x] 12.5 Manual: interactive init — verify detected tools are pre-selected, confirm prompt works, success message is correct
- [x] 12.6 Manual: `openspec config profile` picker — verify delivery toggle, workflow toggles, pre-selection of current values, core preset shortcut
- [x] 12.7 Manual: init with custom profile — verify confirmation prompt shows what will be installed
- [x] 12.8 Manual: delivery change via update — verify correct files are deleted/created when switching between skills/commands/both
- [x] 12.9 Manual: migration flow — run update on a pre-existing project with no profile in config, verify migration message and resulting config

## 13. Post-Implementation Hardening (Review Follow-up)

- [x] 13.1 Ensure `update` treats profile/delivery drift as update-required even when templates are current
- [x] 13.2 Ensure `update` recognizes command-only installations as configured tools
- [x] 13.3 Ensure `init` validates `--profile` values and errors on invalid overrides
- [x] 13.4 Ensure re-running `init` applies delivery cleanup (removes files not matching current delivery mode)
- [x] 13.5 Add/adjust regression tests for config drift sync, command-only detection, invalid profile override, and re-init delivery cleanup
