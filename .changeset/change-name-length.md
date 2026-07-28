---
"@fission-ai/openspec": patch
---

`openspec new change` rejects names over 200 characters with a validation message instead of surfacing a raw ENAMETOOLONG filesystem error.
