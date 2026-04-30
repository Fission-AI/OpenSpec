# Phase 07 Manual Test

Manual test stage re-run in a fresh isolated XDG context on 2026-04-17 (Australia/Sydney) for ROADMAP Phase 07, cycle 1.

This phase is research-only, so the manual pass combined a real CLI smoke for the current workspace/change workflow boundary with a tabletop review of the proposed `workspace open` contract. `workspace open` is not implemented yet, so the command itself was validated only up to its current user-visible absence (`error: unknown command 'open'`).

## Scenarios run

- Created isolated `XDG_DATA_HOME` and `XDG_CONFIG_HOME` roots under `/tmp` with `OPENSPEC_TELEMETRY=0` so the smoke could exercise the built CLI without writing to the real home directory.
- Ran `node bin/openspec.js --no-color workspace create phase07-manual --json`.
- Created three disposable repo roots with repo-local `openspec/` directories and registered them sequentially:
  - `workspace add-repo app ../../../../repos/app --json`
  - `workspace add-repo api ../../../../repos/api --json`
  - `workspace add-repo docs ../../../../repos/docs --json`
- Ran `workspace doctor --json` to confirm the healthy registry state.
- Ran `node bin/openspec.js --no-color new change shared-auth --targets app,api` inside the managed workspace.
- Inspected `changes/shared-auth/.openspec.yaml` and the generated planning layout under `changes/shared-auth/targets/{app,api}`.
- Ran `node bin/openspec.js --no-color workspace open` and `node bin/openspec.js --no-color workspace open --change shared-auth` to confirm the current CLI surface still rejects `open` as unimplemented.
- Removed `repos/api/openspec`, reran `workspace doctor --json`, restored the directory, and reran `workspace doctor --json` to confirm the existing unresolved-repo diagnostics that Phase 07 relies on.

## Results

- `workspace create`, sequential `workspace add-repo`, `workspace doctor`, and `new change --targets` all worked in the fresh isolated context.
- The created change wrote explicit target metadata to `changes/shared-auth/.openspec.yaml`:
  - `schema: spec-driven`
  - `targets: app, api`
- The generated planning layout was change-scoped: `changes/shared-auth/targets/app/` and `changes/shared-auth/targets/api/` were created, and no `changes/shared-auth/targets/docs/` directory was created.
- `workspace doctor` reported `status: ok` before the failure injection and then reported a precise `missing-openspec-state` issue for alias `api` after the repo-local `openspec/` directory was removed.
- The current CLI still exposes no `workspace open` subcommand. Both `workspace open` and `workspace open --change shared-auth` failed with `error: unknown command 'open'`.
- Given that runtime boundary, the remaining validation for Phase 07 stayed at the artifact/tabletop level: [DECISION.md](/Users/tabishbidiwale/fission/repos/openspec/notes/workspace-poc/phase-07-open-contract-research/DECISION.md) still matches the current implementation surface and does not overclaim behavior that exists today.

## Fixes applied

- Rewrote this manual-test artifact from the prior authoring-time tabletop note into a fresh-context record with real CLI evidence.
- No product code or roadmap changes were required for Phase 07. The recommended contract in [DECISION.md](/Users/tabishbidiwale/fission/repos/openspec/notes/workspace-poc/phase-07-open-contract-research/DECISION.md) remained valid after the smoke and failure-injection pass.

## Residual risks

- `workspace open` still has no runtime implementation, so this manual pass can only prove the surrounding workflow boundary and the honesty of the proposed contract, not the eventual UX.
- Phase 08 still needs to implement the command exactly as documented, and Phase 09 still needs fixture-backed automated coverage for the success and failure cases listed in [DECISION.md](/Users/tabishbidiwale/fission/repos/openspec/notes/workspace-poc/phase-07-open-contract-research/DECISION.md).
