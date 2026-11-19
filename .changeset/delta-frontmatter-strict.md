---
"@fission-ai/openspec": patch
---

`openspec validate --strict` no longer fails on a delta spec that starts with a frontmatter block. Archive still leaves that block in the archived change, and now says so by name.
