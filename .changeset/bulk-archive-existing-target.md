---
'@fission-ai/openspec': patch
---

Fix bulk archive nesting a change inside an existing archive target. The workflow now checks whether the target directory exists before moving `changeRoot`, failing only that change and continuing with the rest, as its guardrail and failure output already described.
