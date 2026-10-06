---
"@fission-ai/openspec": patch
---

`openspec validate` and `openspec archive` now warn when a delta spec holds text archive does not carry into the main spec: a `## ` section other than Purpose and the four delta sections, text above the first `## ` header, or prose before the first requirement in ADDED or MODIFIED. That text was dropped without notice before. What archive carries is unchanged.
