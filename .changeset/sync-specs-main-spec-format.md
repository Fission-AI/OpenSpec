---
"@fission-ai/openspec": patch
---

Show the main spec format in the sync-specs skill so agents stop leaving delta operation headers (`## ADDED/MODIFIED Requirements`) in `openspec/specs/` — merged main specs with those headers parse as 0 requirements in `openspec view` (#1120).
