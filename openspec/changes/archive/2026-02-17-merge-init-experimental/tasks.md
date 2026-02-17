## 1. Legacy Detection & Cleanup Module

- [x] 1.1 Create `src/core/legacy-cleanup.ts` with detection functions for all legacy artifact types
- [x] 1.2 Implement `detectLegacyConfigFiles()` - check for config files with OpenSpec markers
- [x] 1.3 Implement `detectLegacySlashCommands()` - check for old `/openspec:*` command directories
- [x] 1.4 Implement `detectLegacyStructureFiles()` - check for AGENTS.md (project.md detected separately for messaging)
- [x] 1.5 Implement `removeMarkerBlock()` - surgically remove OpenSpec marker blocks from files
- [x] 1.6 Implement `cleanupLegacyArtifacts()` - orchestrate removal with proper edge case handling (preserves project.md)
- [x] 1.7 Implement migration hint output for project.md - show message directing users to migrate to config.yaml
- [x] 1.8 Add unit tests for legacy detection and cleanup functions

## 2. Rewrite Init Command

- [x] 2.1 Replace `src/core/init.ts` with new implementation using experimental's approach
- [x] 2.2 Import and use animated welcome screen from `src/ui/welcome-screen.ts`
- [x] 2.3 Import and use searchable multi-select from `src/prompts/searchable-multi-select.ts`
- [x] 2.4 Integrate legacy detection at start of init flow
- [x] 2.5 Add Y/N prompt for legacy cleanup confirmation
- [x] 2.6 Generate skills using existing `skill-templates.ts`
- [x] 2.7 Generate slash commands using existing `command-generation/` adapters
- [x] 2.8 Create `openspec/config.yaml` with default schema
- [x] 2.9 Update success output to match new workflow (skills, /opsx:* commands)
- [x] 2.10 Add `--force` flag to skip legacy cleanup prompt in non-interactive mode

## 3. Remove Legacy Code

- [x] 3.1 Delete `src/core/configurators/` directory (ToolRegistry, all config generators)
- [x] 3.2 Delete `src/core/templates/slash-command-templates.ts`
- [x] 3.3 Delete `src/core/templates/claude-template.ts`
- [x] 3.4 Delete `src/core/templates/cline-template.ts`
- [x] 3.5 Delete `src/core/templates/costrict-template.ts`
- [x] 3.6 Delete `src/core/templates/agents-template.ts`
- [x] 3.7 Delete `src/core/templates/agents-root-stub.ts`
- [x] 3.8 Delete `src/core/templates/project-template.ts`
- [x] 3.9 Delete `src/commands/experimental/` directory
- [x] 3.10 Update `src/core/templates/index.ts` to remove deleted exports
- [x] 3.11 Delete related test files for removed modules (wizard.ts)

## 4. Update CLI Registration

- [x] 4.1 Update `src/cli/index.ts` to remove `registerArtifactWorkflowCommands()` call
- [x] 4.2 Keep experimental subcommands (status, instructions, schemas, etc.) but register directly
- [x] 4.3 Remove "[Experimental]" labels from kept subcommands
- [x] 4.4 Add hidden `experimental` command as alias to `init`

## 5. Update Related Commands

- [x] 5.1 Update `openspec update` command to refresh skills/commands instead of config files
- [x] 5.2 Remove config file refresh logic from update
- [x] 5.3 Add skill refresh logic to update

## 6. Testing & Verification

- [x] 6.1 Add integration tests for new init flow (fresh install)
- [x] 6.2 Add integration tests for legacy detection and cleanup
- [x] 6.3 Add integration tests for extend mode (re-running init)
- [x] 6.4 Test non-interactive mode with `--tools` flag
- [x] 6.5 Test `--force` flag for CI environments
- [x] 6.6 Verify cross-platform path handling (use path.join throughout)
- [x] 6.7 Run full test suite and fix any broken tests

## 7. Documentation & Cleanup

- [x] 7.1 Update README with new init behavior (skill-based workflow is self-documenting)
- [x] 7.2 Document breaking changes for release notes (in tasks file)
- [x] 7.3 Remove any orphaned imports/references to deleted modules (verified none exist)
- [x] 7.4 Run linter and fix any issues (passed)
