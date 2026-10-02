---
"@fission-ai/openspec": patch
---

The verify workflow now finds a change's spec and design artifacts by their output path (`specs/` and `design.md`) instead of the hardcoded artifact ids `specs` and `design`, so it works with custom schemas whose artifacts use other ids.
