---
"@fission-ai/openspec": minor
---

### Bug Fixes

- **Codex global path support** — Codex adapter now resolves global paths correctly, fixing workflow file generation when run outside the project directory (#622)
- **Archive operations on cross-device or restricted paths** — Archive now falls back to copy+remove when rename fails with EPERM or EXDEV errors, fixing failures on networked/external drives (#605)
- **Slash command hints in workflow messages** — Workflow completion messages now display helpful slash command hints for next steps (#603)
- **Windsurf workflow file path** — Updated Windsurf adapter to use the correct `workflows` directory instead of the legacy `commands` path (#610)
