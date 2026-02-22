# Design: Clean JSON Output for OpenSpec CLI

## Goals

Ensure that when the `--json` flag is provided to any OpenSpec CLI command, the `stdout` stream contains ONLY valid, parseable JSON.

-   **Suppress UI Spinners**: Spinners (`ora`) must not start when `json` output is requested.
-   **Silence Telemetry Notices**: The first-run notice must be suppressed during JSON output.
-   **Cross-Platform Silence**: Both `stdout` and `stderr` should be managed to avoid pollution, though primarily focusing on `stdout` for JSON parsing.

## Design Approach

### 1. Global JSON Detection

The CLI entry point (`src/cli/index.ts`) will detect the `--json` flag globally using the `commander` hook.

-   **Hook**: `program.hook('preAction', ...)`
-   **Logic**: Check if the `actionCommand` has the `json` option set.

### 2. Telemetry Silencing

Update the telemetry module to support a "silent" mode.

-   **Update**: `maybeShowTelemetryNotice()` will check for a global silent state or accept an argument.
-   **Implementation**: If silenced, `console.log()` for the notice will be skipped.

### 3. Command Logic Pattern

Every command using `ora` for UI feedback will adopt a standard conditional start pattern:

```typescript
const spinner = ora('Doing work...');
if (!options.json) {
  spinner.start();
}

try {
  // ... logic ...
} finally {
  if (!options.json) spinner.stop();
}
```

### 4. Target Files

| Component | File Path | Action |
| --- | --- | --- |
| CLI Entry | `src/cli/index.ts` | Pass `json` status to telemetry notice. |
| Telemetry | `src/telemetry/index.ts` | Add silence support to `maybeShowTelemetryNotice`. |
| Status Cmd | `src/commands/workflow/status.ts` | Conditional spinner. |
| Instructions Cmd | `src/commands/workflow/instructions.ts` | Conditional spinner for both `instructions` and `applyInstructions`. |
| Templates Cmd | `src/commands/workflow/templates.ts` | Conditional spinner. |
| New Change Cmd | `src/commands/workflow/new-change.ts` | Conditional spinner. |

## Risks / Trade-offs

-   **Error Visibility**: Errors should still go to `stderr`. If an error occurs during JSON generation, it might still produce a partial JSON or mixed output if not handled carefully. We will use `try/catch` and ensure `ora().fail()` is only called in non-JSON mode or use `console.error` for raw errors.
-   **Breaking Change**: None identified, as this only affects programmatic consumers (who want clean JSON anyway).
