Phase 06 is complete. I added workspace-aware change-path resolution so workflow status can read workspace-created changes from top-level `changes/`, then added the full test stack for targeted change creation: core, command, and CLI e2e.

Updated:
- [ROADMAP.md](/Users/tabishbidiwale/fission/repos/openspec/ROADMAP.md:248)
- [SUMMARY.md](/Users/tabishbidiwale/fission/repos/openspec/notes/workspace-poc/phase-06-test-targeted-change-create/SUMMARY.md:1)
- [VERIFY.md](/Users/tabishbidiwale/fission/repos/openspec/notes/workspace-poc/phase-06-test-targeted-change-create/VERIFY.md:1)
- [MANUAL_TEST.md](/Users/tabishbidiwale/fission/repos/openspec/notes/workspace-poc/phase-06-test-targeted-change-create/MANUAL_TEST.md:1)

Verification passed:
- `pnpm run build`
- `pnpm vitest --run test/core/workspace/change-create.test.ts test/commands/workflow/new-change.workspace.test.ts test/cli-e2e/workspace/workspace-targeted-change-create-cli.test.ts`
- `pnpm vitest --run test/core/artifact-graph/instruction-loader.test.ts test/commands/artifact-workflow.test.ts test/cli-e2e/workspace/workspace-registry-cli.test.ts test/cli-e2e/workspace/workspace-targeted-change-create-cli.test.ts`
- `git diff --check` on the Phase 06 files
- fresh built-CLI manual smoke for successful targeted create, bad alias rejection, healthy `status`/`workspace doctor`, and untouched repo-local roots

Results:
- Phase slice: 9/9 passing
- Regression slice: 98/98 passing
- No new follow-up phases were required