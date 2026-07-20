---
"@fission-ai/openspec": patch
---

### Bug Fixes

- **Archive no longer races the spec sync** — the generated `openspec-archive-change` skill (and the matching `opsx:archive` command) handed the spec sync to a subagent and then moved the change folder immediately. Subagents run in the background by default, so the archive could move the delta specs out from under the running sync: the change ended up archived, `openspec/specs/` was never updated, and the summary still reported `Specs: ✓ Synced`. The sync now runs inline, and the archive only proceeds once every touched capability has been re-checked against its delta — ADDED and MODIFIED requirements present, REMOVED gone, RENAMED under the new name. If the sync fails or a capability does not match, the archive stops instead of reporting success.
