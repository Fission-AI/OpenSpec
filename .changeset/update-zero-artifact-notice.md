---
"@fission-ai/openspec": patch
---

`openspec update` with `delivery: commands` prints the same configuration correction as init when it removes the skills of a tool that supports only skills, instead of deleting them silently.
