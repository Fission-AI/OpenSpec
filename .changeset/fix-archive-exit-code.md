---
"@fission-ai/openspec": patch
---

### Bug Fixes

- **`archive` exits non-zero when blocked in human mode** — `openspec archive <change> -y` (and any non-`--json` invocation) no longer returns exit code 0 when validation fails and nothing is archived. The three blocking paths in human mode — delta-spec validation failure, spec rebuild failure, and rebuilt-spec validation failure — now set `process.exitCode = 1`, matching the existing `--json` behavior. Previously the command printed "Validation failed" (or "Aborted. No files were changed.") and exited 0, letting scripts and CI believe the archive succeeded. Aligns `archive` with the same exit-code guarantee already approved for `apply` instructions (#1250).
