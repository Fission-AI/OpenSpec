---
"@fission-ai/openspec": patch
---

### Bug Fixes

- **Archive workflow templates no longer teach agents to stack a second date prefix** — the `openspec-archive-change` and `openspec-bulk-archive-change` skill/command templates (and the onboarding walkthrough's archived-path example) now mirror the `openspec archive` rule: a change whose name already starts with a `YYYY-MM-DD-` prefix is archived under its own name, while other names get the current date prepended as before. Previously an agent following the workflow instructions on a change named `2026-07-04-voice-copilot-v1` produced `archive/2026-07-07-2026-07-04-voice-copilot-v1`, whatever the CLI did.
