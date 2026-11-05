---
"@fission-ai/openspec": patch
---

`openspec version --check` now checks for a newer version even when telemetry is turned off or it runs in CI; only `OPENSPEC_NO_UPDATE_CHECK` skips it, and the background check in `openspec update` still honors the telemetry opt-out and CI.
