---
"@fission-ai/openspec": patch
---

### Fixes

- **Archive no longer races the spec sync** — the generated `openspec-archive-change` skill (and the matching `opsx:archive` command) dispatched the spec sync to a subagent and then moved the change folder immediately, without waiting. In harnesses where subagents run asynchronously, the archive could move the delta specs out from under the running sync, so the change ended up archived while `openspec/specs/` was never updated — and the summary still reported `Specs: ✓ Synced`. The instructions now require waiting for the sync to return, verifying the synced requirements landed in the main spec, and stopping without archiving if either check fails.
