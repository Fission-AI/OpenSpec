---
"@fission-ai/openspec": minor
---

`openspec validate` now warns when a `Scenario:` has no WHEN/GIVEN step or no THEN step, in change deltas and main specs. It is a warning, so plain `validate` and `archive` are unchanged; `--strict` fails on it.
