---
"@fission-ai/openspec": minor
---

- **DeepSeek Harness** — `openspec init --tools dsh` (command-line id `dsh`) installs the OpenSpec workflow skills into `.dsh/skills/` for DeepSeek Harness. It is skills-only (no slash commands): dsh discovers the generated `SKILL.md` files as its highest-priority project root and surfaces them through its skill catalog, `skill` tool, and `/openspec-*` user invocations.
