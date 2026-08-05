---
"@fission-ai/openspec": patch
---

Honor `telemetry.enabled` in global config. `false` disables anonymous telemetry and `openspec update` version checks; unset keeps telemetry enabled, and env/CI opt-outs still take precedence.
