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
- The `preAction` hook passes `silent: true` when the executing command asked
  for JSON, decided by `isJsonRun(command)`. `--json` reaches commands three
  ways, so a single parsed option (`opts().json`) is not enough: on the leaf
  (`status --json`), on a parent group read via `optsWithGlobals`
  (`workset --json list`), and as a residual arg on permissive groups that never
  declare the option (`openspec store --json`). `isJsonRun` checks
  `optsWithGlobals().json` and `command.args`, covering all three.

Net effect: any `--json` invocation never emits the notice on stdout; the user
still sees the disclosure on their first later non-JSON run. Suppressing is
always safe — worst case the disclosure defers one run. Telemetry remains opt-out
and otherwise unchanged.

Out of scope: a few commands write scriptable output to stdout without a `--json`
flag (`completion generate`, `config get`, `config path`, the hidden `__complete`).
Their first-run notice pollution is a separate, pre-existing issue not addressed
here.

## Impact

- Affected specs: `telemetry` (MODIFIED: First-run telemetry notice)
- Affected code: `src/telemetry/index.ts`, `src/cli/index.ts`
- No change to non-JSON behavior; no new events or data collected.
