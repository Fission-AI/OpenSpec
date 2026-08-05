---
"@fission-ai/openspec": patch
---

Honor `telemetry.enabled` in global config so `openspec config set telemetry.enabled false` matches the documented opt-out (env/CI still override).
