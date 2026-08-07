# Suppress the first-run telemetry notice in --json mode

## Why

`openspec <cmd> --json` is meant to emit exactly one machine-readable JSON
document on stdout so agents and automation can parse it. Spinner suppression
and structured JSON errors already ship on main, but one stdout writer remains:
the first-run telemetry disclosure notice.

On a user's first-ever command, `maybeShowTelemetryNotice()` runs from the
global `preAction` hook and `console.log`s the disclosure to **stdout** — before
the command's JSON payload. A `--json` consumer parsing that first run gets
invalid JSON. It is first-run-only (the notice sets `noticeSeen`), but that is
exactly the run an automation is most likely to hit on a fresh machine or CI
image.

## What Changes

- `maybeShowTelemetryNotice()` accepts a `silent` option. When silent, it prints
  nothing **and** leaves `noticeSeen` unset, so the disclosure is deferred rather
  than skipped.
- The `preAction` hook reads the executing command's `--json` flag
  (`actionCommand.opts().json`) and passes `silent: true` when it is set.

Net effect: `--json` runs never emit the notice on stdout; the user still sees
the disclosure on their first later non-JSON run. Telemetry remains opt-out and
otherwise unchanged.

## Impact

- Affected specs: `telemetry` (MODIFIED: First-run telemetry notice)
- Affected code: `src/telemetry/index.ts`, `src/cli/index.ts`
- No change to non-JSON behavior; no new events or data collected.
