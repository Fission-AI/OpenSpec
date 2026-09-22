---
'@fission-ai/openspec': patch
---

Say what a `MODIFIED` block adds when the scenario-loss guard fires ([#1809](https://github.com/Fission-AI/OpenSpec/pull/1809)). `openspec validate` and `openspec archive` already named the scenarios a block omits. They now also print how many scenarios each side has and which ones the block introduces, capped at three names, so a rename and a truncation read differently without opening either file. The guard catches exactly what it did before, and no exit code changes.
