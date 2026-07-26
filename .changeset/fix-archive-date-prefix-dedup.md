---
"@fission-ai/openspec": patch
---

### Bug Fixes

- **`archive` no longer stacks a second date prefix** — archiving a change whose name already starts with a `YYYY-MM-DD-` prefix (a common authoring convention) keeps the name as-is instead of prepending today's date. Previously `openspec archive 2026-07-04-voice-copilot-v1 --yes` produced `2026-07-06-2026-07-04-voice-copilot-v1`, and when run on a later day the folder sorted under a day on which the change did not happen. Names without a full date prefix (including partial dates like `2026-07-feature`) are dated as before, and the naming is now idempotent.
