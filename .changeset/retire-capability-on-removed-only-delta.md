---
"@fission-ai/openspec": patch
---

Retire a capability when a change removes its last requirement: `openspec archive` now deletes that capability's main spec instead of aborting with "Spec must have at least one requirement". This is the first case where archiving deletes a file under `openspec/specs/`; it happens only when the emptied spec could not have been written at all, and every retirement is named in the archive output.
