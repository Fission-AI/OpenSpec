---
"@fission-ai/openspec": patch
---

Stop the `/opsx:update` and `/opsx:continue` change pickers from labelling every change `spec-driven`. Both templates read a `schema` field from `openspec list --json`, which that command does not emit, so the fallback fired unconditionally and mislabelled custom-schema changes. The schema line is now optional and, when shown, resolved from `openspec status --change "<name>" --json` (`schemaName`).
