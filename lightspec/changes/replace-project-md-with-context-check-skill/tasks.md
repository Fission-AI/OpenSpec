## 1. Remove project.md template
- [x] 1.1 Remove project.md template definition from `src/core/templates/index.ts`
- [x] 1.2 Delete the `projectTemplate` constant and remove it from the templates array
- [x] 1.3 Verify no other code references the project.md template

## 2. Update agents template to remove project.md references
- [x] 2.1 Edit `src/core/templates/agents-template.ts` to remove all references to `lightspec/project.md`
- [x] 2.2 Update "Before Any Task" context checklist to remove `Read lightspec/project.md for conventions` line
- [x] 2.3 Update workflow step 1 to remove `Review lightspec/project.md` instruction
- [x] 2.4 Update "Missing Context" error recovery section to remove `Read project.md first` instruction

## 3. Update slash command templates to remove project.md references
- [x] 3.1 Edit `src/core/templates/slash-command-templates.ts`
- [x] 3.2 Remove `Review lightspec/project.md` from `proposalSteps` step 1
- [x] 3.3 Verify no other slash command templates reference project.md

## 4. Create context-check skill template
- [x] 4.1 Create new file `src/core/templates/context-check-template.ts`
- [x] 4.2 Define the skill body with instructions for validating agent file context
- [x] 4.3 Include logic to detect CLAUDE.md or AGENTS.md at project root
- [x] 4.4 Define validation criteria for required context properties (Purpose, Domain Context, Tech Stack, Conventions, etc.)
- [x] 4.5 Include offer to explore and populate missing context (with user confirmation)
- [x] 4.6 Export the template from `src/core/templates/index.ts`

## 5. Add context-check to all slash command configurators
- [x] 5.1 Update `SlashCommandId` type in `src/core/templates/slash-command-templates.ts` to include `'context-check'`
- [x] 5.2 Add file path mapping for context-check in all configurators
- [x] 5.3 Add frontmatter configuration for context-check skill
- [x] 5.4 Add context-check to `slashCommandBodies` map in slash-command-templates.ts
- [x] 5.5 Update base class ALL_COMMANDS array to include context-check

## 6. Update init success message
- [x] 6.1 Edit `src/core/init.ts` displaySuccessMessage method
- [x] 6.2 Replace "Populate your project context" step that references project.md
- [x] 6.3 Update to suggest running `/lightspec:context-check` instead

## 7. Update tests
- [x] 7.1 Update `test/core/init.test.ts` to remove project.md expectations
- [x] 7.2 Test coverage verified through existing tests (context-check skill generated automatically)
- [x] 7.3 Update template tests to verify project.md is not generated

## 8. Update documentation
- [x] 8.1 Update AGENTS.md to remove project.md references from directory structure diagram (via lightspec update)
- [x] 8.2 Add context-check skill to documentation (in skill templates)
- [x] 8.3 Update README to reference /lightspec:context-check instead of project.md

## 9. Validate changes
- [x] 9.1 Run `lightspec validate replace-project-md-with-context-check-skill --strict --no-interactive`
- [x] 9.2 Run full test suite (776 tests passed)
- [x] 9.3 Manually test init command to verify project.md is not created
- [x] 9.4 Manually test context-check skill generation for Codex
