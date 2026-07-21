---
"@fission-ai/openspec": patch
---

### Bug Fixes

- **Custom schema instructions are no longer overridden by hard-coded spec-driven patterns** — the `openspec-continue-change` skill/command embedded one-line "common artifact patterns" for proposal.md, specs, design.md, and tasks.md, so agents followed those shortcuts instead of the schema's `instruction` field whenever a custom schema reused familiar artifact names. The templates now state that the `instruction` field is the authoritative guidance, and both `continue` and `ff` workflows explicitly direct the agent to invoke a skill when the instruction delegates artifact creation to one (fixes #777).
