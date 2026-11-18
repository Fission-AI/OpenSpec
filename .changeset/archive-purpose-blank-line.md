---
"@fission-ai/openspec": patch
---

`openspec archive` now writes a blank line after `## Purpose` when it creates a new main spec, so the spec passes Prettier and markdownlint (MD022) without a reformat.
