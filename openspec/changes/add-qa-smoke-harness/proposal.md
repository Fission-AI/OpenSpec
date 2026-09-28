## Why

We need a faster, more reliable way to manually validate CLI behavior changes like profile/delivery sync, migration behavior, and tool-detection UX.

Today, manual review is mostly ad hoc: each developer sets up state differently, runs a different command order, and checks outputs informally. This makes regressions easy to miss and slows iteration on CLI UX work.

An 80/20 solution is to add a lightweight smoke harness for deterministic non-interactive flows, plus a short manual checklist for interactive prompt behavior.

## What Changes

- Add a lightweight QA smoke harness for OpenSpec CLI behavior with isolated per-run sandbox state
- Use `Makefile` targets as the primary entrypoint:
  - `make qa` (default local QA entrypoint)
  - `make qa-smoke` (deterministic non-interactive suite)
  - `make qa-interactive` (prints/opens manual interactive checklist)
- Implement smoke logic in a script (invoked by Make targets), not in Make itself
- Ensure each scenario runs in an isolated sandbox with temporary `HOME`, `XDG_CONFIG_HOME`, `XDG_DATA_HOME`, and `CODEX_HOME`
- Capture scenario artifacts for inspection (command output, exit code, and before/after filesystem state)
- Add a focused scenario set for high-risk behavior:
  - init core output generation
  - non-interactive detected-tool behavior
  - migration when profile is unset
  - delivery cleanup (`both -> skills`, `both -> commands`)
  - commands-only update detection
  - new tool directory detection messaging
  - invalid profile override validation
- Add a short interactive checklist for keypress/prompt UX verification (Space toggle, Enter confirm, detected pre-selection)
- Wire CI to run the smoke suite on Linux as a fast regression gate

## Capabilities

### New Capabilities

- `qa-smoke-harness`: Deterministic, sandboxed CLI smoke validation with a single developer entrypoint

### Modified Capabilities

- `developer-qa-workflow`: Standardized local/CI QA flow for CLI behavior and migration-sensitive scenarios

## Impact

- `Makefile` - Add `qa`, `qa-smoke`, and `qa-interactive` targets
- `scripts/qa-smoke.sh` (or equivalent) - Implement sandbox setup, scenario execution, and assertions
- `docs/` - Add/update contributor-facing QA instructions and interactive checklist usage
- CI workflow - Add smoke target execution as a lightweight regression gate
