---
"@fission-ai/openspec": patch
---

### Bug Fixes

- **Archive after early sync** — `openspec archive` no longer fails with `ADDED failed … already exists` when a change's specs were already synced to the main specs before archiving (the early-sync pattern from the `sync` workflow). If an ADDED requirement already exists in the target spec with identical content, applying it is treated as a no-op; a same-named requirement with different content still aborts the archive as a genuine conflict (#1332).
