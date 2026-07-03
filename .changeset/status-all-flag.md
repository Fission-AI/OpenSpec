---
"@fission-ai/openspec": minor
---

### New Features

- **`status --all`** — report every active change in one process. `openspec status --all --json` emits a single `{ changes: [ChangeStatus, ...], root }` envelope sorted by change name; a change that fails to load contributes a per-change error entry (`{ changeName, status: [diagnostic] }`) instead of failing the sweep (in text mode a failed change exits 1, like `validate --all`). Mutually exclusive with `--change`. Mirrors the existing `validate --all`.
