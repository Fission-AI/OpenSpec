---
'@fission-ai/openspec': patch
---

`openspec view` now resolves the configured OpenSpec root instead of always reading the current directory, and accepts `--store <id>` like its sibling commands. Projects whose `openspec/config.yaml` points at an external store saw an empty dashboard — 0 specs, 0 requirements — while `openspec list` read the same store correctly.
