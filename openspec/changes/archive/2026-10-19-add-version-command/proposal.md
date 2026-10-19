# Proposal

## Why

Editor extensions, GUIs, and scripts can read OpenSpec's bare version number, but they cannot ask how this copy was installed or whether an update is available. They must duplicate OpenSpec's install detection and update-check behavior, which produces inconsistent advice and makes integrations depend on human-oriented terminal output.

## What Changes

- Add `openspec version` as a read-only command that reports the installed version and install context without requiring an OpenSpec project.
- Add `openspec version --json` with a versioned, machine-readable response for integrations.
- Add an opt-in `--check` flag that queries the configured registry and reports whether an update is available, disabled, current, or temporarily unavailable.
- Reuse the existing privacy opt-outs, registry safeguards, package-manager detection, and update-command selection.
- Keep the existing `openspec --version` output and behavior unchanged for backward compatibility.
- Document the command in `docs-lab/reference/cli.md`; the legacy `docs/` tree is not updated.

## Capabilities

### New Capabilities

- `cli-version`: Report the installed OpenSpec version and install context, with an optional privacy-aware update check and stable JSON output.

### Modified Capabilities

None.

## Impact

- Public CLI: one additive `version` command with `--json` and `--check` options.
- Public machine interface: a new JSON document identified by `schemaVersion: 1`.
- Version-check core: separate update-check outcomes from the current nullable result so callers can distinguish disabled, current, and unavailable states.
- Tests: unit coverage for install classification and update outcomes, plus CLI end-to-end coverage for text/JSON output and backward compatibility.
- Documentation: `docs-lab/reference/cli.md` only, following the current docs-lab format.
- No new dependency, background network request, telemetry field, or automatic upgrade behavior.

Tracks [#1988](https://github.com/Fission-AI/OpenSpec/issues/1988); the issue remains open until implementation lands.
