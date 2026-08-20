---
"@fission-ai/openspec": minor
---

Add `openspec status --all`, which reports every active change in one process instead of one CLI spawn per change. `--all --json` emits a single `{ "changes": [ <status>, ... ], "root" }` envelope sorted by change name; a change that fails to load contributes `{ "changeName", "status": [diagnostic] }` in place rather than aborting the sweep. In text mode a failed change exits 1, as `validate --all` does; in JSON mode the sweep exits 0 and carries the per-change diagnostics so the result stays parseable. Mutually exclusive with `--change`.
