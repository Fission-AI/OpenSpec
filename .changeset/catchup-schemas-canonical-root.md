---
"@fission-ai/openspec": patch
---

`openspec schemas` now resolves through the canonical OpenSpec root-selection precedence instead of always reading from the current directory. It accepts `--store <id>`, rejects `--store-path` like the other store-aware commands, and returns the shared machine-readable diagnostics on JSON failures, while preserving the existing human output and bare JSON array on success. Thanks [@Patodo](https://github.com/Patodo)! ([#1616](https://github.com/Fission-AI/OpenSpec/pull/1616))
