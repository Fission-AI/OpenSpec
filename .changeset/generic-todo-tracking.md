---
"@fission-ai/openspec": patch
---

### Bug Fixes

- **Propose and fast-forward skills no longer name the Claude-only TodoWrite tool** — the generated `openspec-propose` and `openspec-ff-change` skills (and their `/opsx:propose` / `/opsx:ff` commands) told every agent to "Use the **TodoWrite tool**", which only exists in Claude Code. Codex, Cursor, Gemini, Copilot, and the other supported tools have no such tool, so agents either errored or stalled looking for it. The instruction is now runtime-neutral ("Use a todo list to track progress"), which works everywhere — including Claude Code.
