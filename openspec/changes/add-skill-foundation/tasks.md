<rules>
- Add Windows CI verification as a task when changes involve file paths
- Include cross-platform testing considerations
</rules>

## 1. SkillDefinition Pattern

- [ ] 1.1 Create `SkillDefinition` interface in `src/core/templates/skill-definitions.ts`
- [ ] 1.2 Define `SKILLS` array with all 9 skill definitions (id, name, shortcut, description, instructions)
- [ ] 1.3 Migrate instruction content from existing template functions to SKILLS array
- [ ] 1.4 Create `generateSkillFile()` function that writes SKILL.md from definition
- [ ] 1.5 Create `generatePointerCommand()` function that writes minimal command referencing skill
- [ ] 1.6 Create `generateAllSkills()` function that iterates SKILLS and generates both files
- [ ] 1.7 Deprecate old 18 template functions in `skill-templates.ts` (mark with @deprecated)
- [ ] 1.8 Update `artifact-workflow.ts` to use new unified generator

## 2. Init Command Updates (Claude Code Only)

- [ ] 2.1 Update init to generate skills-only setup for new projects
- [ ] 2.2 Remove generation of CLAUDE.md stub file for new projects
- [ ] 2.3 Remove generation of AGENTS.md for new projects
- [ ] 2.4 Remove generation of .claude/agents/ for new projects
- [ ] 2.5 Remove generation of .claude/commands/openspec/ for new projects
- [ ] 2.6 Integrate skill generation into init flow (skills + pointer commands)
- [ ] 2.7 Ensure --yes flag works for non-interactive init
- [ ] 2.8 Verify cross-platform path handling (use path.join throughout)
- [ ] 2.9 Add detection of existing OpenSpec setup (old system vs new system)
- [ ] 2.10 Handle init on old system project (suggest `openspec update`)
- [ ] 2.11 Handle init on new system project (inform already configured)

## 3. Testing

- [ ] 3.1 Add unit tests for SkillDefinition interface and SKILLS array
- [ ] 3.2 Add unit tests for generateSkillFile() function
- [ ] 3.3 Add unit tests for generatePointerCommand() function
- [ ] 3.4 Add integration test for init on fresh project (verify no old artifacts)
- [ ] 3.5 Add integration test for init on old system project (verify suggests update)
- [ ] 3.6 Add integration test for init on new system project (verify already configured message)
- [ ] 3.7 Add test for --yes flag in CI/non-TTY environment (no hanging)
- [ ] 3.8 Verify Windows CI passes (cross-platform path handling)
- [ ] 3.9 Manual testing of init → verify skills work in Claude Code
