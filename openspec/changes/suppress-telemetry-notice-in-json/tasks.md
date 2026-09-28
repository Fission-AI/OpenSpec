# Tasks

## 1. Suppress notice in JSON mode
- [x] 1.1 Add a `silent` option to `maybeShowTelemetryNotice()` that skips the notice and leaves `noticeSeen` unset
- [x] 1.2 Read `actionCommand.opts().json` in the `preAction` hook and pass `silent` accordingly

## 2. Tests
- [x] 2.1 Assert a first-run `--json` (silent) call prints nothing and does not mark the notice seen
- [x] 2.2 Assert the disclosure still appears on the first later non-silent run
