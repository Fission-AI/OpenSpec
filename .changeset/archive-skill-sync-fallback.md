---
"@fission-ai/openspec": patch
---

The `openspec-archive-change` skill no longer tells the agent to run the `openspec-sync-specs` skill when that skill is not installed. It merges the delta specs into the main specs itself instead, as the `/opsx:archive` command already did (#1975).
