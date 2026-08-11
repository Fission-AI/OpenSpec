---
"@fission-ai/openspec": patch
---

Apply workflow now tells agents to surface unexpected scope instead of hiding it. When a task needs work beyond what the spec describes, the `/opsx:apply` skill and command guidance direct the agent to pause and report the added scope rather than silently narrowing, deferring, or simplifying away specified behavior, and to mark a task complete only when its specified behavior is fully implemented. Fixes #1529.
