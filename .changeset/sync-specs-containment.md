---
"@fission-ai/openspec": patch
---

### Bug Fixes

- The sync-specs workflow now checks that a main spec and each of its parent directories resolve inside the real `openspec/specs/` root before it reads, creates or updates the spec, not only before it deletes one. A symlinked capability directory or `spec.md` pointing outside the root now stops that capability's sync instead of writing through the link. Archive and bulk-archive carry the same rule for merges they do inline. Run `openspec update` to refresh installed skills.
