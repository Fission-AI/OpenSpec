<context>
Tech stack: TypeScript, Node.js (≥20.19.0), ESM modules
Package manager: pnpm
CLI framework: Commander.js

Cross-platform requirements:
- This tool runs on macOS, Linux, AND Windows
- Always use path.join() or path.resolve() for file paths - never hardcode slashes
- Never assume forward-slash path separators
- Tests must use path.join() for expected path values, not hardcoded strings
- Consider case sensitivity differences in file systems

</context>

<rules>
- Add Windows CI verification as a task when changes involve file paths
- Include cross-platform testing considerations
</rules>

## 1. Unified SkillDefinition Pattern

- [ ] 1.1 Create `SkillDefinition` interface in `src/core/templates/skill-definitions.ts`
- [ ] 1.2 Define `SKILLS` array with all 9 skill definitions (id, name, shortcut, description, instructions)
- [ ] 1.3 Migrate instruction content from existing template functions to SKILLS array
- [ ] 1.4 Create `generateSkillFile()` function that writes SKILL.md from definition
- [ ] 1.5 Create `generatePointerCommand()` function that writes minimal command referencing skill
- [ ] 1.6 Create `generateAllSkills()` function that iterates SKILLS and generates both files
- [ ] 1.7 Remove old 18 template functions from `skill-templates.ts` (or deprecate)
- [ ] 1.8 Update `artifact-workflow.ts` to use new unified generator

## 2. Smart Init Detection

- [ ] 2.1 Create `detectEditorConfigs()` function to scan for .claude/, .cursor/, .windsurf/, .cline/
- [ ] 2.2 Create `detectOpenSpecState()` function to detect: uninitialized, old system, new system, mixed
- [ ] 2.3 Update init wizard to display detection results before editor selection
- [ ] 2.4 Pre-select detected editors in the selection UI
- [ ] 2.5 Add detection summary output showing what was found
- [ ] 2.6 Test detection on projects with various configurations

## 3. Init Command Updates

- [ ] 3.1 Update init to generate skills-only setup (no old artifacts) for new projects
- [ ] 3.2 Remove generation of CLAUDE.md, AGENTS.md, .claude/agents/, .claude/commands/openspec/
- [ ] 3.3 Integrate skill generation into init flow (merge artifact-experimental-setup)
- [ ] 3.4 Handle already-initialized projects gracefully (detect and advise)
- [ ] 3.5 Ensure --yes flag works for non-interactive init with smart defaults
- [ ] 3.6 Test init on fresh projects, old system projects, and new system projects
- [ ] 3.7 Verify cross-platform path handling (use path.join throughout)

## 4. Update Command Enhancements

- [ ] 4.1 Add skill generation to update command for projects without skills
- [ ] 4.2 Implement informative upgrade messaging (show what changed, how to use, cleanup hint)
- [ ] 4.3 Preserve old files during update (no automatic removal)
- [ ] 4.4 Handle "already up to date" case gracefully
- [ ] 4.5 Test update on old system, new system, and mixed projects
- [ ] 4.6 Verify non-interactive mode works in CI environments

## 5. Cleanup Command Implementation

- [ ] 5.1 Create `src/commands/cleanup.ts` with cleanup command handler
- [ ] 5.2 Register cleanup command in CLI with --yes and --dry-run flags
- [ ] 5.3 Implement detection of old artifacts to remove
- [ ] 5.4 Implement prerequisite check (require new skills to exist)
- [ ] 5.5 Implement interactive confirmation prompt (list files, ask to proceed)
- [ ] 5.6 Implement --yes flag to skip confirmation
- [ ] 5.7 Implement --dry-run flag to preview without changes
- [ ] 5.8 Implement actual file/directory removal with cross-platform paths
- [ ] 5.9 Add success/failure output messages
- [ ] 5.10 Test cleanup on projects with various artifact combinations

## 6. Remove artifact-experimental-setup Command

- [ ] 6.1 Remove `artifact-experimental-setup` from CLI registration
- [ ] 6.2 Remove or archive related code in `artifact-workflow.ts`
- [ ] 6.3 Update any documentation referencing the command
- [ ] 6.4 Add deprecation note in changelog

## 7. Multi-Editor Support

- [ ] 7.1 Create editor adapter interface for unified generation
- [ ] 7.2 Implement Claude Code adapter (skills + opsx commands)
- [ ] 7.3 Implement Cursor adapter (rules format)
- [ ] 7.4 Implement Windsurf adapter (rules format)
- [ ] 7.5 Implement Cline adapter (rules format)
- [ ] 7.6 Update init to generate files for all selected editors
- [ ] 7.7 Test multi-editor generation

## 8. Testing and Verification

- [ ] 8.1 Add unit tests for SkillDefinition generation
- [ ] 8.2 Add unit tests for detection functions
- [ ] 8.3 Add unit tests for cleanup command
- [ ] 8.4 Add integration tests for init flow
- [ ] 8.5 Add integration tests for update flow
- [ ] 8.6 Verify Windows CI passes (cross-platform path handling)
- [ ] 8.7 Manual testing of full user journey (init → use → update → cleanup)

## 9. Documentation Updates

- [ ] 9.1 Update README with new skills-based workflow
- [ ] 9.2 Document cleanup command usage
- [ ] 9.3 Add migration guide for existing users
- [ ] 9.4 Update any references to artifact-experimental-setup
- [ ] 9.5 Document multi-editor support
