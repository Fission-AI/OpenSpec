---
"@fission-ai/openspec": minor
---

Retire a capability when a change removes its last requirement. A change that declares `retire_capabilities: true` in its `.openspec.yaml` may now be archived even when its REMOVED entries take a capability's last requirement: `openspec archive` deletes that capability's main spec instead of aborting with "Spec must have at least one requirement". Without the marker nothing changes — the archive aborts exactly as before, except the message now names the marker as the way out. Retirement happens only when the emptied spec could not have been written at all, every one is named in the archive output alongside the `git checkout` that brings the file back, and `--no-validate` never retires.
