---
"@fission-ai/openspec": patch
---

### Bug Fixes

- `openspec init` now suggests an IDE restart only when an IDE-resident tool such as Cursor, GitHub Copilot, Continue, or Cline was configured. CLI tools like Claude Code, Codex, and Gemini CLI no longer show the hint, since their commands work as soon as the files exist.
