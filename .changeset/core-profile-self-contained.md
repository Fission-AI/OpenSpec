---
"@fission-ai/openspec": patch
---

Keep core-profile skills self-contained by avoiding dead `new` and `continue` skill invocations and using the existing CLI fallback when those optional workflows are not installed.
