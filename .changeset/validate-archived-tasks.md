---
"@fission-ai/openspec": minor
---

Add `openspec validate --archived`: an opt-in check that every change under `changes/archive/` has all of its `tasks.md` checkboxes ticked, exiting non-zero if any are unchecked. This surfaces changes that were archived with unfinished work — which the normal validate flow never catches, because it only looks at active changes — and is meant for a pre-commit or CI hook (#205). It is a standalone scope: it does not alter any existing `validate` invocation and does not re-validate already-applied spec deltas.
