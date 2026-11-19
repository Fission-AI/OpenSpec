---
"@fission-ai/openspec": minor
---

New `openspec` skill: one place to start. Type `/openspec` (or `$openspec` in Codex) and ask for anything, such as "where does add-auth stand?", "how do I add a schema?", or "verify add-auth, then archive it". It answers, or hands the request to the skill that does the work. You no longer need to know which of the 12 workflow skills to call. It is part of the core profile, so `openspec update` adds it. On a custom profile, add it with `openspec config profile`.

Skills can now keep detail in `references/` files next to `SKILL.md`. The agent reads `SKILL.md` first and opens a reference only when the task needs it. This is the standard layout that agents already load this way. OpenSpec installs, updates, and removes reference files along with their skill. The router uses this format first, and future skills will use it to stay short while carrying more detail.
