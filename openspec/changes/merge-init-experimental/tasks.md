## 1. Legacy Detection & Cleanup Module

- [ ] 1.1 Create `src/core/legacy-cleanup.ts` with detection functions for all legacy artifact types
- [ ] 1.2 Implement `detectLegacyConfigFiles()` - check for config files with OpenSpec markers
- [ ] 1.3 Implement `detectLegacySlashCommands()` - check for old `/openspec:*` command directories
- [ ] 1.4 Implement `detectLegacyStructureFiles()` - check for AGENTS.md (project.md detected separately for messaging)
- [ ] 1.5 Implement `removeMarkerBlock()` - surgically remove OpenSpec marker blocks from files
- [ ] 1.6 Implement `cleanupLegacyArtifacts()` - orchestrate removal with proper edge case handling (preserves project.md)
- [ ] 1.7 Implement migration hint output for project.md - show message directing users to migrate to config.yaml
- [ ] 1.8 Add unit tests for legacy detection and cleanup functions

## 2. Rewrite Init Command

- [ ] 2.1 Replace `src/core/init.ts` with new implementation using experimental's approach
- [ ] 2.2 Import and use animated welcome screen from `src/ui/welcome-screen.ts`
- [ ] 2.3 Import and use searchable multi-select from `src/prompts/searchable-multi-select.ts`
- [ ] 2.4 Integrate legacy detection at start of init flow
- [ ] 2.5 Add Y/N prompt for legacy cleanup confirmation
- [ ] 2.6 Generate skills using existing `skill-templates.ts`
- [ ] 2.7 Generate slash commands using existing `command-generation/` adapters
- [ ] 2.8 Create `openspec/config.yaml` with default schema
- [ ] 2.9 Update success output to match new workflow (skills, /opsx:* commands)
- [ ] 2.10 Add `--force` flag to skip legacy cleanup prompt in non-interactive mode

## 3. Remove Legacy Code

- [ ] 3.1 Delete `src/core/configurators/` directory (ToolRegistry, all config generators)
- [ ] 3.2 Delete `src/core/templates/slash-command-templates.ts`
- [ ] 3.3 Delete `src/core/templates/claude-template.ts`
- [ ] 3.4 Delete `src/core/templates/cline-template.ts`
- [ ] 3.5 Delete `src/core/templates/costrict-template.ts`
- [ ] 3.6 Delete `src/core/templates/agents-template.ts`
- [ ] 3.7 Delete `src/core/templates/agents-root-stub.ts`
- [ ] 3.8 Delete `src/core/templates/project-template.ts`
- [ ] 3.9 Delete `src/commands/experimental/` directory
- [ ] 3.10 Update `src/core/templates/index.ts` to remove deleted exports
- [ ] 3.11 Delete related test files for removed modules

## 4. Update CLI Registration

- [ ] 4.1 Update `src/cli/index.ts` to remove `registerArtifactWorkflowCommands()` call
- [ ] 4.2 Keep experimental subcommands (status, instructions, schemas, etc.) but register directly
- [ ] 4.3 Remove "[Experimental]" labels from kept subcommands
- [ ] 4.4 Add hidden `experimental` command as alias to `init`

## 5. Update Related Commands

- [ ] 5.1 Update `openspec update` command to refresh skills/commands instead of config files
- [ ] 5.2 Remove config file refresh logic from update
- [ ] 5.3 Add skill refresh logic to update

## 6. Testing & Verification

- [ ] 6.1 Add integration tests for new init flow (fresh install)
- [ ] 6.2 Add integration tests for legacy detection and cleanup
- [ ] 6.3 Add integration tests for extend mode (re-running init)
- [ ] 6.4 Test non-interactive mode with `--tools` flag
- [ ] 6.5 Test `--force` flag for CI environments
- [ ] 6.6 Verify cross-platform path handling (use path.join throughout)
- [ ] 6.7 Run full test suite and fix any broken tests

## 7. Documentation & Cleanup

- [ ] 7.1 Update README with new init behavior
- [ ] 7.2 Document breaking changes for release notes
- [ ] 7.3 Remove any orphaned imports/references to deleted modules
- [ ] 7.4 Run linter and fix any issues
