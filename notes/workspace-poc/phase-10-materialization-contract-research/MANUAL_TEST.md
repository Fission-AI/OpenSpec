# Phase 10 Manual Test

Manual smoke re-run in a fresh local context on 2026-04-17 (Australia/Sydney) for ROADMAP Phase 10, cycle 1.

## Scenarios run

- Built the current CLI with `pnpm run build`.
- Created a fresh temp root and copied:
  - `test/fixtures/workspace-poc/happy-path/workspace` to `<tmp>/workspace`
  - `test/fixtures/workspace-poc/happy-path/repos` to `<tmp>/repos`
- Ran the real CLI from the copied workspace with telemetry disabled:

```bash
cd <tmp>/workspace
OPEN_SPEC_TELEMETRY_DISABLED=1 node /Users/tabishbidiwale/fission/repos/openspec/dist/cli/index.js new change shared-refresh --targets app,api
OPEN_SPEC_TELEMETRY_DISABLED=1 node /Users/tabishbidiwale/fission/repos/openspec/dist/cli/index.js workspace open --change shared-refresh --agent claude
test ! -e <tmp>/repos/app/openspec/changes/shared-refresh
test ! -e <tmp>/repos/api/openspec/changes/shared-refresh
test ! -e <tmp>/repos/docs/openspec/changes/shared-refresh
```

- Inspected the `workspace open` output to confirm:
  - only targeted repos were attached
  - the instruction surface still said `Do not materialize repo-local changes from this session.`
  - the instruction surface still said `openspec apply --change shared-refresh --repo <alias>`
- Checked that the reported `.claude/commands/opsx/workspace-open.md` path was not actually written during the command.

## Results

- `pnpm run build` passed.
- `new change shared-refresh --targets app,api` succeeded and created the workspace change.
- `workspace open --change shared-refresh --agent claude` succeeded and attached exactly `app` and `api`.
- No repo-local change was materialized in `app`, `api`, or `docs`.
- The instruction surface remained advisory only; the reported `.claude/commands/opsx/workspace-open.md` path was not written to disk.
- The current product boundary still matches `DECISION.md`: planning and session prep happen in the workspace, while repo-local execution remains an explicit later step.

## Fixes applied

- No product or test code fixes were required from this manual pass.
- Rewrote this manual-test note to reflect the fresh smoke run and the required stage structure.

## Residual risks

- None found within the scope of Phase 10.
- Phase 11 still needs to implement the create-only materialization contract defined in `DECISION.md`; that is a forward implementation dependency, not a Phase 10 manual-test gap.
