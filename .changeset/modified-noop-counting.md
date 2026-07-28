---
"@fission-ai/openspec": patch
---

Archive treats a MODIFIED delta whose content already matches the main spec as a no-op: a fully early-synced change now reports "Specs already in sync" instead of rewriting the file and claiming modifications.
