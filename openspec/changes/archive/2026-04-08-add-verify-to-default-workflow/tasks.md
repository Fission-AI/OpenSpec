## 1. Add Verify to Core Profile

- [x] 1.1 In `src/core/profiles.ts`, add `'verify'` to `CORE_WORKFLOWS` between `'apply'` and `'archive'`

## 2. Rebrand Workflow Templates — CLI Binary

- [x] 2.1 In `src/core/templates/workflows/apply-change.ts`, replace all `openspec ` CLI calls with `enpalspec ` in both skill and command template strings
- [x] 2.2 In `src/core/templates/workflows/archive-change.ts`, replace all `openspec ` CLI calls with `enpalspec `
- [x] 2.3 In `src/core/templates/workflows/verify-change.ts`, replace all `openspec ` CLI calls with `enpalspec `
- [x] 2.4 In `src/core/templates/workflows/explore.ts`, replace all `openspec ` CLI calls with `enpalspec `
- [x] 2.5 In `src/core/templates/workflows/propose.ts`, replace all `openspec ` CLI calls with `enpalspec `
- [x] 2.6 In `src/core/templates/workflows/new-change.ts`, replace all `openspec ` CLI calls with `enpalspec `
- [x] 2.7 In `src/core/templates/workflows/continue-change.ts`, replace all `openspec ` CLI calls with `enpalspec `
- [x] 2.8 In `src/core/templates/workflows/ff-change.ts`, replace all `openspec ` CLI calls with `enpalspec `
- [x] 2.9 In `src/core/templates/workflows/sync-specs.ts`, replace all `openspec ` CLI calls with `enpalspec `
- [x] 2.10 In `src/core/templates/workflows/bulk-archive-change.ts`, replace all `openspec ` CLI calls with `enpalspec `
- [x] 2.11 In `src/core/templates/workflows/onboard.ts`, replace all `openspec ` CLI calls with `enpalspec `

## 3. Rebrand Workflow Templates — Display Names and Metadata

- [x] 3.1 In all 11 workflow template files, replace `name: 'OPSX: <Name>'` with `name: 'EnpalSpec: <Name>'` in each command template export
- [x] 3.2 In all 11 workflow template files, replace `author: 'openspec'` with `author: 'enpalspec'` in skill template metadata
- [x] 3.3 In all 11 workflow template files, replace `compatibility: 'Requires openspec CLI.'` with `compatibility: 'Requires enpalspec CLI.'`

## 4. Rebrand Workflow Templates — Prose

- [x] 4.1 In `src/core/templates/workflows/explore.ts`, replace "OpenSpec system" and "OpenSpec artifacts" prose references with "EnpalSpec", and update `## OpenSpec Awareness` section header to `## EnpalSpec Awareness`
- [x] 4.2 In `src/core/templates/workflows/verify-change.ts`, update any prose referring to "OpenSpec" to "EnpalSpec"
- [x] 4.3 In `src/core/templates/workflows/ff-change.ts`, update description referencing "OpenSpec artifact creation" to "EnpalSpec artifact creation"

## 5. Update Apply Completion Message

- [x] 5.1 In `src/core/templates/workflows/apply-change.ts`, update the completion message in the skill template from `"All tasks complete! Ready to archive this change."` to `"All tasks complete! Run /enpalspec:verify before archiving."`
- [x] 5.2 In the same file, update the `state: "all_done"` handler text in the command template to point to `/enpalspec:verify` instead of archive

## 6. Create Dev Environment Verify Command

- [x] 6.1 Create `.claude/commands/enpalspec/verify.md` with EnpalSpec-branded content matching what `enpalspec init` generates — using `EnpalSpec: Verify` as the display name and `enpalspec` CLI binary calls throughout (covered by `CORE_WORKFLOWS` change: `enpalspec init` now generates verify for all target projects; the verify command template is already rebranded in verify-change.ts)
