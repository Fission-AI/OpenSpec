# Tasks: Clean JSON Output

## Phase 1: Global State & Telemetry

- [x] 1.1 Update `src/telemetry/index.ts` to allow silencing the telemetry notice via a parameter or environment check.
- [x] 1.2 Update the `preAction` hook in `src/cli/index.ts` to detect the `--json` flag on the action command and trigger telemetry silence.

## Phase 2: Command UI Silence

- [x] 2.1 Update `src/commands/workflow/status.ts` to only start the `ora` spinner if `options.json` is false.
- [x] 2.2 Update `src/commands/workflow/instructions.ts` to only start the `ora` spinner in `instructionsCommand` and `applyInstructionsCommand` if `options.json` is false.
- [x] 2.3 Update `src/commands/workflow/templates.ts` to only start the `ora` spinner if `options.json` is false.
- [x] 2.4 Update `src/commands/workflow/new-change.ts` to only start the `ora` spinner if `options.json` is false (for metadata prep).

## Phase 3: Verification

- [x] 3.1 Verify `openspec status --json` produces clean JSON on Windows.
- [x] 3.2 Verify `openspec instructions apply --json` produces clean JSON on Windows.
- [x] 3.3 Verify first-run telemetry notice is suppressed when using `--json`.
- [x] 3.4 (Optional) Verify cross-platform silence if environment allows.
