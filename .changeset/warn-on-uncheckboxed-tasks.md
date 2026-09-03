---
"@fission-ai/openspec": patch
---

### Bug Fixes

- **Task lists without checkboxes are now caught** — A `tasks.md` written as plain bullets or a numbered list counts as zero tasks, so `openspec list` and `openspec status` reported "No tasks" and `openspec archive` had no unfinished work to warn about. `openspec validate` now warns when a change's tracked task files contain list items but no checkbox at all, and points at the first offending line.
