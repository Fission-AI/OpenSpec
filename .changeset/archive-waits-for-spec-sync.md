---
"@fission-ai/openspec": patch
---

### Bug Fixes

- **Archive no longer races the spec sync, or reports a sync that never landed** — the generated `openspec-archive-change` skill (and the matching `opsx:archive` command) handed the spec sync to a background task and then moved the change folder immediately. The archive could move the delta specs out from under the running sync: the change ended up archived, `openspec/specs/` was never updated, and the summary still reported `Specs: ✓ Synced`. The sync now runs inline, and the archive only proceeds once every capability with a delta spec has been checked against it — ADDED present, MODIFIED changes applied, REMOVED gone, RENAMED under the new name and not the old. If the sync fails or a capability doesn't match, the archive stops and reports what differs instead of claiming success; nothing has moved, so you can fix it and retry.
