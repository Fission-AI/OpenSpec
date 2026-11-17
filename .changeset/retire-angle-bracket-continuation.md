---
"@fission-ai/openspec": patch
---

Retiring a capability no longer refuses when a wrapped requirement or scenario line starts with `<` (such as `<args>`). Only raw HTML that CommonMark lets open its own block is now reported as content outside the requirement.
