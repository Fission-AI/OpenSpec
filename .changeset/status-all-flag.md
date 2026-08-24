---
"@fission-ai/openspec": minor
---

Add `openspec status --all`, which reports every active change in one process instead of one CLI spawn per change. `--all --json` emits a single `{ "changes": [ <status>, ... ], "root" }` envelope sorted by change name; a change that fails to load contributes `{ "changeName", "status": [diagnostic] }` in place rather than aborting the sweep. A partial failure exits 1 in both text and JSON modes while preserving the complete JSON envelope. Mutually exclusive with `--change`.
