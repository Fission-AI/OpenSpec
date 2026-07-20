---
"@fission-ai/openspec": patch
---

### Bug Fixes

- **Archive after early sync (RENAMED)** — `openspec archive` no longer fails with `RENAMED failed … source not found` when a change's renames were already synced to the main specs before archiving (the early-sync pattern from the `sync` workflow). If a RENAMED requirement's source header is gone but the target header exists in the spec, applying the rename is treated as a no-op; a rename whose source and target are both missing still aborts the archive as a genuine error, and reported counts reflect only renames actually applied.
