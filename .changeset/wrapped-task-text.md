---
"@fission-ai/openspec": patch
---

Read a task that wraps onto several lines in tasks.md as one task. `openspec instructions apply` used to cut a wrapped task off at its first line break; it now returns the full text, including lines continued with a trailing `\`.
