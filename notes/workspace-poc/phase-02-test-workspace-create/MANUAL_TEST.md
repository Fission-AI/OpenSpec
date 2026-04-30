# Phase 02 Manual Test

Manual pass date: 2026-04-17
Phase cycle: 1
Stage: `manual-test`

## Scenarios Run

- Rebuilt the CLI with `pnpm run build` so the manual pass used the current source tree.
- In a fresh `mktemp` root with isolated `XDG_CONFIG_HOME` and `XDG_DATA_HOME`, and `OPEN_SPEC_TELEMETRY_DISABLED=1`, ran `node bin/openspec.js --no-color workspace --help`.
- Ran `node bin/openspec.js --no-color workspace create alpha-manual`.
- Inspected the created `alpha-manual` workspace root for `.openspec/workspace.yaml`, `.openspec/local.yaml`, `changes/`, `.gitignore`, and absence of any nested repo-local `openspec/` directory.
- Ran `node bin/openspec.js --no-color workspace create beta-json --json` and parsed stdout as JSON.
- Re-ran `node bin/openspec.js --no-color workspace create alpha-manual` and compared file hashes for `.gitignore`, `.openspec/workspace.yaml`, and `.openspec/local.yaml` before and after the duplicate attempt.

## Results

- `workspace --help` exposed `create [options] <name>` under the `workspace` command.
- `workspace create alpha-manual` exited `0`, produced no stderr output, and created a managed workspace root under the isolated XDG data directory.
- The created workspace contained `.openspec/workspace.yaml`, `.openspec/local.yaml`, `changes/`, and `.gitignore` with `/.openspec/local.yaml`.
- `workspace.yaml` contained `version: 1`, `name: alpha-manual`, and `repos: {}`.
- `local.yaml` contained `version: 1` and `repoPaths: {}`.
- The workspace root did not contain any nested repo-local `openspec/` directory.
- `workspace create beta-json --json` exited `0`, emitted parseable JSON on stdout only, and returned the expected absolute paths plus `gitignoreStatus: "created"`.
- Re-running `workspace create alpha-manual` exited `1`, emitted the expected blank line on stdout plus an actionable error on stderr, and left the existing workspace files unchanged.

## Fixes Applied

- None. No product or test changes were required from this manual pass.
- Refreshed this artifact so the manual-test record matches the fresh cycle-1 run.

## Residual Risks

- None found within the Phase 02 scope.
