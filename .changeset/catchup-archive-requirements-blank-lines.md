---
"@fission-ai/openspec": patch
---

Preserve the blank lines around a spec's `## Requirements` heading when syncing a delta. `openspec archive` rebuilt `openspec/specs/<capability>/spec.md` by joining its slices with a bare newline, so the blank lines that surround the heading were dropped and the resulting file failed Markdown whitespace checks. The rebuild now keeps that spacing intact. Fixes #1625. Thanks [@jwang513](https://github.com/jwang513)! ([#1637](https://github.com/Fission-AI/OpenSpec/pull/1637))
