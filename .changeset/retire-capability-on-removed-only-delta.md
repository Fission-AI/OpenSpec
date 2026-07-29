---
"@fission-ai/openspec": patch
---

Retire a capability when a change removes its last requirement: `openspec archive` now moves that capability's main spec into the archived change instead of aborting with "Spec must have at least one requirement". The spec lands at `openspec/changes/archive/<archived-name>/retired-specs/<capability>/spec.md`, beside the proposal and tasks that retired it — nothing is deleted, `git` records a rename, and restoring a capability retired by mistake is a `git mv` back. Retirement happens only when the emptied spec could not have been written at all, and every one is named in the archive output.
