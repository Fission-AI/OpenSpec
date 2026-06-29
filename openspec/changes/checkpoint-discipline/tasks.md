## 1. Update step 6 in getApplyChangeSkillTemplate()

- [ ] 1.1 Replace step 6 heading from "Implement tasks (loop until done or blocked)" to "Implement tasks (checkpoint after each)"
- [ ] 1.2 Add recovery rationale paragraph ("The tasks file is a recovery log...")
- [ ] 1.3 Replace flat bullet list with lettered sub-steps: a. Announce, b. Implement, c. Mark complete, d. Commit, e. Confirm
- [ ] 1.4 Add hard gate statement ("Steps c and d must happen before starting the next task")
- [ ] 1.5 Add tightly-coupled definition and maximum batch size (2–3 tasks)

## 2. Update guardrails in getApplyChangeSkillTemplate()

- [ ] 2.1 Replace "Update task checkbox immediately after completing each task" with checkpoint guardrail as first item, including anti-batching statement
- [ ] 2.2 Add MR bundling guardrail: per-task commits bundled into a single PR by default, with user confirmation
- [ ] 2.3 Reorder remaining guardrails (keep going, read context files, etc.) after the checkpoint guardrail

## 3. Apply matching changes to getOpsxApplyCommandTemplate()

- [ ] 3.1 Replace step 6 with identical checkpoint loop (matching task group 1)
- [ ] 3.2 Replace guardrails with identical updated guardrails (matching task group 2)

## 4. Verify

- [ ] 4.1 Run `pnpm run build` to confirm TypeScript compiles without errors
- [ ] 4.2 Run `pnpm test` to confirm no test regressions
