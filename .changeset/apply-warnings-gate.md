---
"@fission-ai/openspec": patch
---

### Bug Fixes

- The apply workflow now reads the `warnings` that `openspec instructions apply` returns. Before, it checked only `state`, so an agent implemented a change the CLI had already flagged, for example one with no delta specs that `openspec validate` rejects. It now shows every warning and asks before implementing, asks again when a new warning appears mid-loop, and lists any warning still outstanding when it reports completion. Run `openspec update` to refresh installed skills.
