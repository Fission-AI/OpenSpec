---
"@fission-ai/openspec": patch
---

Retiring a capability no longer refuses when a wrapped requirement or scenario line starts with `<` and continues as text (such as `<args> are passed on`). Raw HTML, and a tag alone on its line, are still reported as content outside the requirement.
