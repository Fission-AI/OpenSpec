## 1. Update the propose skill source

- [x] 1.1 In `src/core/templates/workflows/propose.ts`, update the **Input** description in `getOpsxProposeCommandTemplate()` to document the `--exploration <path>` parameter syntax
- [x] 1.2 Add a parsing step at the top of the Steps section in both `getOpsxProposeSkillTemplate()` and `getOpsxProposeCommandTemplate()`: before step 1, instruct the agent to check the argument string for `--exploration <path>` and extract the value if present
- [x] 1.3 Update step 3 (Exploration doc scan and gate) in both templates to branch on whether `--exploration` was provided: if yes, read that file directly and skip scan; if no, proceed with existing scan logic
- [x] 1.4 Add the "file not found" error case in both templates: if `--exploration` path cannot be read, report the error and exit without creating artifacts

## 2. Update specs

- [x] 2.1 Update `openspec/specs/propose-skill-workflow/spec.md` — modify the existing exploration scan requirement to reflect the `--exploration` bypass
- [x] 2.2 Archive the new `propose-exploration-param` spec into `openspec/specs/propose-exploration-param/spec.md`
