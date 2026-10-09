---
"@fission-ai/openspec": patch
---

Shell Tab completion is faster. `openspec __complete`, which the completion scripts run on every Tab press, now loads 48 modules instead of 344 when completing changes or specs, and no longer records usage, so a press never waits on the telemetry request and can't use up the first-run telemetry notice where nobody sees it. Completion output is unchanged.
