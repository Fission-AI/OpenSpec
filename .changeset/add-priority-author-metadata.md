---
"@fission-ai/openspec": minor
---

### New Features

- **Change priority and author metadata** — `.openspec.yaml` now supports optional `priority` (`low`/`medium`/`high`) and `author` fields. `openspec new change` auto-populates `author` from `git config user.name` (or a new `--author <name>` flag), and `openspec list` shows both as extra columns (and `--json` fields) whenever a change sets them.
