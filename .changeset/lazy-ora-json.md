---
"@fission-ai/openspec": patch
---

Commands run with `--json` start a little faster. `status`, `instructions`, `new change`, `templates`, `validate` and `schema` no longer load the `ora` spinner package when they are run with `--json`, which never shows a spinner. `openspec status --json` now loads 163 modules instead of 186. Output is unchanged.
