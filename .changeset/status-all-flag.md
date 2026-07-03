---
"@fission-ai/openspec": minor
---

### New Features

- **`status --all`** — report every active change in one process. `openspec status --all --json` emits a single `{ changes: [ChangeStatus, ...], root }` envelope sorted by change name; a change that fails to load contributes a per-change error entry (`{ changeName, status: [diagnostic] }`) instead of failing the sweep (in text mode a failed change exits 1, like `validate --all`). Mutually exclusive with `--change`. Modeled on the existing `validate --all`; note the JSON sweep exits 0 with per-change diagnostics, unlike validate's JSON mode.
