---
"@fission-ai/openspec": minor
---

Lifecycle actions (Apply checkpoints): the Apply skill and `/opsx:apply` now handle `change.apply.before` actions once before editing code, and `change.apply.completed` actions when Apply finishes implementing (when tracked tasks reach `all_done`, or when implementation finishes without pausing on schemas without task tracking). Actions arrive on Apply's existing `openspec instructions apply` read, so projects without lifecycle triggers see no extra CLI calls. Verify ignores them. Run `openspec update` to refresh installed skills.
