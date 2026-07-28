---
"@fission-ai/openspec": patch
---

The stale-CLI check tears down a redirected registry connection when its time budget expires instead of leaving the socket open.
