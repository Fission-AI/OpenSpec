---
"@fission-ai/openspec": patch
---

Agent-driven archive and sync workflows now create a missing main spec from `ADDED` requirements instead of treating it as already synced. They stop rather than inventing `MODIFIED` or `RENAMED` requirements or writing an empty spec for a `REMOVED`-only delta. Fixes #1222 and #1264.
