## 1. Local date behavior

- [x] 1.1 Add a shared formatter that returns the calendar date in the executing Node.js process's effective local time zone as `YYYY-MM-DD`.
- [x] 1.2 Use the shared formatter for native archive target names.
- [x] 1.3 Use the shared formatter when writing `created` metadata for a new change.

## 2. Regression coverage and validation

- [x] 2.1 Add archive and change-creation tests for a fixed `Asia/Shanghai` UTC-boundary instant, restoring clock and environment state afterward.
- [x] 2.2 Update affected archive test expectations to use the effective-local-date contract.
- [x] 2.3 Add archive and change-creation tests for a non-boundary instant where UTC and local calendar dates match.
- [x] 2.4 Run focused archive and change-creation tests on the supported cross-platform test suite.
- [x] 2.5 Run the full build and OpenSpec validation for the change.
