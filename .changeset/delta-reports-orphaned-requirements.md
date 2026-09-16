---
'@fission-ai/openspec': patch
---

Say so when a requirement in a delta sits outside every delta section. A well-formed `### Requirement:` block written under `## Notes`, under a misspelled header such as `## Add Requirements`, or above the first `## ` header was dropped with no diagnostic: `openspec validate` reported the change valid and `openspec archive` exited 0 without applying it. `openspec validate` now reports each one as a WARNING naming the section and line, and archive prints the same warning. Nothing else changes: the block is still not applied, the verdict stays valid outside `--strict`, and requirements shown inside a code fence are not reported. Fixes #1803.
