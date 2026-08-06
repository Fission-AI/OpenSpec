---
"@fission-ai/openspec": patch
---

Apply workflow now tells agents to surface unexpected scope instead of hiding it. When a task turns out more complex than the spec assumed, the `/opsx:apply` skill and command guidance direct the agent to pause and report the added scope rather than silently narrowing, deferring, or simplifying the work, and to mark a task complete only when it is fully implemented as specified. Fixes #1529.
