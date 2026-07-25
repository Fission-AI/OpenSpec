---
'@fission-ai/openspec': patch
---

`--change` now accepts any change name that exists on disk (e.g. date-prefixed names like `2026-07-04-voice-copilot-v1`), matching what `list`, `validate`, and `archive` already resolve. Lookup still rejects unsafe names (path separators, `..`, hidden entries); the kebab-case naming rule still applies when creating a change.
