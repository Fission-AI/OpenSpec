---
"@fission-ai/openspec": patch
---

Suppress the first-run telemetry disclosure notice when `--json` is used. On a
first-ever run the notice was written to stdout and could break `--json`
consumers; it is now deferred to the first later non-JSON run, keeping `--json`
output valid while still guaranteeing the disclosure.
