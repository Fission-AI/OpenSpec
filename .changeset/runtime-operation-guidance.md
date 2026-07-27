---
"@fission-ai/openspec": minor
---

Add current project context and per-operation guidance to apply and archive workflows. Projects can configure `operations.apply.guidance` and `operations.archive.guidance`; `openspec instructions apply` returns apply inputs, and the new read-only `openspec instructions archive` surface returns archive inputs for the selected root.

Archive, bulk archive, and sync skills now load current archive inputs and `specs` artifact rules at execution time, fail before writes or moves when required instruction lookups fail, and reuse specs-rule snapshots during inline sync.
