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

## 1. Update Command Enhancements

- [ ] 1.1 Add skill generation to update command for projects without skills
- [ ] 1.2 Detect if project has old system, new system, or mixed
- [ ] 1.3 Implement informative upgrade messaging (show what changed)
- [ ] 1.4 Display usage hints (skill names, shortcut commands)
- [ ] 1.5 Display cleanup hint when old artifacts exist
- [ ] 1.6 Preserve old files during update (no automatic removal)
- [ ] 1.7 Handle "already up to date" case gracefully
- [ ] 1.8 Verify non-interactive mode works in CI environments

## 2. Cleanup Command Implementation

- [ ] 2.1 Create `src/commands/cleanup.ts` with cleanup command handler
- [ ] 2.2 Register cleanup command in CLI
- [ ] 2.3 Implement detection of old artifacts to remove
- [ ] 2.4 Implement prerequisite check (require new skills to exist)
- [ ] 2.5 Implement interactive confirmation prompt (list files, ask to proceed)
- [ ] 2.6 Implement --yes flag to skip confirmation
- [ ] 2.7 Implement --dry-run flag to preview without changes
- [ ] 2.8 Implement actual file/directory removal with cross-platform paths
- [ ] 2.9 Add success/failure output messages
- [ ] 2.10 Handle partial artifact scenarios (some files missing)

## 3. Remove artifact-experimental-setup Command

- [ ] 3.1 Remove `artifact-experimental-setup` from CLI registration
- [ ] 3.2 Remove or archive related code in `artifact-workflow.ts`
- [ ] 3.3 Update any documentation referencing the command
- [ ] 3.4 Add deprecation note in changelog
- [ ] 3.5 Remove old template functions (deprecated in Part 1)

## 4. Testing

- [ ] 4.1 Add unit tests for cleanup command detection logic
- [ ] 4.2 Add unit tests for cleanup prerequisite check
- [ ] 4.3 Add integration tests for update on old system projects
- [ ] 4.4 Add integration tests for update on mixed projects
- [ ] 4.5 Add integration tests for cleanup flow
- [ ] 4.6 Test cleanup --dry-run behavior
- [ ] 4.7 Test cleanup --yes behavior
- [ ] 4.8 Verify Windows CI passes (cross-platform path handling)
- [ ] 4.9 Manual testing of full migration journey (update → use → cleanup)

## 5. Documentation

- [ ] 5.1 Add migration guide for existing users (old system → new skills)
- [ ] 5.2 Document cleanup command usage in README
- [ ] 5.3 Update CLI help text for new commands
- [ ] 5.4 Add deprecation notice for artifact-experimental-setup users
