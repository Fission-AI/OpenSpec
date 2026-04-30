**Phase 04**
Executed only Phase 04 and marked it complete in [ROADMAP.md](/Users/tabishbidiwale/fission/repos/openspec/ROADMAP.md:187).

Added the missing registry/doctor coverage at:
- [test/core/workspace/registry.test.ts](/Users/tabishbidiwale/fission/repos/openspec/test/core/workspace/registry.test.ts:1)
- [test/commands/workspace/registry.test.ts](/Users/tabishbidiwale/fission/repos/openspec/test/commands/workspace/registry.test.ts:1)
- [test/cli-e2e/workspace/workspace-registry-cli.test.ts](/Users/tabishbidiwale/fission/repos/openspec/test/cli-e2e/workspace/workspace-registry-cli.test.ts:1)

The new tests exposed a real command bug, so I fixed [src/commands/workspace.ts](/Users/tabishbidiwale/fission/repos/openspec/src/commands/workspace.ts:30) to use explicit plural forms in doctor output and to set `process.exitCode = 1` for doctor issue cases instead of calling `process.exit(1)` inside the action body.

**Verification**
Ran:
- `pnpm vitest run test/core/workspace test/commands/workspace test/cli-e2e/workspace`
- `pnpm run build`
- `pnpm vitest run test/core/workspace/registry.test.ts test/commands/workspace/registry.test.ts test/cli-e2e/workspace/workspace-registry-cli.test.ts`

Results:
- Full workspace slice passed: `23/23`
- Phase 04 slice passed: `8/8`
- Built-CLI smoke passed: create workspace, add two repos, healthy doctor, force stale `local.yaml`, repair path, doctor returns to success

Phase notes are written at:
- [SUMMARY.md](/Users/tabishbidiwale/fission/repos/openspec/notes/workspace-poc/phase-04-test-repo-registry/SUMMARY.md:1)
- [VERIFY.md](/Users/tabishbidiwale/fission/repos/openspec/notes/workspace-poc/phase-04-test-repo-registry/VERIFY.md:1)
- [MANUAL_TEST.md](/Users/tabishbidiwale/fission/repos/openspec/notes/workspace-poc/phase-04-test-repo-registry/MANUAL_TEST.md:1)

No new follow-up phases were needed.