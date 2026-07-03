---
"@fission-ai/openspec": minor
---

### Features

- **`status --all`** — report every active change in one process. `openspec status --all --json` emits a single `{ changes: [ChangeStatus, ...], root }` envelope sorted by change name; a change that fails to load contributes a per-change error entry (`{ changeName, status: [diagnostic] }`) instead of failing the sweep. Mutually exclusive with `--change`. Mirrors the existing `validate --all`.
