## 1. Global Config Extension

- [ ] 1.1 Extend `src/core/global-config.ts` schema with `profile`, `delivery`, and `workflows` fields
- [ ] 1.2 Add TypeScript types for profile (`core` | `extended` | `custom`), delivery (`both` | `skills` | `commands`), and workflows (string array)
- [ ] 1.3 Update `GlobalConfig` interface and defaults (profile=`core`, delivery=`both`)
- [ ] 1.4 Update existing `readGlobalConfig()` to handle missing new fields with defaults
- [ ] 1.5 Add tests for schema evolution (existing config without new fields)

## 2. Profile System

- [ ] 2.1 Create `src/core/profiles.ts` with profile definitions (core, extended, custom)
- [ ] 2.2 Define `CORE_WORKFLOWS` constant: `['propose', 'explore', 'apply', 'archive']`
- [ ] 2.3 Define `EXTENDED_WORKFLOWS` constant with all 11 workflows
- [ ] 2.4 Add `COMMAND_IDS` constant to `src/core/shared/tool-detection.ts` (parallel to existing SKILL_NAMES)
- [ ] 2.5 Implement `getProfileWorkflows(profile, customWorkflows?)` resolver function
- [ ] 2.6 Add tests for profile resolution

## 3. Profile CLI Command

- [ ] 3.1 Create `src/commands/profile.ts` with Commander.js subcommands
- [ ] 3.2 Implement `profile set <name>` subcommand
- [ ] 3.3 Implement `profile install <workflow>` subcommand (updates config AND immediately generates files)
- [ ] 3.4 Implement `profile uninstall <workflow>` subcommand (updates config AND immediately deletes files via SKILL_NAMES and COMMAND_IDS lookups)
- [ ] 3.5 Implement `profile list` subcommand
- [ ] 3.6 Implement `profile show` subcommand that reads filesystem
- [ ] 3.7 Register profile command in `src/cli/index.ts`
- [ ] 3.8 Add tests for profile commands

## 4. Config CLI Command Updates

- [ ] 4.1 Add `config set delivery <value>` subcommand to existing config command
- [ ] 4.2 Add `config get delivery` subcommand
- [ ] 4.3 Add `config list` subcommand showing all settings
- [ ] 4.4 Add validation for delivery values (both, skills, commands)
- [ ] 4.5 Add tests for config delivery commands

## 5. Available Tools Detection

- [ ] 5.1 Create `src/core/available-tools.ts` (separate from existing `tool-detection.ts`)
- [ ] 5.2 Implement `getAvailableTools(projectPath)` that scans for AI tool directories (`.claude/`, `.cursor/`, etc.)
- [ ] 5.3 Use `AI_TOOLS` config to map directory names to tool IDs
- [ ] 5.4 Add tests for available tools detection including cross-platform paths

## 6. Propose Workflow Template

- [ ] 6.1 Create `src/core/templates/workflows/propose.ts`
- [ ] 6.2 Implement skill template that combines new + ff behavior
- [ ] 6.3 Add onboarding-style explanatory output to template
- [ ] 6.4 Implement command template for propose
- [ ] 6.5 Export templates from `src/core/templates/skill-templates.ts`
- [ ] 6.6 Add `openspec-propose` to `SKILL_NAMES` in `src/core/shared/tool-detection.ts`
- [ ] 6.7 Add `propose` to command templates in `src/core/shared/skill-generation.ts`

## 7. Conditional Skill/Command Generation

- [ ] 7.1 Update `getSkillTemplates()` to accept profile filter parameter
- [ ] 7.2 Update `getCommandTemplates()` to accept profile filter parameter
- [ ] 7.3 Update `generateSkillsAndCommands()` in init.ts to respect delivery setting
- [ ] 7.4 Add logic to skip skill generation when delivery is 'commands'
- [ ] 7.5 Add logic to skip command generation when delivery is 'skills'
- [ ] 7.6 Add tests for conditional generation

## 8. Init Flow Updates

- [ ] 8.1 Update init to call `detectInstalledTools()` first
- [ ] 8.2 Update init to read global config for profile/delivery defaults
- [ ] 8.3 Change tool selection to show pre-selected detected tools
- [ ] 8.4 Update success message to show `/opsx:propose` prompt
- [ ] 8.5 Add `--profile` flag to override global config
- [ ] 8.6 Add `--apply-profile` flag to remove extra workflows
- [ ] 8.7 Update non-interactive mode to use defaults without prompting
- [ ] 8.8 Add tests for init flow with various scenarios

## 9. Tool Selection UX Fix

- [ ] 9.1 Update `src/prompts/searchable-multi-select.ts` keybindings
- [ ] 9.2 Change Space to toggle selection
- [ ] 9.3 Change Enter to confirm selection
- [ ] 9.4 Remove Tab-to-confirm behavior
- [ ] 9.5 Add hint text "Space to toggle, Enter to confirm"
- [ ] 9.6 Add tests for keybinding behavior

## 10. Integration & Documentation

- [ ] 10.1 Run full test suite and fix any failures
- [ ] 10.2 Test on Windows (or verify CI passes on Windows)
- [ ] 10.3 Test end-to-end flow: init → propose → apply → archive
- [ ] 10.4 Update CLI help text for new commands
