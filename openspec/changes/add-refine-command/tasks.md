## 1. Templates and command registry
- [x] 1.1 Add `refine` to the slash command IDs and shared bodies in `src/core/templates/slash-command-templates.ts`.
- [x] 1.2 Ensure the refine template enforces no code changes, runs strict validation, and blocks for explicit re-approval.

## 2. Init/update integration
- [x] 2.1 Update slash command configurators in `src/core/configurators/slash/` to include refine paths and any required frontmatter.
- [x] 2.2 Update init scaffolding so refine files are created alongside proposal/apply/archive for supported tools.
- [x] 2.3 Update update logic to refresh refine files only when they already exist.

## 3. Documentation
- [x] 3.1 Update `src/core/templates/agents-template.ts` to add refine workflow guidance and out-of-scope handling.
- [x] 3.2 Confirm generated agent instructions include refine guidance without changing the overall format.

## 4. Validation
- [x] 4.1 Run `openspec validate add-refine-command --strict`.
