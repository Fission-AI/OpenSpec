---
"@fission-ai/openspec": patch
---

The specs instruction now tells agents the 500-character requirement length that `openspec validate` flags as an informational hint, and how to stay under it when writing new requirements without splitting existing ones. The validator's too-long message now explains how to split a requirement too.
